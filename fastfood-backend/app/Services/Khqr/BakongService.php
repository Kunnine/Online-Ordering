<?php

namespace App\Services\Khqr;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * Bakong KHQR (National Bank of Cambodia) integration.
 *
 * Real Bakong KHQR flow:
 *   1. Call POST /bakong/khqr/credit-endpoint with order details
 *   2. Bakong returns a TLV-encoded "mark" string
 *   3. Render the mark into a QR PNG (base64)
 *   4. Customer scans QR and pays via Bakong-supported app
 *   5. Bakong sends webhook to /payment/khqr-callback
 *   6. Frontend polls GET /api/payment/status/{orderId} as fallback
 *
 * Required env vars:
 *   BAKONG_API_URL           — https://api.bakong.nbc.gov.kh (sandbox or prod)
 *   BAKONG_API_TOKEN         — Bearer token from Bakong developer portal
 *   BAKONG_MERCHANT_ACCOUNT  — Bank code + account number (e.g. 010161254)
 *   BAKONG_BANK_CODE         — 3-char bank code (e.g. 001 ACLEDA, 002 ABA, 009 Wing)
 */
class BakongService implements KhqrDriver
{
    protected string $apiUrl;
    protected string $apiToken;
    protected string $merchantAccount;
    protected string $bankCode;
    protected string $currency;
    protected PendingRequest $http;

