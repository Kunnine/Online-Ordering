<?php

namespace App\Services\Khqr;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * ABA PayWay KHQR integration.
 *
 * Docs: https://developer.abapayway.com.kh/
 *
 * Environment variables required:
 *   ABA_PAYWAY_MERCHANT_ID      — merchant ID assigned by ABA
 *   ABA_PAYWAY_ACCOUNT_ID       — your ABA merchant account number
 *   ABA_PAYWAY_SECRET_KEY       — API secret / MAC key
 *   ABA_PAYWAY_API_URL          — e.g. https://api.abapayway.com.kh
 */
class AbapayService implements KhqrDriver
{
    protected string $merchantId;
    protected string $accountId;
    protected string $secretKey;
    protected string $apiUrl;
    protected string $currency;
    protected PendingRequest $http;

    public function __construct()
    {
        $this->merchantId = (string) config('khqr.aba_payway.merchant_id', env('ABA_PAYWAY_MERCHANT_ID', ''));
        $this->accountId  = (string) config('khqr.aba_payway.account_id', env('ABA_PAYWAY_ACCOUNT_ID', ''));
        $this->secretKey  = (string) config('khqr.aba_payway.secret_key', env('ABA_PAYWAY_SECRET_KEY', ''));
        $this->apiUrl     = rtrim((string) config('khqr.aba_payway.api_url', env('ABA_PAYWAY_API_URL', 'https://api.abapayway.com.kh')), '/');
        $this->currency   = strtoupper(config('khqr.aba_payway.currency', env('ABA_PAYWAY_CURRENCY', 'KHR')));

        $this->http = Http::withHeaders([
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
            'MerchantId'    => $this->merchantId,
            'AccountId'     => $this->accountId,
        ])->timeout(30);
    }

    /**
     * Build the MAC signature: MD5(merchant_id + account_id + amount + bill_number + secret_key)
     */
    protected function mac(string $billNumber, float|int $amount): string
    {
        $raw = $this->merchantId . $this->accountId . $amount . $billNumber . $this->secretKey;
        return md5($raw);
    }

    public function generateBill(array $payload): array
    {
        $billNumber  = (string) ($payload['bill_number'] ?? 'FF-' . strtoupper(uniqid()));
        $amount      = (float) $payload['amount'];
        $description = $payload['description'] ?? 'FastFood Order #' . ($payload['order_id'] ?? '');
        $expiresAt   = now()->addHours(2)->toIso8601String();
        $mac         = $this->mac($billNumber, $amount);
        $currency    = strtoupper($this->currency);

        try {
            $response = $this->http->post($this->apiUrl . '/api/v1/bill/create', [
                'bill_number'   => $billNumber,
                'amount'        => $amount,
                'currency'      => $currency,
                'description'   => $description,
                'expiry_date'   => $expiresAt,
                'mac'           => $mac,
            ]);

            if ($response->failed()) {
                Log::warning('ABA PayWay create-bill failed', [
                    'status'  => $response->status(),
                    'body'    => $response->body(),
                ]);
                throw new \RuntimeException(
                    'ABA PayWay bill creation failed: ' . ($response->json('message') ?? $response->body())
                );
            }

            $data = $response->json();
            $rawMark = $this->assembleMark($data, $billNumber, $amount, $mac);

            $qrBase64 = $data['qr_image'] ?? $data['qr_code'] ?? null;
            if ($qrBase64 === null) {
                $qrRaw    = QrCode::format('png')->size(350)->margin(2)->generate($rawMark);
                $qrBase64 = base64_encode($qrRaw);
            } else {
                $qrBase64 = str_contains($qrBase64, 'base64,')
                    ? substr($qrBase64, strpos($qrBase64, 'base64,') + 7)
                    : $qrBase64;
            }

            return [
                'qr_base64'      => $qrBase64,
                'khqr_reference' => $data['bill_number'] ?? $billNumber,
                'bill_number'    => $data['bill_number'] ?? $billNumber,
                'expires_at'     => $data['expiry_date'] ?? $expiresAt,
                'raw'            => array_merge($data, ['mark' => $rawMark]),
            ];
        } catch (\Throwable $e) {
            Log::warning('ABA PayWay gateway failed, falling back to local mark: ' . $e->getMessage());

            $amountKhr = (int) round($amount);
            $markData  = \App\Services\Khqr\KhqrService::buildMark([
                'amountKhr'   => $amountKhr,
                'billNumber'  => $billNumber,
                'merchant'    => config('khqr.bakong.merchant_name', 'FastFood KH'),
                'city'        => config('khqr.bakong.merchant_city', 'Phnom Penh'),
                'bankCode'    => config('khqr.aba_payway.bank_code', config('khqr.bakong.bank_code', '002')),
                'accountId'   => config('khqr.aba_payway.account_id', config('khqr.bakong.merchant_account', '')),
                'currency'    => $currency,
                'expiryDate'  => date('Ymd', strtotime($expiresAt)),
            ]);
            $rawMark = $markData['mark'];

            $qrRaw    = QrCode::format('png')->size(350)->margin(2)->generate($rawMark);
            $qrBase64 = base64_encode($qrRaw);

            return [
                'qr_base64'      => $qrBase64,
                'khqr_reference' => $billNumber,
                'bill_number'    => $billNumber,
                'expires_at'     => $expiresAt,
                'raw'            => ['mark' => $rawMark, 'fallback' => true],
            ];
        }
    }

