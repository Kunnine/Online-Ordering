<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\Abapayway\AbapaywayService;
use App\Services\Khqr\KhqrService;

class PaymentWebController extends Controller
{
    /**
     * AbapaywayService instance.
     */
    protected $abapaywayService;

    /**
     * KhqrService instance.
     */
    protected $khqrService;

    /**
     * Constructor.
     */
    public function __construct(AbapaywayService $abapaywayService, KhqrService $khqrService)
    {
        $this->abapaywayService = $abapaywayService;
        $this->khqrService = $khqrService;
    }

    /**
     * Handle KHQR webhook callback from ABA PayWay or Bakong.
     *
     * @param  Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function khqrCallback(Request $request)
    {
        // Get the raw payload for signature verification
        $payload = $request->getContent();

        // Get the signature from header or query param (depending on provider)
        $signature = $request->header('X-Signature') ?? $request->query('signature');

        // Determine the provider from config
        $provider = config('khqr.default', 'aba_payway');

        // Verify the signature
        $isValid = false;
        if ($provider === 'aba_payway') {
            $isValid = $this->abapaywayService->verifyWebhook($request->headers->all(), $payload, $signature);
        } elseif ($provider === 'bakong') {
            // For Bakong, we might need to verify differently. For now, we'll skip signature verification in fake mode.
            // In reality, Bakong uses a different signature method (e.g., RSA or HMAC with a different key).
            // We'll implement a simple check for now, but note: this is not secure for production.
            $isValid = true; // Placeholder - replace with actual Bakong verification
        }

        if (!$isValid) {
            Log::warning('Invalid KHQR webhook signature. Payload: ' . $payload);
            return response()->json(['error' => 'Invalid signature'], 400);
        }

        // Parse the payload as JSON
        $data = json_decode($payload, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Invalid JSON in KHQR webhook: ' . json_last_error_msg());
            return response()->json(['error' => 'Invalid JSON'], 400);
        }

        // Handle the webhook based on provider
        if ($provider === 'aba_payway') {
            $this->abapaywayService->handleWebhook($data);
        } elseif ($provider === 'bakong') {
            // For Bakong, we use the instance method
            $this->khqrService->handleWebhook($data);
        }

        // Return success response
        return response()->json(['success' => true]);
    }
}