<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('merchant_code')->nullable()->after('qr_reference');
            $table->string('bank_code')->nullable()->after('merchant_code');
            $table->string('khqr_reference')->nullable()->after('bank_code');
            $table->string('khqr_md5')->nullable()->after('khqr_reference');
            $table->integer('khqr_amount')->nullable()->after('khqr_md5');
            $table->string('khqr_currency')->default('KHR')->after('khqr_amount');
            $table->string('khqr_bill_number')->nullable()->after('khqr_currency');
            $table->timestamp('khqr_expires_at')->nullable()->after('khqr_bill_number');
            $table->json('khqr_metadata')->nullable()->after('khqr_expires_at');
            $table->string('gateway_provider')->default('aba_payway')->after('khqr_metadata');
            $table->string('gateway_message')->nullable()->after('gateway_provider');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'merchant_code',
                'bank_code',
                'khqr_reference',
                'khqr_md5',
                'khqr_amount',
                'khqr_currency',
                'khqr_bill_number',
                'khqr_expires_at',
                'khqr_metadata',
                'gateway_provider',
                'gateway_message',
            ]);
        });
    }
};