    /**
     * Reconstruct the full EMVCo mark from the ABA PayWay bill-create response.
     * The mk2Qr field contains the QR payload (base64url or hex); billNumber,
     * mk2AcquirerId, mk2PaymentCode and the MAC fill out the full OB1 tag set.
     */
    private function assembleMark(array $data, string $billNumber, float|int $amount, string $mac): string
    {
        $acqId   = (string) ($data['mk2AcquirerId'] ?? $this->bankCode ?? '002');
        $payCode = (string) ($data['mk2PaymentCode'] ?? '0000');

        $tags  = "00"
               . self::tlv('29', '02')           // BAH – credit direction
               . self::tlv('30', $acqId . $payCode) // BAC – merchant account (bank + payment code)
               . self::tlv('31', strtoupper(config('khqr.bakong.merchant_name', 'FastFood KH')))
               . self::tlv('32', strtoupper(config('khqr.bakong.merchant_city',  'Phnom Penh')))
               . self::tlv('52', $billNumber)
               . self::tlv('53', strtoupper($this->currency) . str_pad((string) round($amount), 12, '0', STR_PAD_LEFT))
               . self::tlv('59', date('Ymd', time() + 7200));

        $sha256 = hash('sha256', $tags);
        $crc    = self::crc16ccitt($tags);

        return $tags
             . self::tlv('80', 'CRC')
             . self::tlv('81', strtoupper(dechex($crc)))
             . self::tlv('98', $sha256)
             . self::tlv('99', dechex(strlen($sha256)));
    }

    /**
     * Build a Bakong-style TLV tag: <hex-tag><hex-len><value>
     */
    private static function tlv(string $tag, string $value): string
    {
        return $tag . dechex(strlen($value)) . $value;
    }

    /**
     * CRC-16/CCITT (X.25) – init 0xFFFF, poly 0x1021, no input/output reflection.
     */
    private static function crc16ccitt(string $data): int
    {
        $crc = 0xFFFF;
        $len = strlen($data);
        for ($i = 0; $i < $len; $i++) {
            $crc ^= ord($data[$i]) << 8;
            for ($j = 0; $j < 8; $j++) {
                $crc = ($crc & 0x8000) ? (($crc << 1) ^ 0x1021) : ($crc << 1);
            }
        }
        return $crc & 0xFFFF;
    }

    public function getStatus(string $reference): array
    {
        try {
            $response = $this->http->get($this->apiUrl . '/api/v1/bill/status', [
                'bill_number' => $reference,
            ]);

            if ($response->failed()) {
                Log::warning('ABA PayWay status-check failed', [
                    'bill_number' => $reference,
                    'status'      => $response->status(),
                ]);
                return ['status' => 'pending', 'message' => 'Unable to query gateway', 'raw' => []];
            }

            $data     = $response->json();
            $raw      = strtolower($data['payment_status'] ?? $data['status'] ?? 'pending');
            $status   = match ($raw) {
                'paid', 'success', 'completed', 'settled' => 'paid',
                'pending', 'processing', 'waiting'        => 'pending',
                'failed', 'cancelled', 'expired'           => 'failed',
                'refunded'                                  => 'refunded',
                default                                    => 'pending',
            };

            return [
                'status'     => $status,
                'paid_at'    => $data['paid_at'] ?? $data['payment_date'] ?? null,
                'message'    => $data['message'] ?? null,
                'raw'        => $data,
            ];
        } catch (\Throwable $e) {
            Log::error('ABA PayWay status exception: ' . $e->getMessage());
            return ['status' => 'pending', 'message' => $e->getMessage(), 'raw' => []];
        }
    }

    public function refund(string $reference, ?float $amount = null): array
    {
        try {
            $payload = ['bill_number' => $reference];
            if ($amount !== null) {
                $payload['amount'] = $amount;
            }

            $response = $this->http->post($this->apiUrl . '/api/v1/bill/refund', $payload);

            if ($response->failed()) {
                Log::warning('ABA PayWay refund failed', ['bill_number' => $reference]);
                return ['status' => 'failed', 'message' => $response->json('message', 'Refund failed'), 'raw' => []];
            }

            return ['status' => 'refunded', 'message' => 'Refund successful', 'raw' => $response->json()];
        } catch (\Throwable $e) {
            Log::error('ABA PayWay refund exception: ' . $e->getMessage());
            return ['status' => 'failed', 'message' => $e->getMessage(), 'raw' => []];
        }
    }
}