    public function __construct()
    {
        $this->apiUrl         = rtrim((string) config('khqr.bakong.api_url', env('BAKONG_API_URL', 'https://api.bakong.nbc.gov.kh')), '/');
        $this->apiToken       = (string) config('khqr.bakong.api_token', env('BAKONG_API_TOKEN', ''));
        $this->merchantAccount = (string) config('khqr.bakong.merchant_account', env('BAKONG_MERCHANT_ACCOUNT', ''));
        $this->bankCode       = (string) config('khqr.bakong.bank_code', env('BAKONG_BANK_CODE', '002'));
        $this->currency       = strtoupper(config('khqr.bakong.currency', env('BAKONG_CURRENCY', 'KHR')));

        $this->http = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiToken,
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
        ])->timeout(30)->retry(2, 500);
    }

    /**
     * Generate a real Bakong KHQR bill.
     *
     * @param  array  $payload  Contains order_id, amount (in KHR), bill_number, description
     * @return array{qr_base64:string, khqr_reference:string, bill_number:string, expires_at:string, raw:array}
     */
    public function generateBill(array $payload): array
    {
        $billNumber  = (string) ($payload['bill_number'] ?? 'FF-' . strtoupper(Str::random(8)));
        $amountKhr   = (int) round((float) $payload['amount']);
        $description = (string) ($payload['description'] ?? 'FastFood Order #' . ($payload['order_id'] ?? ''));
        $expiryDate  = now()->addHours(2)->format('Ymd');

        if ($amountKhr <= 0) {
            throw new \InvalidArgumentException('Amount must be greater than 0');
        }

        // ── 1. Try real Bakong API first ─────────────────────────────────────
        try {
            $response = $this->http->post($this->apiUrl . '/bakong/khqr/credit-endpoint', [
                'bankCode'      => $this->bankCode,
                'accountNumber' => $this->merchantAccount,
                'amount'        => $amountKhr,
                'currency'      => $this->currency,
                'billNumber'    => $billNumber,
                'expiryDate'    => $expiryDate,
                'description'   => $description,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if (!empty($data['data']['mark'])) {
                    $mark = $data['data']['mark'];
                    $qrRaw = QrCode::format('png')->size(350)->margin(2)->generate($mark);
                    $qrBase64 = base64_encode($qrRaw);

                    return [
                        'qr_base64'      => $qrBase64,
                        'khqr_reference' => $billNumber,
                        'bill_number'    => $billNumber,
                        'expires_at'     => now()->addHours(2)->toIso8601String(),
                        'raw'            => [
                            'mark'       => $mark,
                            'source'     => 'bakong_api',
                            'amount'     => $amountKhr,
                            'currency'   => $this->currency,
                            'bill_number'=> $billNumber,
                            'expiry_date'=> $expiryDate,
                            'gateway_response' => $data,
                        ],
                    ];
                }
            }

            Log::warning('Bakong credit-endpoint returned unsuccessful', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Bakong API unreachable, falling back to local mark: ' . $e->getMessage());
        }

        // ── 2. Fallback: generate compliant TLV mark locally ─────────────────
        $markData = KhqrService::buildMark([
            'amountKhr'   => $amountKhr,
            'billNumber'  => $billNumber,
            'merchantName'=> config('khqr.bakong.merchant_name', 'FastFood KH'),
            'merchantCity'=> config('khqr.bakong.merchant_city', 'Phnom Penh'),
            'bankCode'    => $this->bankCode,
            'accountId'   => $this->merchantAccount,
            'currency'    => $this->currency,
            'expiryDate'  => $expiryDate,
        ]);

        $qrRaw    = QrCode::format('png')->size(350)->margin(2)->generate($markData['mark']);
        $qrBase64 = base64_encode($qrRaw);

        return [
            'qr_base64'      => $qrBase64,
            'khqr_reference' => $billNumber,
            'bill_number'    => $billNumber,
            'expires_at'     => now()->addHours(2)->toIso8601String(),
            'raw'            => [
                'mark'       => $markData['mark'],
                'source'     => 'local_fallback',
                'sha256'     => $markData['sha256'],
                'crc'        => $markData['crc'],
                'amount'     => $amountKhr,
                'currency'   => $this->currency,
                'bill_number'=> $billNumber,
                'expiry_date'=> $expiryDate,
            ],
        ];
    }

    /**
     * Query Bakong for the payment status of a given bill number.
     *
     * @return array{status:string, paid_at?:string, message?:string, raw:array}
     */
    public function getStatus(string $reference): array
    {
        try {
            $response = $this->http->get($this->apiUrl . '/bakong/khqr/check-transaction', [
                'billNumber' => $reference,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $raw  = strtolower($data['status'] ?? $data['paymentStatus'] ?? 'pending');

                $status = match ($raw) {
                    'success', 'paid', 'completed', 'settled' => 'paid',
                    'pending', 'processing', 'awaiting'      => 'pending',
                    'failed', 'cancelled', 'timeout', 'expired' => 'failed',
                    'refunded'                               => 'refunded',
                    default                                  => 'pending',
                };

                return [
                    'status'     => $status,
                    'paid_at'    => $data['paidTime'] ?? $data['created_at'] ?? null,
                    'message'    => $data['message'] ?? null,
                    'raw'        => $data,
                ];
            }

            Log::warning('Bakong status check failed', [
                'bill_number' => $reference,
                'status'      => $response->status(),
                'body'        => $response->body(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Bakong status check exception: ' . $e->getMessage());
        }

        return ['status' => 'pending', 'message' => 'Status query failed', 'raw' => []];
    }

    /**
     * Refund a Bakong KHQR transaction.
     *
     * @return array{status:string, message?:string, raw:array}
     */
    public function refund(string $reference, ?float $amount = null): array
    {
        try {
            $payload = [
                'billNumber' => $reference,
            ];
            if ($amount !== null) {
                $payload['amount'] = (string) round($amount);
            }

            $response = $this->http->post($this->apiUrl . '/bakong/khqr/refund', $payload);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'status'  => 'refunded',
                    'message' => $data['message'] ?? 'Refund processed',
                    'raw'     => $data,
                ];
            }

            Log::warning('Bakong refund failed', [
                'bill_number' => $reference,
                'status'      => $response->status(),
                'body'        => $response->body(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Bakong refund exception: ' . $e->getMessage());
        }

        return ['status' => 'failed', 'message' => 'Refund failed', 'raw' => []];
    }
}
