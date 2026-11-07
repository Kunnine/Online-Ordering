<?php

namespace App\Services\Abapayway;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Config;

class AbapaywayService
{
    /**
     * Initiate a payment with ABA PayWay
     *
     * @param  array  $data  Contains order_id, amount, currency, etc.
     * @return array
     */
    public function initiatePayment(array $data)
    {
        $config = config('khqr.aba_payway');

        // For testing, we can have a fake mode
        if (env('ABA_PAYWAY_FAKE_MODE', false)) {
            return $this->fakeInitiatePayment($data);
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $config['secret_key'],
            'Content-Type' => 'application/json',
        ])->post($config['api_url'] . '/v1/payments', [
            'merchant_id' => $config['merchant_id'],
            'account_id' => $config['account_id'],
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'order_id' => $data['order_id'],
            'description' => $data['description'] ?? 'FastFood Order',
            'callback_url' => config('khqr.webhook.callback_url'),
        ]);

        if ($response->successful()) {
            $result = $response->json();

            return [
                'success' => true,
                'transaction_id' => $result['transaction_id'] ?? null,
                'qr_code' => $result['qr_code'] ?? null,
                'expires_at' => $result['expires_at'] ?? null,
                'data' => $result,
            ];
        }

        Log::error('ABA PayWay initiation failed: ' . $response->body());

        return [
            'success' => false,
            'message' => 'Failed to initiate payment with ABA PayWay',
            'error' => $response->body(),
        ];
    }

    /**
     * Fake initiation for testing
     */
    protected function fakeInitiatePayment(array $data)
    {
        // Simulate a successful response
        $transactionId = 'fake_' . Str::random(16);
        $qrCode = 'data:image/png;base64,' . base64_encode('fake qr code data');

        return [
            'success' => true,
            'transaction_id' => $transactionId,
            'qr_code' => $qrCode,
            'expires_at' => now()->addHours(2)->toIso8601String(),
            'data' => [
                'transaction_id' => $transactionId,
                'qr_code' => $qrCode,
                'expires_at' => now()->addHours(2)->toIso8601String(),
                'status' => 'pending',
            ],
        ];
    }

    /**
     * Verify the webhook signature from ABA PayWay
     *
     * @param  array  $headers  Request headers
     * @param  string $payload  Request body
     * @param  string $signature  Signature from header
     * @return bool
     */
    public function verifyWebhook(array $headers, string $payload, string $signature)
    {
        $secret = config('khqr.webhook.secret');

        // ABA PayWay might send the signature in a specific header, e.g., 'X-Signature'
        // We'll compute the HMAC SHA256 of the payload using the secret
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Handle the webhook callback from ABA PayWay
     *
     * @param  array  $data  Parsed JSON payload from webhook
     * @return void
     */
    public function handleWebhook(array $data)
    {
        // Update the payment record with the webhook data
        $transactionId = $data['transaction_id'] ?? null;

        if (!$transactionId) {
            Log::warning('ABA PayWay webhook received without transaction_id');
            return;
        }

        // Find the payment by our transaction_id or aba_payway_transaction_id
        $payment = \App\Models\Payment::where('transaction_id', $transactionId)
            ->orWhere('aba_payway_transaction_id', $transactionId)
            ->first();

        if (!$payment) {
            Log::warning('ABA PayWay webhook received for unknown transaction: ' . $transactionId);
            return;
        }

        // Update the payment with ABA PayWay specific data
        $payment->update([
            'aba_payway_transaction_id' => $transactionId,
            'aba_payway_amount' => $data['amount'] ?? null,
            'aba_payway_currency' => $data['currency'] ?? null,
            'aba_payway_status' => $data['status'] ?? null,
            'aba_payway_extra_data' => json_encode($data),
            'aba_payway_created_at' => now(),
        ]);

        // Update the main payment status based on ABA PayWay status
        $statusMap = [
            'completed' => 'paid',
            'failed' => 'failed',
            'pending' => 'pending',
            'cancelled' => 'failed',
        ];

        $newStatus = $statusMap[$data['status'] ?? 'pending'] ?? 'pending';

        // Only update if the status is changing to a final state
        if ($newStatus === 'paid' && $payment->status !== 'paid') {
            $payment->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            // Update the order status
            $payment->order->update([
                'payment_status' => 'paid',
                'order_status' => 'preparing',
            ]);

            // Broadcast the order status update
            try {
                broadcast(new \App\Events\OrderStatusUpdated($payment->order));
            } catch (\Exception $e) {
                Log::error('Failed to broadcast order status update: ' . $e->getMessage());
            }
        } elseif ($newStatus === 'failed' && $payment->status !== 'failed') {
            $payment->update([
                'status' => 'failed',
            ]);

            $payment->order->update([
                'payment_status' => 'failed',
                'order_status' => 'cancelled',
            ]);

            try {
                broadcast(new \App\Events\OrderStatusUpdated($payment->order));
            } catch (\Exception $e) {
                Log::error('Failed to broadcast order status update: ' . $e->getMessage());
            }
        }
    }
}