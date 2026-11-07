<?php

namespace App\Services\Khqr;

/**
 * Driver contract for KHQR payment providers.
 */
interface KhqrDriver
{
    /**
     * Generate a KHQR bill for the given order.
     *
     * @return array{qr_base64:string, khqr_reference:string, bill_number?:string, expires_at?:string, raw:array}
     */
    public function generateBill(array $payload): array;

    /**
     * Query the payment status for a known reference / bill number.
     *
     * @return array{status:string, paid_at?:string, message?:string, raw:array}
     */
    public function getStatus(string $reference): array;

    /**
     * Refund a completed transaction.
     *
     * @return array{status:string, message?:string, raw:array}
     */
    public function refund(string $reference, ?float $amount = null): array;
}
