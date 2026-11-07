<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * WebhookController
 *
 * Public, unauthenticated endpoint that payment gateways call after a
 * transaction completes.  Responsibilities:
 *   - verify the HMAC signature (PAYMENT_WEBHOOK_SECRET / provider secret)
 *   - locate the Payment by transaction/reference (idempotent)
 *   - mark it paid (or failed) inside a transaction
 *   - broadcast OrderStatusUpdated so the React UI updates live
 *
 * It NEVER trusts client state — it loads the order from the gateway
 * reference and only ever flips status from a non-final state.
 */
class WebhookController extends Controller
{
    public function __construct(protected PaymentService $payments) {}

    /**
     * POST /api/payment/webhook
     * POST /payment/khqr-callback   (web.php alias)
     */
    public function handle(Request $request)
    {
        $rawBody  = $request->getContent();
        $signature = $request->header('X-Signature')
            ?? $request->header('X-Payway-Signature')
            ?? $request->query('signature');

        $provider = $request->input('provider')
            ?? $request->header('X-Provider')
            ?? config('khqr.default', 'aba_payway');

        // ── 1. Signature verification (security) ──────────────────────────
        if (!$this->payments->verifySignature($provider, $rawBody, $signature)) {
            Log::warning('Payment webhook: invalid signature', [
                'provider' => $provider,
                'ip'       => $request->ip(),
            ]);

            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $data = json_decode($rawBody, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json(['error' => 'Invalid JSON'], 400);
        }

        // ── 2. Locate the payment by gateway reference ───────────────────
        $reference = $data['reference']
            ?? $data['bill_number']
            ?? $data['transaction_id']
            ?? $data['md5']
            ?? null;

        if (!$reference) {
            Log::error('Payment webhook: missing reference', $data);
            return response()->json(['error' => 'Missing reference'], 422);
        }

        $payment = Payment::where('transaction_id', $reference)
            ->orWhere('payment_reference', $reference)
            ->latest()
            ->first();

        if (!$payment) {
            Log::warning('Payment webhook: unknown reference ' . $reference);
            // Return 200 so the gateway does not keep retrying forever.
            return response()->json(['success' => true, 'note' => 'no matching payment']);
        }

        // ── 3. Apply the gateway outcome (idempotent) ─────────────────────
        $status = strtolower($data['status'] ?? $data['state'] ?? 'paid');

        if (in_array($status, ['paid', 'success', 'completed', 'settled'])) {
            $this->payments->markPaid($payment, $data);

            // Update order status to preparing so kitchen can start
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
            $this->payments->markFailed($payment, $status === 'expired' ? 'expired' : 'failed');

            $payment->order->update([
                'payment_status' => 'rejected',
                'order_status'   => 'cancelled',
            ]);
        } else {
            // Unknown / pending state — leave as-is, just persist raw data.
            $payment->update(['response_data' => array_merge($payment->response_data ?? [], $data)]);
        }

        return response()->json(['success' => true]);
    }
}
