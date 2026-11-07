<?php

namespace App\Services\Khqr;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

/**
 * KhqrService â€” "image in the folder" for Bakong KHQR payments
 *
 * Generates an EMVCo OB1 mark string using the Bakong KHQR spec,
 * renders it to a PNG via simple-qrcode, and saves it to
 *   storage/app/public/payments/{order_id}.png
 *
 * The same PNG base64 is returned in the JSON response so the
 * frontend can display it immediately without a second HTTP fetch.
 */
class KhqrService
{
    /**
     * Bank code â†’ display name map
     * @var array<string,string>
     */
    public const BANKS = [
        '001' => 'ACLEDA',
        '002' => 'ABA',
        '009' => 'WING',
    ];

    /**
     * Resolve a bank display name from a bank code (falls back to ABA).
     */
    public static function bankName(string $code): string
    {
        return self::BANKS[$code] ?? 'ABA';
    }

    /**
     * Build a Bakong / ABA KHQR OB1 mark string.
     *
     * OB1 v1 spec:
     *   BAH.tag00 = "000201"                     OB1 version
     *   BAH.tag29 = "02"                         Credit direction
     *   BAH.tag30 = 32-char hex                  Merchant Account (bankCode + accountId)
     *   BAC.tag31 = 16-char padded merchantName
     *   BAC.tag32 = 8-char  padded merchantCity
     *   BAC.tag52 = billNumber
     *   BAC.tag53 = currency + 0-padded amount   e.g. "KHR00000024500"
     *   BAC.tag59 = expiry YYYYMMDD
     *   BAC.tag98 = SHA-256(TLV-body, no CRC)    64-char hex
     *   BAC.tag99 = length of SHA-256 string
     *   BAC.tag80 = "CRC"
     *   BAC.tag81 = 4-char CRC-16/CCITT of TLV body
     *
     * @param  array{orderId:string, amountKhr:int, billNumber:string,
     *               merchantName:string, merchantCity:string,
     *               bankCode:string, accountId:string, currency:string}
     * @return array{mark:string, sha256:string, crc:string}
     */
    public static function buildMark(array $p): array
    {
        $expiry       = $p['expiryDate'] ?? date('Ymd', time() + 7200);
        $merchant     = strtoupper(substr($p['merchantName'] ?? 'MERCHANT', 0, 16));
        $city         = strtoupper(substr($p['merchantCity'] ?? 'PHNOM PENH', 0, 8));
        $bill         = substr($p['billNumber'], 0, 37);
        $currency     = strtoupper($p['currency'] ?? 'KHR');
        $amountPadded = str_pad((string)$p['amountKhr'], 12, '0', STR_PAD_LEFT); // "000000024500"

        // 32-char hex merchant account  â†’  bankCode + accountId, right-padded with 0
        $acct = $p['bankCode'] . ($p['accountId'] ?? '');
        $merchantAcctHex = substr(str_pad($acct, 34, '0', STR_PAD_LEFT), 0, 32);

        // TLV body without the CRC tag (used for SHA-256 + CRC-16 computation)
        $tlv = self::tag('00', '000201')
             . self::tag('29', '02')                                  // BAH
             . self::tag('30', $merchantAcctHex)                      // BAC â†’ merchant account
             . self::tag('31', $merchant)
             . self::tag('32', $city)
             . self::tag('52', $bill)
             . self::tag('53', $currency . $amountPadded)
             . self::tag('59', $expiry);

        // SHA-256 over ASCII bytes of the TLV body
        $sha256 = hash('sha256', $tlv);
        $hexLen = dechex(strlen($sha256));              // usually "40" (64 hex chars)

        // CRC-16-CCITT (X.25) over the TLV body
        $crc = self::crc16ccitt($tlv);

        // Rebuild body including the CRC candidate so it is self-contained:
        $bodyWithCrc = $tlv
                     . self::tag('80', 'CRC')
                     . self::tag('81', strtoupper(dechex($crc)))
                     . self::tag('98', $sha256)
                     . self::tag('99', $hexLen);

        $mark = $bodyWithCrc;

        return [
            'mark'    => $mark,      // raw EMVCo OB1
            'sha256'  => $sha256,
            'crc'     => strtoupper(dechex($crc)),
        ];
    }

    /**
     * Render the raw mark string to a PNG and save it under
     * storage/app/public/payments/{orderId}/qr.png
     *
     * @return array{path:string, base64:string, uri:string}
     */
    public static function renderImage(string $mark, string $orderId): array
    {
        $dir  = storage_path("app/public/payments/{$orderId}");
        $path = "{$dir}/qr.png";

        // Generate PNG from the raw mark string (simple-qrcode â†’ PNG stream)
        QrCode::format('png')
              ->size(340)
              ->margin(2)
              ->generate($mark, $path);

        $base64 = base64_encode(file_get_contents($path));
        $uri    = "/storage/payments/{$orderId}/qr.png";

        return ['path' => $path, 'base64' => $base64, 'uri' => $uri];
    }

    /**
     * Handle webhook callback for Bakong KHQR.
     * This is a placeholder for Bakong webhook handling.
     * In a real implementation, you would verify the signature and update the payment.
     *
     * @param  array  $data  Parsed JSON payload from webhook
     * @return void
     */
    public function handleWebhook(array $data)
    {
        // For now, we just log the webhook data for Bakong.
        // In a real implementation, you would update the payment record.
        Log::info('Bakong KHQR webhook received', $data);
    }

    // â”€â”€â”€ Private helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Build a Bakong TLV entry:  <tag-hex><len-hex><value-bytes>
     */
    private static function tag(string $tag, string $value): string
    {
        $len = dechex(strlen($value));
        return $tag . $len . $value;
    }

    /**
     * CRC-16 / CCITT (X.25) â€” poly 0x1021, init 0xFFFF, no reflection.
     * Returns an integer in the range 0â€“65535.
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
}