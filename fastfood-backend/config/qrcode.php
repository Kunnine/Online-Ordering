<?php
/**
 * simple-qrcode / BaconQrCode configuration
 *
 * IMPORTANT: QR_BACKEND is now set in .env — this file is the fallback
 * when the package publishes its own config.  We always force 'gd' here
 * because Imagick is not installed in this WAMP environment.
 */
return [

    /*
    |--------------------------------------------------------------------------
    | QR Code Backend
    |--------------------------------------------------------------------------
    |
    | This package currently supports "gd" and "imagick" image backends
    | for creating QR codes.  Both backends are optional, with GD being
    | the default.
    |
    | Supported: gd, imagick
    |
    */
    'backend' => env('QR_BACKEND', 'gd'),

    /*
    |--------------------------------------------------------------------------
    | QR Code Defaults
    |--------------------------------------------------------------------------
    */
    'size'   => 200,
    'margin' => 0,

];
