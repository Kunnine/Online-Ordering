<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Services\Khqr\KhqrService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * KhqrPaymentController  —  "Scan to Pay" page + payment lifecycle
 *
 * Endpoints (auth:sanctum — called from React):
 *   POST   /api/khqr/initiate/:orderId          — create order QR, save PNG "in the folder"
 *   GET    /api/khqr/status/:orderId            — poll payment status
 *   POST   /api/khqr/webhook/callback           — bank IPN (idempotent)
 *
 * Klean-QR image storage:
 *   storage/app/public/payments/{order_id}/qr.png
 *   public URL: /storage/payments/{order_id}/qr.png  (served by Laravel mix / nginx)
 */
class KhqrPaymentController extends Controller
{
    // ══════════════════════════════════════════════════════════════════════════
    // 1 · INITIATE  —  create QR image "in the folder"
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * POST /api/khqr/initiate/:orderId
     *
     * Body: { currency?: "KHR", bankCode?: "002", accountId?: "010161254" }
     *
     * Returns: khqrMark, qrImage (base64), qrImagePath, qrImageUri, expiresAt …
     */
    public function initiate(string $orderId, Request $request)
    {
        $order = Order::with('payment')->findOrFail($orderId);

        if ($order->user_id !== $request->user()->id) {
            throw ValidationException::withMessages(['order_id' => ['You do not own this order.']]);
        }

        if ($order->payment_status === 'paid') {
            throw ValidationException::withMessages(['payment' => ['Order is already paid.']]);
        }

        $validated = $request->validate([
            'bankCode'  => 'nullable|string|size:3',
            'accountId' => 'nullable|string',
            'currency'  => 'nullable|string|size:3',
        ]);

        $bankCode   = strtoupper($validated['bankCode']  ?? config('khqr.bakong.bank_code', '002'));
        $accountId  = strtoupper($validated['accountId'] ?? config('khqr.bakong.merchant_account', '010161254'));
        $currency   = strtoupper($validated['currency']  ?? 'KHR');
        $bankName   = \App\Services\Khqr\KhqrService::bankName($bankCode);

        $amountKhr  = (int) round((float) $order->total_amount * 4100);
        $billNumber = $bankName . '-' . strtoupper(Str::random(8));
        $expiresAt  = now()->addHours(2);
        $merchant   = config('khqr.bakong.merchant_name', 'FastFood KH');
        $city       = config('khqr.bakong.merchant_city',   'Phnom Penh');

        DB::beginTransaction();
        try {
            /* ── build raw EMVCo OB1 mark ───────────────────────────────────── */
            $markData = KhqrService::buildMark([
                'orderId'      => $orderId,
                'amountKhr'    => $amountKhr,
                'billNumber'   => $billNumber,
                'merchantName' => $merchant,
                'merchantCity' => $city,
                'bankCode'     => $bankCode,
                'accountId'    => $accountId,
                'currency'     => $currency,
                'expiryDate'   => $expiresAt->format('Ymd'),
            ]);

            $rawMark = $markData['mark'];

            /* ── render & save QR image "in the folder" ──────────────────────── */
            $imgDir  = storage_path("app/public/payments/{$orderId}");
            @mkdir($imgDir, 0755, true);

            $img    = KhqrService::renderImage($rawMark, $orderId);
            $qrPng  = QrCode::format('png')->size(340)->margin(2)->generate($rawMark);

            // Store base64 on the order row
            $order->update([
                'order_status'   => 'waiting_verification',
                'payment_status' => 'pending',
            ]);

            // Create or update payment row
            $payment = $order->payment ?? new Payment();
            $payment->order_id           = $order->id;
            $payment->payment_method     = 'qr_payment';
            $payment->status             = 'pending';
            $payment->amount             = (float) $order->total_amount;
            $payment->transaction_id     = $billNumber;
            $payment->qr_reference       = $billNumber;
            $payment->khqr_reference     = $billNumber;
            $payment->khqr_mark          = $rawMark;
            $payment->khqr_md5           = hash('md5', $rawMark);
            $payment->khqr_amount        = $amountKhr;
            $payment->khqr_currency      = $currency;
            $payment->khqr_bill_number   = $billNumber;
            $payment->khqr_expires_at    = $expiresAt;
            $payment->gateway_provider   = 'bakong';
            $payment->gateway_message    = null;
            $payment->paid_at            = null;
            $payment->qr_image_path      = $img['path'];
            $payment->qr_image_uri       = $img['uri'];
            $payment->qr_image_base64    = $img['base64'];
            $payment->save();

            DB::commit();

            return response()->json([
                'success'       => true,
                'khqrMark'      => $rawMark,
                'khqrReference' => $billNumber,
                'md5Hash'       => hash('md5', $rawMark),
                'qrImage'       => 'data:image/png;base64,' . $img['base64'],
                'qrImagePath'   => $img['path'],      // absolute path on disk
                'qrImageUri'    => $img['uri'],        // /storage/payments/{orderId}/qr.png
                'billNumber'    => $billNumber,
                'bankCode'      => $bankCode,
                'bankName'      => $bankName,
                'accountId'     => $accountId,
                'currency'      => $currency,
                'amountKhr'     => $amountKhr,
                'amountUsd'     => (string) round($amountKhr / 4100, 2),
                'expiresAt'     => $expiresAt->toIso8601String(),
                'merchant'      => compact('merchant', 'city'),
                'order'         => $order->fresh(['items.product', 'payment']),
                'payment'       => $payment,
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('KHQR initiate failed: ' . $e->getMessage(), ['orderId' => $orderId]);
            throw ValidationException::withMessages([
                'khqr' => ['QR generation failed: ' . $e->getMessage()],
            ]);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2 · POLL STATUS  —  GET /api/khqr/status/:orderId
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/khqr/status/:orderId
     * Frontend polls this every 3 s.
     */
    public function status(string $orderId)
    {
        $order = Order::with('payment')->findOrFail($orderId);

        return response()->json([
            'success'       => true,
            'status'        => $order->payment_status,   // PENDING | PAID | EXPIRED
            'order_status'  => $order->order_status,
            'paid_at'       => $order->payment?->paid_at,
            'khqr_reference'=> $order->payment?->khqr_reference,
            'expires_at'    => $order->payment?->khqr_expires_at,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3 · WEBHOOK  —  POST /api/khqr/webhook/callback
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * POST /api/khqr/webhook/callback
     *
     * Called by the Bakong gateway at the instant the customer completes payment.
     * Verified with X-SIGNATURE HMAC header.
     */
    public function webhook(Request $request)
    {
        $rawBody   = $request->getContent();
        $secret    = (string) config('khqr.webhook.secret', '');
        $sentSig   = $request->header('X-SIGNATURE') ?? '';

        if ($secret && !hash_equals(
            hash_hmac('sha256', $rawBody, $secret),
            $sentSig
        )) {
            Log::warning('KHQR webhook: bad signature');
            return response('Invalid signature', 401);
        }

        $payload  = $request->all();
        $billNum  = (string) ($payload['billNumber'] ?? $payload['bill_number'] ?? '');
        $status   = strtolower($payload['status'] ?? $payload['paymentStatus'] ?? '');
        $paidAt   = $payload['paidAt'] ?? $payload['paid_at'] ?? now();

        if (!$billNum) return response('billNumber required', 400);

        DB::transaction(function () use ($billNum, $status, $paidAt, $payload) {
            $payment = Payment::where('khqr_bill_number', $billNum)
                ->orWhere('khqr_reference', $billNum)
                ->orWhere('transaction_id', $billNum)
                ->first();

            if (!$payment) {
                Log::warning('KHQR webhook: payment not found for ' . $billNum);
                return;
            }

            $newStatus = match ($status) {
                'success', 'paid', 'completed', 'settled' => 'paid',
                'rejected', 'failed', 'cancelled'         => 'rejected',
                default                                   => $payment->status,
            };

            $payment->update([
                'status'          => $newStatus,
                'paid_at'         => in_array($newStatus, ['paid']) ? $paidAt : $payment->paid_at,
                'gateway_message' => $payload['message'] ?? $payload['remark'] ?? null,
            ]);

            $payment->order->update([
                'payment_status' => in_array($newStatus, ['paid', 'rejected']) ? $newStatus : $payment->order->payment_status,
                'order_status'   => $newStatus === 'paid' ? 'preparing' : $payment->order->order_status,
            ]);
        });

        return response()->json(['acknowledged' => true]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4 · PUBLIC QR IMAGE  —  GET /storage/payments/{orderId}/qr.png
    //     Served directly by nginx / Laravel's public disk — no controller needed.
    //     See getPublicUrl() below for the hard URL.
    // ══════════════════════════════════════════════════════════════════════════
}
