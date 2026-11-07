<?php

$frontendUrl = env('FRONTEND_URL');
$corsOrigins = array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', ''))));

$defaultOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
];

if (!empty($frontendUrl)) {
    $defaultOrigins[] = rtrim($frontendUrl, '/');
}

$allowedOrigins = array_values(array_unique(array_filter(array_merge($defaultOrigins, $corsOrigins))));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [
        '~^http://localhost:\d+$~',
        '~^http://127\.0\.0\.1:\d+$~',
        '~^https://.*\.vercel\.app$~',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
