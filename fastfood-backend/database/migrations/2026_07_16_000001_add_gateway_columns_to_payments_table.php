<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the canonical payment-gateway columns requested by the integration:
 *   payment_provider, currency, payment_reference, qr_code,
 *   payment_url, response_data (JSON)
 *
 * These sit alongside the existing KHQR/ABA-specific columns and are
 * provider-agnostic so the WebhookController / PaymentService can record
 * any gateway uniformly.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Which gateway handled this payment (e.g. aba_payway, bakong, stripe).
            $table->string('payment_provider')->nullable()->after('payment_method');

            // ISO currency code (USD, KHR, ...).
            $table->string('currency', 3)->nullable()->after('amount');

            // Gateway-side reference / bill number used for lookups & idempotency.
            $table->string('payment_reference')->nullable()->after('transaction_id');

            // Rendered QR code (data-URI or path) if the provider supports QR.
            $table->text('qr_code')->nullable()->after('payment_reference');

            // Hosted payment page URL for redirect-based providers.
            $table->string('payment_url')->nullable()->after('qr_code');

            // Full raw provider response (JSON) for auditing / debugging.
            $table->json('response_data')->nullable()->after('payment_url');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'payment_provider',
                'currency',
                'payment_reference',
                'qr_code',
                'payment_url',
                'response_data',
            ]);
        });
    }
};
