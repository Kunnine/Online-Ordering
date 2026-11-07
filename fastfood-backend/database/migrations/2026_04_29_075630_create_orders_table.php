<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->decimal('total_amount', 10, 2);
            $table->enum('payment_method', ['cash', 'qr_payment']);
            $table->enum('payment_status', ['unpaid', 'pending', 'paid', 'rejected'])
                ->default('unpaid');
            $table->enum('order_status', [
                'pending',
                'waiting_verification',
                'confirmed',
                'preparing',
                'ready',
                'delivered',
                'cancelled'
            ])->default('pending');
            $table->string('receipt_image')->nullable();
            $table->text('delivery_address');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
