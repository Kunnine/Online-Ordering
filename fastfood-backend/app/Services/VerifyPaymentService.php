<?php

namespace App\Services;

use App\Services\Khqr\KhqrFactory;
use Illuminate\Support\Facades\Log;

/**
 * VerifyPaymentService
 *
 * Provider-agnostic service for verifying payment status with the
 * payment gateway's API.  Uses the existing KHQR driver stack
 * (ABA PayWay / Bakong) but can be extended to other providers.
 *
 * Usage:
 *   $service = new VerifyPaymentService();
 *   $result = $service->verify($reference, $provider);
 *   // $result['verified'], $result['status'], $result['paid_at'], $result['raw']
 */
class VerifyPaymentService
{
    /**
     * Verify a payment by querying the provider's API.
     *
     * @param  string  $reference  The payment reference / bill number
     * @param  string|null  $provider  The payment provider (aba_payway, bakong)
     * @return array{verified: bool, status: string, paid_at?: string, message?: string, raw: array}
     */
    public function verify(string $reference, ?string $provider = null): array
    {
        try {
            $provider = strtolower($provider ?? config('khqr.default', 'aba_payway'));
            $driver   = KhqrFactory::make($provider);
            $result   = $driver->getStatus($reference);

            return [
                'verified' => true,
                'status'   => $result['status'],
                'paid_at'  => $result['paid_at'] ?? null,
                'message'  => $result['message'] ?? null,
                'raw'      => $result['raw'] ?? [],
            ];
        } catch (\Throwable $e) {
            Log::error('Payment verification failed: ' . $e->getMessage(), [
                'reference' => $reference,
                'provider'  => $provider ?? config('khqr.default', 'aba_payway'),
            ]);

            return [
                'verified' => false,
                'status'   => 'unknown',
                'message'  => $e->getMessage(),
                'raw'      => [],
            ];
        }
    }

    /**
     * Verify a payment by order ID (convenience wrapper).
     *
     * @param  int  $orderId
     * @return array{verified: bool, status: string, paid_at?: string, message?: string, raw: array}
     */
    public function verifyByOrderId(int $orderId): array
    {
        $order = \App\Models\Order::with('payment')->findOrFail($orderId);

        if (!$order->payment) {
            return [
                'verified' => false,
                'status'   => 'no_payment',
                'message'  => 'No payment record found for this order.',
                'raw'      => [],
            ];
        }

        $reference = $order->payment->khqr_reference
                  ?? $order->payment->payment_reference
                  ?? $order->payment->transaction_id
                  ?? '';

        if (!$reference) {
            return [
                'verified' => false,
                'status'   => 'no_reference',
                'message'  => 'No payment reference found.',
                'raw'      => [],
            ];
        }

        return $this->verify($reference, $order->payment->gateway_provider);
    }
}
