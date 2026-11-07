<?php

namespace App\Services\Khqr;

use InvalidArgumentException;

/**
 * Factory: resolves the correct KHQR driver from config/env.
 *
 * Supported providers:
 *   aba_payway — default, uses ABA PayWay REST API
 *   bakong     — uses Bakong KHQR / National Bank of Cambodia API
 */
class KhqrFactory
{
    /**
     * @return KhqrDriver
     */
    public static function make(?string $provider = null): KhqrDriver
    {
        $provider = strtolower($provider ?: (string) config('khqr.default', env('KHQR_PROVIDER', 'aba_payway')));

        return match ($provider) {
            'aba_payway', 'aba', 'abapay', 'abapayway' => new AbapayService(),
            'bakong', 'bakong_khqr', 'nbc'              => new BakongService(),
            default => throw new InvalidArgumentException(
                "Unknown KHQR provider: '{$provider}'. Supported: aba_payway, bakong."
            ),
        };
    }
}
