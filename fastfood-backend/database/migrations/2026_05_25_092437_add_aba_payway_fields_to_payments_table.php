<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('aba_payway_transaction_id', 100)->unique()->nullable();
            $table->decimal('aba_payway_amount', 10, 2)->nullable();
            $table->string('aba_payway_currency', 3)->nullable();
            $table->string('aba_payway_status', 50)->nullable();
            $table->text('aba_payway_extra_data')->nullable();
            $table->timestamp('aba_payway_created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['aba_payway_transaction_id', 'aba_payway_amount', 'aba_payway_currency', 'aba_payway_status', 'aba_payway_extra_data', 'aba_payway_created_at']);
        });
    }
};
