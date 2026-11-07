<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'payment_method',
        'payment_provider',
        'status',
        'amount',
        'currency',
        'transaction_id',
        'payment_reference',
        'qr_code',
        'payment_url',
        'response_data',
        'qr_reference',
        'paid_at',
        'gateway_provider',
        'gateway_message',
        'merchant_code',
        'bank_code',
        'khqr_reference',
        'khqr_md5',
        'khqr_amount',
        'khqr_currency',
        'khqr_bill_number',
        'khqr_expires_at',
        'khqr_metadata',
        'khqr_mark',
        'qr_image_uri',
        'qr_image_path',
        'qr_image_base64',
        // ABA PayWay specific fields
        'aba_payway_transaction_id',
        'aba_payway_amount',
        'aba_payway_currency',
        'aba_payway_status',
        'aba_payway_extra_data',
        'aba_payway_created_at',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
        'aba_payway_created_at' => 'datetime',
        'aba_payway_extra_data' => 'array',
        'response_data' => 'array',
        'khqr_metadata' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
