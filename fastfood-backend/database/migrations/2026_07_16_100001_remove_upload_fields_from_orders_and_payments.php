<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('receipt_image');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('payment_screenshot');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('receipt_image')->nullable()->after('notes');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('payment_screenshot')->nullable()->after('transaction_id');
        });
    }
};
