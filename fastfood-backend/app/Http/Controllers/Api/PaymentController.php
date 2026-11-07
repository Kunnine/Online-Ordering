<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Khqr\KhqrFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class PaymentController extends Controller
{
    // ── helpers ────────────────────────────────────────────────────────────────

    private function renderQrImage(string $mark, int $orderId): array
    {
        $raw = QrCode::format('png')->size(340)->margin(2)->generate($mark);

        if ($raw instanceof \Illuminate\Support\HtmlString) {
            $svg     = (string) $raw;
            $b64     = base64_encode($svg);
            $dataUri = 'data:image/svg+xml;base64,' . $b64;
            return ['base64' => $b64, 'dataUri' => $dataUri, 'format' => 'svg', 'path' => null];
        }

        $dir  = storage_path("app/public/payments/{$orderId}");
        $path = "{$dir}/qr.png";
        @mkdir($dir, 0755, true);
        file_put_contents($path, $raw);
        $b64     = base64_encode($raw);
        $dataUri = 'data:image/png;base64,' . $b64;

        return ['base64' => $b64, 'dataUri' => $dataUri, 'format' => 'png', 'path' => $path];
    }

    // ── 1. INITIATE PAYMENT ───────────────────────────────────────────────────

    public function initiate(Request $request)
    {
        $validated = $request->validate([
            'order_id'  => 'required|exists:orders,id',
            'provider'  => 'nullable|string|in:aba_payway,bakong',
            'currency'  => 'nullable|string|size:3',
        ]);

        $order = Order::with(['items.product', 'user'])->findOrFail($validated['order_id']);

        if ($order->user_id !== $request->user()->id) {
            throw ValidationException::withMessages([
                'order_id' => ['You do not own this order.'],
            ]);
        }

        if ($order->payment_status === 'paid') {
            throw ValidationException::withMessages([
                'payment' => ['Order is already paid.'],
            ]);
        }

        $provider  = strtolower((string) ($validated['provider'] ?? config('khqr.default', 'aba_payway')));
        $billRef   = 'FF-' . strtoupper(Str::random(8));
        $amount    = (float) $order->total_amount;
        $amountKhr = (int) round($amount * 4100);
        $currency  = strtoupper($validated['currency'] ?? 'KHR');

        DB::beginTransaction();
        try {
            $payload = [
                'order_id'    => $order->id,
                'amount'      => $amountKhr,
                'description' => "FastFood Order #{$order->id}",
                'bill_number' => $billRef,
            ];

            $result     = $this->callGateway($provider, $payload);
            $expiresAt  = isset($result['expires_at'])
                ? \Carbon\Carbon::parse($result['expires_at'])
                : now()->addHours(2);

            $rawMark = $result['raw']['mark']
                     ?? $result['raw']['mk2Qr']
                     ?? $result['khqr_reference']
                     ?? $billRef;

            $qrImg   = $this->renderQrImage($rawMark, $order->id);
            $qrB64   = $result['qr_base64'] ?? $qrImg['base64'];

            $payment = Payment::updateOrCreate(
                ['order_id' => $order->id],
                [
                    'payment_method'    => 'qr_payment',
                    'payment_provider'  => $provider,
                    'status'            => 'pending',
                    'amount'            => $amount,
                    'currency'          => $currency,
                    'transaction_id'    => $billRef,
                    'payment_reference' => $result['khqr_reference'] ?? $billRef,
                    'qr_reference'      => $result['khqr_reference'] ?? $billRef,
                    'khqr_reference'    => $result['khqr_reference'] ?? $billRef,
                    'khqr_bill_number'  => $result['bill_number'] ?? $billRef,
                    'khqr_amount'       => $amountKhr,
                    'khqr_currency'     => $currency,
                    'khqr_expires_at'   => $expiresAt,
                    'khqr_metadata'     => $result['raw'] ?? null,
                    'khqr_mark'         => $rawMark,
                    'qr_code'           => $rawMark,
                    'bank_code'         => $this->bankCodeForProvider($provider),
                    'qr_image_uri'      => $qrImg['dataUri'],
                    'qr_image_path'     => $qrImg['path'],
                    'qr_image_base64'   => $qrImg['base64'],
                    'gateway_provider'  => $provider,
                    'response_data'     => $result,
                    'paid_at'           => null,
                ]
            );

            $order->update([
                'order_status'   => 'waiting_verification',
                'payment_status' => 'pending',
            ]);

            DB::commit();

            return response()->json([
                'success'       => true,
                'message'       => 'KHQR code generated successfully.',
                'payment'       => $payment,
                'order'         => $order->fresh(['items.product']),
                'khqrMark'      => $rawMark,
                'khqrReference' => $result['khqr_reference'] ?? $billRef,
                'md5Hash'       => hash('md5', $rawMark),
                'qrImage'       => $qrImg['dataUri'],
                'qr'            => $qrB64,
                'qrImagePath'   => $qrImg['path'],
                'qrImageUri'    => $qrImg['dataUri'],
                'qr_base64'     => $qrB64,
                'reference'     => $result['khqr_reference'] ?? $billRef,
                'billNumber'    => $result['bill_number'] ?? $billRef,
                'bankCode'      => $this->bankCodeForProvider($provider),
                'bankName'      => \App\Services\Khqr\KhqrService::bankName($this->bankCodeForProvider($provider)),
                'accountId'     => config('khqr.' . $provider . '.merchant_account', ''),
                'currency'      => $currency,
                'amountKhr'     => $amountKhr,
                'amountUsd'     => (string) $amount,
                'expires_at'    => $expiresAt->toIso8601String(),
                'merchant'      => [
                    'name' => config('khqr.bakong.merchant_name', 'FastFood KH'),
                    'city' => config('khqr.bakong.merchant_city', 'Phnom Penh'),
                ],
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Payment initiate failed: ' . $e->getMessage(), ['order_id' => $order->id]);

            DB::beginTransaction();
            try {
                $payment = Payment::updateOrCreate(
                    ['order_id' => $order->id],
                    [
                        'payment_method'    => 'qr_payment',
                        'payment_provider'  => $provider,
                        'status'            => 'failed',
                        'amount'            => $amount,
                        'currency'          => $currency,
                        'transaction_id'    => $billRef,
                        'payment_reference' => $billRef,
                        'gateway_provider'  => $provider,
                        'response_data'     => ['error' => $e->getMessage()],
                        'paid_at'           => null,
                    ]
                );

                $order->update([
                    'order_status'   => 'waiting_verification',
                    'payment_status' => 'pending',
                ]);

                DB::commit();
            } catch (\Throwable $e2) {
                DB::rollBack();
                Log::error('Failed to record payment failure state: ' . $e2->getMessage(), ['order_id' => $order->id]);
            }

            $statusCode = 500;
            if (class_exists(\GuzzleHttp\Exception\ConnectException::class) && $e instanceof \GuzzleHttp\Exception\ConnectException) {
                $statusCode = 502;
            } elseif (class_exists(\GuzzleHttp\Exception\TimeoutException::class) && $e instanceof \GuzzleHttp\Exception\TimeoutException) {
                $statusCode = 504;
            }

            return response()->json([
                'success' => false,
                'message' => 'Payment service is currently unavailable. Please try again later.',
                'error'   => $e->getMessage(),
                'payment' => $payment ?? null,
            ], $statusCode);
        }
    }

    private function bankCodeForProvider(string $provider): string
    {
        return config("khqr.{$provider}.bank_code", config('khqr.bakong.bank_code', '002'));
    }

    private function callGateway(string $provider, array $payload): array
    {
        $khqr = KhqrFactory::make($provider);
        return $khqr->generateBill($payload);
    }

    // ── 2. GET KHQR IMAGE ───────────────────────────────────────────────────

    public function getQrCode(Request $request)
    {
        $orderId = (int) $request->query('order_id');
        if ($orderId < 1) {
            return response()->json(['message' => 'order_id is required'], 400);
        }

        $order = Order::with(['items.product', 'user', 'payment'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($orderId);

        if ($order->payment_method === 'cash') {
            return response()->json([
                'success' => false,
                'message' => 'This is a Cash on Delivery order. QR payment is not applicable.',
            ], 422);
        }

        $payment = $order->payment;

        if (!$payment) {
            $payment = Payment::create([
                'order_id'       => $order->id,
                'payment_method' => 'qr_payment',
                'status'         => 'pending',
                'amount'         => $order->total_amount,
                'transaction_id' => 'FF-' . strtoupper(Str::random(8)),
            ]);
            $order->update([
                'order_status'   => 'waiting_verification',
                'payment_status' => 'pending',
            ]);
            $payment->refresh();
        }

        if (
            $payment->khqr_expires_at &&
            \Carbon\Carbon::parse($payment->khqr_expires_at)->isPast()
        ) {
            return $this->initiate($request->merge(['order_id' => $orderId, 'provider' => $payment->gateway_provider ?? 'aba_payway']));
        }

        $rawMark = $payment->khqr_mark ?? $payment->khqr_reference ?? $payment->transaction_id ?? '';

        if (!$rawMark || $rawMark === $payment->transaction_id) {
            $amountKhr  = (int) round((float) $order->total_amount * 4100);
            $bankCode   = $payment->bank_code ?? config('khqr.bakong.bank_code', '002');
            $accountId  = config('khqr.bakong.merchant_account', '');
            $merchant   = config('khqr.bakong.merchant_name', 'FastFood KH');
            $city       = config('khqr.bakong.merchant_city', 'Phnom Penh');
            $billNo     = $payment->khqr_bill_number ?? $payment->transaction_id ?? 'FF-' . strtoupper(Str::random(8));
            $expiry     = $payment->khqr_expires_at ?? now()->addHours(2);
            $currency   = $payment->currency ?? 'KHR';

            $markData   = \App\Services\Khqr\KhqrService::buildMark([
                'amountKhr'   => $amountKhr,
                'billNumber'  => $billNo,
                'merchantName'=> $merchant,
                'merchantCity'=> $city,
                'bankCode'    => $bankCode,
                'accountId'   => $accountId,
                'currency'    => $currency,
                'expiryDate'  => $expiry instanceof \Carbon\Carbon ? $expiry->format('Ymd') : $expiry,
            ]);
            $rawMark    = $markData['mark'];

            $payment->update([
                'khqr_mark'        => $rawMark,
                'khqr_bill_number' => $billNo,
                'khqr_amount'      => $amountKhr,
                'khqr_currency'    => $currency,
                'bank_code'        => $bankCode,
            ]);
        }

        $qrImg   = $this->renderQrImage($rawMark, $orderId);

        $payment->update([
            'qr_image_uri'    => $qrImg['dataUri'],
            'qr_image_path'   => $qrImg['path'],
            'qr_image_base64' => $qrImg['base64'],
        ]);

        return response()->json([
            'success'        => true,
            'qr_code'        => 'data:image/png;base64,' . $qrImg['base64'],
            'qr_code_url'    => 'data:image/png;base64,' . $qrImg['base64'],
            'order'          => $order,
            'payment'        => $payment->fresh(),
            'khqr_reference' => $payment->khqr_reference,
            'khqr_bill_number'=> $payment->transaction_id,
            'expires_at'     => $payment->khqr_expires_at?->toIso8601String(),
            'merchant_name'  => config('khqr.bakong.merchant_name', 'FastFood KH'),
            'merchant_id'    => config('khqr.bakong.merchant_account', ''),
            'order_id'       => $order->id,
            'note'           => null,
            'amount'         => (float) $order->total_amount,
            'currency'       => $payment->currency ?? 'KHR',
            'bank_code'      => $payment->bank_code,
            'bank_name'      => \App\Services\Khqr\KhqrService::bankName($payment->bank_code ?? '002'),
            'qr_base64'      => $qrImg['base64'],
            'qrImage'        => 'data:image/png;base64,' . $qrImg['base64'],
            'qrImagePath'    => $qrImg['path'],
            'qrImageUri'     => $qrImg['dataUri'],
            'paid_at'        => $payment->paid_at,
        ]);
    }

    // ── 2b. GET KHQR IMAGE (path parameter) ─────────────────────────────────

    public function generateKhqr(int $orderId, Request $request)
    {
        $order = Order::with(['items.product', 'user', 'payment'])->findOrFail($orderId);

        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payment = $order->payment;

        if (!$payment) {
            $payment = Payment::create([
                'order_id'       => $order->id,
                'payment_method' => 'qr_payment',
                'status'         => 'pending',
                'amount'         => $order->total_amount,
                'transaction_id' => 'FF-' . strtoupper(Str::random(8)),
            ]);
            $order->update([
                'order_status'   => 'waiting_verification',
                'payment_status' => 'pending',
            ]);
            $payment->refresh();
        }

        if (!$payment->khqr_reference) {
            return response()->json(['message' => 'Payment not initiated for this order.'], 404);
        }

        if (
            $payment->khqr_expires_at &&
            \Carbon\Carbon::parse($payment->khqr_expires_at)->isPast()
        ) {
            return $this->initiate($request->merge(['order_id' => $orderId, 'provider' => $payment->gateway_provider]));
        }

        $rawMark = $payment->khqr_mark
                 ?? $payment->khqr_reference
                 ?? $payment->transaction_id;
        $qrImg   = $this->renderQrImage($rawMark, $order->id);

        $payment->update([
            'qr_image_uri'    => $qrImg['dataUri'],
            'qr_image_path'   => $qrImg['path'],
            'qr_image_base64' => $qrImg['base64'],
        ]);

        return response()->json([
            'success'       => true,
            'order'         => $order,
            'payment'       => $payment->fresh(),
            'khqrReference' => $payment->khqr_reference,
            'expires_at'    => $payment->khqr_expires_at?->toIso8601String(),
            'qr'            => $qrImg['base64'],
            'qr_base64'     => $qrImg['base64'],
            'qrImage'       => $qrImg['dataUri'],
            'qrImagePath'   => $qrImg['path'],
            'qrImageUri'    => $qrImg['dataUri'],
            'amountKhr'     => $payment->khqr_amount ?? 0,
            'amountUsd'     => $payment->amount ?? 0,
            'message'       => 'QR code refreshed.',
        ]);
    }

    // ── 3. POLL PAYMENT STATUS ───────────────────────────────────────────────

    public function getPaymentStatus(int $orderId, Request $request)
    {
        $order = Order::with('payment')
            ->where('user_id', $request->user()->id)
            ->findOrFail($orderId);

        if (!$order->payment) {
            return response()->json(['message' => 'No payment record found.'], 404);
        }

        $provider = $order->payment->gateway_provider;

        try {
            $khqr  = KhqrFactory::make($provider);
            $ref   = $order->payment->khqr_reference ?? $order->payment->khqr_bill_number ?? '';
            $result = $khqr->getStatus($ref);

            $status = $result['status'];

            if (in_array($status, ['paid', 'refunded', 'failed']) && $order->payment_status !== $status) {
                $orderPaymentStatus = match ($status) {
                    'paid'     => 'paid',
                    'refunded' => 'rejected',
                    'failed'   => 'rejected',
                    default    => $order->payment_status,
                };

                DB::transaction(function () use ($order, $result, $status, $orderPaymentStatus) {
                    $order->update([
                        'payment_status' => $orderPaymentStatus,
                        'order_status'   => $status === 'paid' ? 'preparing' : 'cancelled',
                    ]);
                    $order->payment->update([
                        'status'    => $status,
                        'paid_at'   => $result['paid_at'] ?? now(),
                        'gateway_message' => $result['message'] ?? null,
                    ]);
                    $order->refresh();
                });
            }

            return response()->json([
                'success'       => true,
                'payment_status'=> $order->payment_status,
                'order_status'  => $order->order_status,
                'gateway_status'=> $status,
                'paid_at'       => $order->payment->paid_at,
                'message'       => $result['message'] ?? null,
                'currency'      => $order->payment->currency ?? 'KHR',
                'amount'        => (float) $order->total_amount,
            ]);
        } catch (\Throwable $e) {
            Log::error('Payment status check failed: ' . $e->getMessage());
            return response()->json([
                'success'       => true,
                'payment_status'=> $order->payment_status,
                'order_status'  => $order->order_status,
                'gateway_status'=> 'unknown',
                'currency'      => $order->payment->currency ?? 'KHR',
                'amount'        => (float) $order->total_amount,
            ]);
        }
    }

    // ── 4. CREATE PAYMENT (alias for initiate) ─────────────────────────────

    public function create(Request $request)
    {
        return $this->initiate($request);
    }

    // ── 5. PUBLIC CALLBACK (Bakong webhook target) ─────────────────────────

    /**
     * POST /api/payment/callback
     *
     * Public endpoint called by Bakong when payment status changes.
     * Verifies the transaction and updates order/payment status.
     */
    public function callback(Request $request)
    {
        $data = $request->all();

        $reference = $data['reference']
            ?? $data['bill_number']
            ?? $data['transaction_id']
            ?? $data['md5']
            ?? null;

        if (!$reference) {
            Log::warning('Payment callback: missing reference', $data);
            return response()->json(['error' => 'Missing reference'], 422);
        }

        $payment = Payment::where('transaction_id', $reference)
            ->orWhere('payment_reference', $reference)
            ->orWhere('khqr_reference', $reference)
            ->latest()
            ->first();

        if (!$payment) {
            Log::warning('Payment callback: unknown reference ' . $reference);
            return response()->json(['success' => true, 'note' => 'no matching payment']);
        }

        $status = strtolower($data['status'] ?? $data['state'] ?? 'paid');

        DB::beginTransaction();
        try {
            if (in_array($status, ['paid', 'success', 'completed', 'settled'])) {
                $payment->update([
                    'status'    => 'paid',
                    'paid_at'   => now(),
                    'gateway_message' => $data['message'] ?? 'Payment confirmed by Bakong',
                    'response_data' => array_merge($payment->response_data ?? [], $data),
                ]);

                $payment->order->update([
                    'payment_status' => 'paid',
                    'order_status'   => 'preparing',
                ]);

                try {
                    broadcast(new \App\Events\OrderStatusUpdated($payment->order))->toOthers();
                } catch (\Exception $e) {
                    Log::info('Broadcast skipped: ' . $e->getMessage());
                }
            } elseif (in_array($status, ['failed', 'expired', 'cancelled', 'canceled'])) {
                $payment->update([
                    'status'    => 'failed',
                    'gateway_message' => $data['message'] ?? 'Payment failed',
                    'response_data' => array_merge($payment->response_data ?? [], $data),
                ]);

                $payment->order->update([
                    'payment_status' => 'rejected',
                    'order_status'   => 'cancelled',
                ]);
            } else {
                $payment->update([
                    'response_data' => array_merge($payment->response_data ?? [], $data),
                ]);
            }

            DB::commit();

            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Payment callback failed: ' . $e->getMessage(), ['payment_id' => $payment->id]);
            return response()->json(['error' => 'Processing failed'], 500);
        }
    }

    // ── 6. REFUND ───────────────────────────────────────────────────────────

    public function refund(int $orderId, Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $order   = Order::with(['payment', 'items.product'])->findOrFail($orderId);
        $payment = $order->payment;

        if (!$payment || $payment->status !== 'paid') {
            throw ValidationException::withMessages([
                'payment' => ['Only paid transactions can be refunded.'],
            ]);
        }

        $amount   = $request->input('amount', $payment->amount);

        try {
            $provider  = $payment->gateway_provider ?? config('khqr.default', 'bakong');
            $khqr      = KhqrFactory::make($provider);
            $ref       = $payment->khqr_reference ?? $payment->khqr_bill_number ?? '';
            $result    = $khqr->refund($ref, (float) $amount);

            if ($result['status'] === 'refunded') {
                $order->update([
                    'order_status'   => 'cancelled',
                    'payment_status' => 'rejected',
                ]);
                $payment->update([
                    'status'           => 'refunded',
                    'gateway_message'  => $result['message'] ?? 'Refunded',
                ]);

                // Replenish product stock on refund
                foreach ($order->items as $item) {
                    if ($item->product && $item->product->track_stock) {
                        $item->product->increment('stock', $item->quantity);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => $result['message'] ?? 'Order refunded successfully',
                'result'  => $result,
            ]);
        } catch (\Throwable $e) {
            Log::error('Refund failed: ' . $e->getMessage());
            throw ValidationException::withMessages([
                'payment' => ['Refund failed: ' . $e->getMessage()],
            ]);
        }
    }

    // ── 7. CUSTOMER TRANSACTION HISTORY ─────────────────────────────────────

    public function transactions(Request $request)
    {
        $validated = $request->validate([
            'status'       => 'nullable|in:pending,paid,failed,refunded,rejected',
            'method'       => 'nullable|in:qr_payment,cash',
            'date_from'    => 'nullable|date',
            'date_to'      => 'nullable|date|after_or_equal:date_from',
            'search'       => 'nullable|string|max:100',
        ]);

        $query = Order::where('user_id', $request->user()->id)
            ->with(['items.product', 'payment']);

        if (!empty($validated['status'])) {
            $query->where('payment_status', $validated['status']);
        }
        if (!empty($validated['method'])) {
            $query->where('payment_method', $validated['method']);
        }
        if (!empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }
        if (!empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }
        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('payment', fn ($q2) => $q2->where('transaction_id', 'like', "%{$search}%"))
                  ->orWhereHas('payment', fn ($q2) => $q2->where('khqr_reference', 'like', "%{$search}%"));
            });
        }

        $transactions = $query->orderByDesc('created_at')->paginate(15);

        $data = $transactions->through(function (Order $order) {
            return [
                'id'            => $order->id,
                'order_id'      => $order->id,
                'transaction_id'=> $order->payment->transaction_id ?? null,
                'khqr_ref'      => $order->payment->khqr_reference   ?? null,
                'payment_method'=> $order->payment_method,
                'payment_status'=> $order->payment_status,
                'order_status'  => $order->order_status,
                'total_amount'  => (float) $order->total_amount,
                'currency'      => $order->payment->khqr_currency ?? 'KHR',
                'paid_at'       => $order->payment->paid_at,
                'created_at'    => $order->created_at,
                'items_count'   => $order->items->count(),
            ];
        });

        return response()->json($data);
    }

    // ── 8. SINGLE TRANSACTION DETAIL ─────────────────────────────────────────

    public function transactionDetail(int $id, Request $request)
    {
        $order = Order::with(['items.product', 'payment', 'user'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json([
            'order'   => $order,
            'payment' => $order->payment,
            'items'   => $order->items,
        ]);
    }
}
