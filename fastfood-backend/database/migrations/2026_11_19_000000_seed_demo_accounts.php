<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Inserts/updates demo admin and customer accounts in production.
     */
    public function up(): void
    {
        // 1. Admin Demo Account
        User::updateOrCreate(
            ['email' => 'admin@fastfood.demo'],
            [
                'name'              => 'Demo Admin',
                'email'             => 'admin@fastfood.demo',
                'password'          => Hash::make('Admin123!'),
                'role'              => 'admin',
                'phone'             => '012345678',
                'address'           => 'FastFood HQ, Phnom Penh',
                'is_blocked'        => false,
                'email_verified_at' => now(),
            ]
        );

        // 2. Customer Demo Account
        User::updateOrCreate(
            ['email' => 'customer@fastfood.demo'],
            [
                'name'              => 'Demo Customer',
                'email'             => 'customer@fastfood.demo',
                'password'          => Hash::make('Customer123!'),
                'role'              => 'customer',
                'phone'             => '098765432',
                'address'           => 'St 271, Phnom Penh',
                'is_blocked'        => false,
                'email_verified_at' => now(),
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        User::whereIn('email', [
            'admin@fastfood.demo',
            'customer@fastfood.demo',
        ])->delete();
    }
};
