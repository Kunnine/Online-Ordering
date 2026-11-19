<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    /**
     * Seed the demo customer and demo admin accounts.
     * Passwords use Laravel's standard Bcrypt hashing.
     */
    public function run(): void
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
}
