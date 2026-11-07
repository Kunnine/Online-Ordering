<?php

return [

    /*
    |--------------------------------------------------------------------------
    | KHQR Default Provider
    |--------------------------------------------------------------------------
    |
    | Supported: aba_payway, bakong
    |
    | Bakong is the National Bank of Cambodia's official KHQR specification.
    | Register at https://developer.bakong.com.kh/ to get your API token
    | and merchant account credentials.
    |
    | When the Bakong API is unreachable, the system falls back to generating
    | a compliant TLV-encoded mark locally so development does not crash.
    |
    */
    'default'          => env('KHQR_PROVIDER', 'bakong'),

    /*
    |--------------------------------------------------------------------------
    | ABA PayWay credentials
    |--------------------------------------------------------------------------
    */
    'aba_payway' => [
        'merchant_id'  => env('ABA_PAYWAY_MERCHANT_ID', ''),
        'account_id'   => env('ABA_PAYWAY_ACCOUNT_ID', ''),
        'secret_key'   => env('ABA_PAYWAY_SECRET_KEY', ''),
        'api_url'      => env('ABA_PAYWAY_API_URL', 'https://api.abapayway.com.kh'),
        'currency'     => env('ABA_PAYWAY_CURRENCY', 'KHR'),
        'bank_code'    => env('ABA_PAYWAY_BANK_CODE', '002'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Bakong KHQR credentials
    |--------------------------------------------------------------------------
    |
    | Bakong is the National Bank of Cambodia's KHQR specification.
    | Register at https://developer.bakong.com.kh/
    |
    | Required env vars:
    |   BAKONG_API_URL           — Sandbox: https://api-bakong.nbc.gov.kh
    |                               Production: https://api.bakong.nbc.gov.kh
    |   BAKONG_API_TOKEN         — Bearer token from Bakong developer portal
    |   BAKONG_MERCHANT_ACCOUNT  — Bank code + account number (e.g. 010161254)
    |   BAKONG_BANK_CODE         — 3-char bank code (001 ACLEDA, 002 ABA, 009 Wing)
    |
    | Optional:
    |   BAKONG_CURRENCY          — Default KHR
    |   BAKONG_MERCHANT_NAME     — Default FastFood KH
    |   BAKONG_MERCHANT_CITY     — Default Phnom Penh
    |
    */
    'bakong' => [
        'api_url'          => env('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh'),
        'api_token'        => env('BAKONG_API_TOKEN', ''),
        'merchant_account' => env('BAKONG_MERCHANT_ACCOUNT', ''),    // e.g. "010161254"
        'bank_code'        => env('BAKONG_BANK_CODE', '002'),         // e.g. "001" ACLEDA, "002" ABA, "009" Wing
        'merchant_name'    => env('BAKONG_MERCHANT_NAME', 'FastFood KH'),
        'merchant_city'    => env('BAKONG_MERCHANT_CITY', 'Phnom Penh'),
        'currency'         => env('BAKONG_CURRENCY', 'KHR'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Webhook / Callback security
    |--------------------------------------------------------------------------
    */
    'webhook' => [
        /*
         * Shared secret used to sign / verify incoming payment callbacks.
         */
        'secret' => env('KHQR_WEBHOOK_SECRET', env('APP_KEY', '')),

        /*
         * Absolute URL where the bank posts payment notifications.
         * Must be publicly reachable by Bakong servers.
         */
        'callback_url' => env('KHQR_CALLBACK_URL', env('APP_URL', 'http://localhost') . '/payment/khqr-callback'),
    ],

];
