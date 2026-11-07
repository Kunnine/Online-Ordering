<?php

namespace App\Services;

use App\Events\OrderStatusUpdated;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Khqr\KhqrFactory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * PaymentService
 *
 * Thin, provider-agnostic service layer for the checkout payment flow.
 * Controllers stay slim: they validate input and delegate orchestration
 * here.  All DB writes happen inside transactions, and the "mark as paid"
 * path is idempotent (duplicate webhooks are no-ops).
 */
class PaymentService
{
    /**
     * Create / refresh a Payment row and ask the gateway for a QR code.
     *
     * @return array{payment: Payment, order: Order, qrImage: string, reference: string, expiresAt: \Carbon\Carbon, provider: string}
     *
     * @throws \RuntimeException when the gateway call fails.
     */
    public function initiate(Order $order, ?string $provider = null, ?string $currency = null): array
    {
        $provider = strtolower($provider ?? config('khqr.default', 'aba_payway'));
        $currency = strtoupper($currency ?? 'KHR');

        // Reuse the existing KHQR driver stack (Bakong / ABA PayWay).
        $driver   = KhqrFactory::make($provider);
        $billRef  = 'FF-' . strtoupper(Str::random(8));
        $amount   = (float) $order->total_amount;
        $amountKhr = (int) round($amount * 4100);
        $bankCode = config("khqr.{$provider}.bank_code", config('khqr.bakong.bank_code', '002'));

        DB::beginTransaction();
        try {
            $result = $driver->generateBill([
                'order_id'    => $order->id,
                'amount'      => $amountKhr,
                'description' => "FastFood Order #{$order->id}",
                'bill_number' => $billRef,
            ]);

            $expiresAt = isset($result['expires_at'])
                ? \Carbon\Carbon::parse($result['expires_at'])
                : now()->addHours(2);

            $rawMark = $result['raw']['mark']
                ?? $result['raw']['mk2Qr']
                ?? $result['khqr_reference']
                ?? $billRef;

            $payment = Payment::updateOrCreate(
                ['order_id' => $order->id],
                [
                    'payment_method'   => 'qr_payment',
                    'payment_provider' => $provider,
                    'status'           => 'pending',
                    'amount'           => $amount,
                    'currency'         => $currency,
                    'transaction_id'   => $billRef,
                    'payment_reference'=> $result['khqr_reference'] ?? $billRef,
                    'qr_code'          => $rawMark,          // raw mark; rendered by controller
                    'response_data'    => $result,
                    'gateway_provider' => $provider,
                    'khqr_reference'   => $result['khqr_reference'] ?? $billRef,
                    'khqr_bill_number'=> $result['bill_number'] ?? $billRef,
                    'khqr_amount'      => $amountKhr,
                    'khqr_currency'    => $currency,
                    'khqr_expires_at'  => $expiresAt,
                    'paid_at'          => null,
                ]
            );

            $order->update([
                'order_status'   => 'waiting_verification',
                'payment_status' => 'pending',
            ]);

            DB::commit();

            return [
                'payment'   => $payment,
                'order'      => $order->fresh(['items.product']),
                'qrImage'    => $rawMark,          // controller renders to PNG/data-URI
                'reference'  => $result['khqr_reference'] ?? $billRef,
                'expiresAt'  => $expiresAt,
                'provider'   => $provider,
                'bankCode'   => $bankCode,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Payment initiate failed: ' . $e->getMessage(), [
                'order_id' => $order->id,
            ]);

            throw new \RuntimeException('Payment initiation failed: ' . $e->getMessage());
        }
    }

    /**
     * Verify a webhook signature using the provider's secret from .env.
     * Returns true only when the HMAC of the raw body matches the header.
     */
    public function verifySignature(string $provider, string $rawBody, ?string $signature): bool
    {
        $secret = config("khqr.{$provider}.webhook_secret")
            ?? config("khqr.{$provider}.secret")
            ?? env('PAYMENT_WEBHOOK_SECRET');

        if (!$secret || !$signature) {
            return false;
        }

        $expected = hash_hmac('sha256', $rawBody, $secret);

        return hash_equals($expected, $signature);
    }

    /**
     * Idempotently mark a payment (and its order) as paid.
     * Duplicate calls are safe: if already paid, nothing changes and we
     * still broadcast once so the UI converges.
     */
    public function markPaid(Payment $payment, array $gatewayData = []): Payment
    {
        if ($payment->status === 'paid') {
            return $payment; // idempotent — ignore duplicate webhook
        }

        DB::transaction(function () use ($payment, $gatewayData) {
            $payment->update([
                'status'         => 'paid',
                'paid_at'        => now(),
                'transaction_id' => $gatewayData['transaction_id'] ?? $payment->transaction_id,
                'response_data'  => array_merge($payment->response_data ?? [], $gatewayData),
            ]);

            $order = $payment->order;
            $order->update([
                'payment_status' => 'paid',
                'order_status'   => 'preparing',
            ]);

            // Notify any listening clients (Laravel Echo / Reverb).
            try {
                broadcast(new OrderStatusUpdated($order))->toOthers();
            } catch (\Throwable $e) {
                Log::warning('Broadcast failed in markPaid: ' . $e->getMessage());
            }
        });

        return $payment;
    }

    /**
     * Mark a payment as failed / cancelled.
     *
     * Note: the orders.payment_status enum only allows
     * ['unpaid','pending','paid','rejected'], so a gateway "failed"/"expired"
     * outcome is persisted as 'rejected' on the order. The Payment row keeps
     * the precise reason in its own status column (which allows 'failed').
     */
    public function markFailed(Payment $payment, string $reason = 'failed'): Payment
    {
        DB::transaction(function () use ($payment, $reason) {
            $payment->update(['status' => $reason]);

            $order = $payment->order;
            $order->update([
                'payment_status' => 'rejected',
                'order_status'   => 'cancelled',
            ]);

            // Replenish stock for tracked products
            foreach ($order->items as $item) {
                if ($item->product && $item->product->track_stock) {
                    $item->product->increment('stock', $item->quantity);
                }
            }

            try {
                broadcast(new OrderStatusUpdated($payment->order))->toOthers();
            } catch (\Throwable $e) {
                Log::warning('Broadcast failed in markFailed: ' . $e->getMessage());
            }
        });

        return $payment;
    }
}
