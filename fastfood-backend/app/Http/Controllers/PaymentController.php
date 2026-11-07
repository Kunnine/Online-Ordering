<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Services\Khqr\KhqrService;
use App\Services\Abapayway\AbapaywayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class PaymentController extends Controller
{
    /**
     * AbapaywayService instance.
     */
    protected $abapaywayService;

    /**
     * Constructor.
     */
    public function __construct(AbapaywayService $abapaywayService)
    {
        $this->abapaywayService = $abapaywayService;
    }
    /* ── helpers ───────────────────────────────────────────────────────────── */

    /**
     * Generate a QR image and return base64 + data-URI.
     *
     * Two code paths:
     *
     *   PNG path  — Imagick backend available → QrCode writes a binary PNG to disk,
     *               reads it back, base64-encodes it, returns data-uri/png.
     *
     *   SVG path  — Imagick missing → getFormatter() catches the constructor throw and
     *               falls back to SvgImageBackEnd.  generate() returns an HtmlString
     *               wrapping raw <svg> markup.  We base64-encode the raw markup (cast to
     *               string first so HtmlString un-escapes properly) and return
     *               data-uri/svg+xml instead.
     *
     * @return array{base64:string, dataUri:string, format:string, path:string|null}
     */
    private function makeQrImage(string $mark, int $orderId): array
    {
        $raw = QrCode::format('png')->size(340)->margin(2)->generate($mark);

        /* ── SVG fallback: HtmlString wrapping <svg> XML ─────────────────── */
        if ($raw instanceof \Illuminate\Support\HtmlString) {
            $svg = (string) $raw;               // HtmlString→raw <svg> string
            $b64 = base64_encode($svg);
            return [
                'base64'  => $b64,
                'dataUri' => 'data:image/svg+xml;base64,' . $b64,
                'format'  => 'svg',
                'path'    => null,
            ];
        }

        /* ── PNG path: raw binary PNG bytes from file_put_contents() ──────── */
        $dir  = storage_path("app/public/payments/{$orderId}");
        $path = "{$dir}/qr.png";
        @mkdir($dir, 0755, true);

        // QrCode::generate($mark) without filename returns raw PNG bytes;
        // write them ourselves (file_put_contents with binary data) then
        // re-encode for the data-URI.
        file_put_contents($path, $raw);

        $b64    = base64_encode($raw);
        $dataUri = 'data:image/png;base64,' . $b64;

        return [
            'base64'  => $b64,
            'dataUri' => $dataUri,
            'format'  => 'png',
            'path'    => $path,
        ];
    }

    public function getQrCode(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        $order = Order::with(['items.product', 'user', 'payment'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->order_id);

        $payment = $order->payment;

        /* ── if order already has a live PAYMENT row with a mark → use it ── */
        if ($payment && $payment->khqr_mark) {
            $qrImg  = $this->makeQrImage($payment->khqr_mark, $order->id);
            $mark   = $payment->khqr_mark;
            $billNo = $payment->khqr_bill_number ?? $payment->transaction_id;
            $expiry = $payment->khqr_expires_at;
            $bank   = $payment->bank_code ?? config('khqr.bakong.bank_code', '002');
        }
        /* ── no mark yet, build one on the fly (KhqrService::buildMark) ─────── */ else {
            $amountKhr  = (int) round((float) $order->total_amount * 4100);
            $bankCode   = config('khqr.bakong.bank_code', '002');
            $accountId  = config('khqr.bakong.merchant_account', '010161254');
            $merchant   = config('khqr.bakong.merchant_name', 'FastFood KH');
            $city       = config('khqr.bakong.merchant_city',   'Phnom Penh');
            $billNo     = 'FF-' . strtoupper(Str::random(8));
            $expiry     = now()->addHours(2);
            $currency   = 'KHR';

            $markData   = KhqrService::buildMark([
                'amountKhr'   => $amountKhr,
                'billNumber'  => $billNo,
                'merchant'    => $merchant,
                'city'        => $city,
                'bankCode'    => $bankCode,
                'accountId'   => $accountId,
                'currency'    => $currency,
                'expiryDate'  => $expiry->format('Ymd'),
            ]);
            $mark       = $markData['mark'];

            // persist so next call is instant
            if (! $payment) {
                $payment = Payment::create([
                    'order_id'       => $order->id,
                    'payment_method' => 'qr_payment',
                    'status'         => 'pending',
                    'amount'         => $order->total_amount,
                    'transaction_id' => $billNo,
                ]);
            }
            $payment->update([
                'khqr_mark'        => $mark,
                'khqr_bill_number' => $billNo,
                'khqr_expires_at'  => $expiry,
                'khqr_amount'      => $amountKhr,
                'khqr_currency'    => $currency,
                'bank_code'        => $bankCode,
            ]);
            $qrImg = $this->makeQrImage($mark, $order->id);
            $order->update([
                'order_status'   => 'waiting_verification',
                'payment_status' => 'pending',
            ]);
        }

        return response()->json([
            'success'        => true,
            'qr_code'        => $qrImg['dataUri'],           // spec alias
            'qr_code_url'    => $qrImg['dataUri'],
            'qrImage'        => $qrImg['dataUri'],
            'qrImagePath'    => $qrImg['path'],
            'qrImageUri'     => $qrImg['dataUri'],
            'khqr_mark'      => $mark,
            'khqr_bill_number' => $billNo,
            'expires_at'     => $expiry instanceof \Illuminate\Support\Carbon
                ? $expiry->toIso8601String()
                : $expiry?->toIso8601String(),
            'merchant_name'  => config('khqr.bakong.merchant_name', 'FastFood KH'),
            'merchant_id'    => config('khqr.bakong.merchant_account', ''),
            'order_id'       => $order->id,
            'amount'         => (float) $order->total_amount,
            'currency'       => 'KHR',
            'bank_code'      => $bank ?? config('khqr.bakong.bank_code', '002'),
            'bank_name'      => (function () use ($bank) {
                try {
                    $ref = new \ReflectionClass(KhqrService::class);
                    $banks = $ref->getConstant('BANKS') ?: [];
                } catch (\Exception $e) {
                    $banks = [];
                }
                return $banks[$bank ?? '002'] ?? 'ABA';
            })(),
            'paid_at'        => $payment?->paid_at,
            'order'          => $order->load('items.product'),
            'payment'        => $payment,
        ]);
    }

    // ── 2. CONFIRM QR PAYMENT (admin / callback endpoint) ───────────────────

    public function confirmQrPayment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        $order = Order::findOrFail($request->order_id);
        $order->update([
            'payment_status' => 'paid',
            'order_status'   => 'preparing',
        ]);

        try {
            broadcast(new \App\Events\OrderStatusUpdated($order));
        } catch (\Exception $e) {
        }

        return response()->json([
            'message' => 'Payment confirmed!',
            'order'   => $order->load('items.product'),
        ]);
    }

    // ── 4. REJECT QR PAYMENT ────────────────────────────────────────────────

    public function rejectQrPayment(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        $order = Order::findOrFail($request->order_id);
        $order->update([
            'payment_status' => 'rejected',
            'order_status'   => 'cancelled',
        ]);

        try {
            broadcast(new \App\Events\OrderStatusUpdated($order));
        } catch (\Exception $e) {
        }

        return response()->json([
            'message' => 'Payment rejected.',
            'order'   => $order->load('items.product'),
        ]);
    }

    // ── 5. CASH ON DELIVERY ─────────────────────────────────────────────────

    public function cashOnDelivery(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        $order = Order::where('user_id', $request->user()->id)
            ->findOrFail($request->order_id);

        $order->update([
            'payment_status' => 'unpaid',
            'order_status'   => 'pending',
        ]);

        return response()->json([
            'message' => 'Order confirmed! Pay on delivery.',
            'order'   => $order->load('items.product'),
        ]);
    }

    // ── 6. ABA PAYWAY INITIATE ──────────────────────────────────────────────

    /**
     * POST /api/payment/initiate
     * Initiate an ABA PayWay payment session
     */
    public function initiate(Request $request)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
        ]);

        $order = Order::with(['items.product', 'user'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->order_id);

        // Prevent duplicate initiation for already paid orders
        if ($order->payment_status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Order already paid',
            ], 400);
        }

        // Initiate payment with ABA PayWay
        $result = $this->abapaywayService->initiatePayment([
            'order_id' => $order->id,
            'amount' => $order->total_amount,
            'currency' => 'KHR',
            'description' => 'FastFood Order #' . $order->id,
        ]);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Failed to initiate payment',
            ], 500);
        }

        // Create or update payment record
        $payment = $order->payment;
        if (!$payment) {
            $payment = Payment::create([
                'order_id'       => $order->id,
                'payment_method' => 'aba_payway',
                'status'         => 'pending',
                'amount'         => $order->total_amount,
                'transaction_id' => $result['transaction_id'],
            ]);
        } else {
            $payment->update([
                'payment_method' => 'aba_payway',
                'status'         => 'pending',
                'amount'         => $order->total_amount,
                'transaction_id' => $result['transaction_id'],
            ]);
        }

        // Store ABA PayWay specific data
        $payment->update([
            'aba_payway_transaction_id' => $result['transaction_id'],
            'aba_payway_amount'         => $order->total_amount,
            'aba_payway_currency'       => 'KHR',
            'aba_payway_status'         => 'pending',
            'aba_payway_extra_data'     => json_encode($result['data'] ?? []),
            'aba_payway_created_at'     => now(),
        ]);

        return response()->json([
            'success' => true,
            'transaction_id' => $result['transaction_id'],
            'qr_code' => $result['qr_code'],
            'expires_at' => $result['expires_at'],
            'payment' => $payment,
        ]);
    }

    // ── 7. GET PAYMENT STATUS ────────────────────────────────────────────────

    /**
     * GET /api/payment/status/{orderId}
     * Get the current payment status for an order
     */
    public function getPaymentStatus(Request $request, $orderId)
    {
        $order = Order::with(['payment'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($orderId);

        $payment = $order->payment;

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'No payment record found',
            ], 404);
        }

        // For ABA PayWay payments, we might want to check with the gateway
        // But for now, we'll return the current status from our database
        return response()->json([
            'success' => true,
            'payment_status' => $payment->status,
            'order_status' => $order->order_status,
            'amount' => (float) $order->total_amount,
            'currency' => 'KHR',
            'transaction_id' => $payment->transaction_id,
            'aba_payway_transaction_id' => $payment->aba_payway_transaction_id,
            'aba_payway_status' => $payment->aba_payway_status,
            'paid_at' => $payment->paid_at,
            'created_at' => $payment->created_at,
            'updated_at' => $payment->updated_at,
        ]);
    }
}
