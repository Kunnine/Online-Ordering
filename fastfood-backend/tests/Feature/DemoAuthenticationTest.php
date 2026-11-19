<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DemoAuthenticationTest extends TestCase
{
    use RefreshDatabase;
    protected function setUp(): void
    {
        parent::setUp();

        // Ensure demo accounts exist
        User::updateOrCreate(
            ['email' => 'admin@fastfood.demo'],
            [
                'name'              => 'Demo Admin',
                'email'             => 'admin@fastfood.demo',
                'password'          => Hash::make('Admin123!'),
                'role'              => 'admin',
                'is_blocked'        => false,
                'email_verified_at' => now(),
            ]
        );

        User::updateOrCreate(
            ['email' => 'customer@fastfood.demo'],
            [
                'name'              => 'Demo Customer',
                'email'             => 'customer@fastfood.demo',
                'password'          => Hash::make('Customer123!'),
                'role'              => 'customer',
                'is_blocked'        => false,
                'email_verified_at' => now(),
            ]
        );
    }

    public function test_admin_demo_login_succeeds_with_correct_credentials(): void
    {
        $response = $this->postJson('/api/login', [
            'email'    => 'admin@fastfood.demo',
            'password' => 'Admin123!',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'message',
                     'user' => ['id', 'name', 'email', 'role'],
                     'token',
                 ])
                 ->assertJsonPath('user.role', 'admin')
                 ->assertJsonPath('user.email', 'admin@fastfood.demo');
    }

    public function test_customer_demo_login_succeeds_with_correct_credentials(): void
    {
        $response = $this->postJson('/api/login', [
            'email'    => 'customer@fastfood.demo',
            'password' => 'Customer123!',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'message',
                     'user' => ['id', 'name', 'email', 'role'],
                     'token',
                 ])
                 ->assertJsonPath('user.role', 'customer')
                 ->assertJsonPath('user.email', 'customer@fastfood.demo');
    }

    public function test_invalid_password_returns_422(): void
    {
        $response = $this->postJson('/api/login', [
            'email'    => 'customer@fastfood.demo',
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    public function test_customer_cannot_access_admin_endpoints(): void
    {
        $customer = User::where('email', 'customer@fastfood.demo')->first();
        $token = $customer->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/admin/stats');

        $response->assertStatus(403);
    }

    public function test_admin_can_access_admin_endpoints(): void
    {
        $admin = User::where('email', 'admin@fastfood.demo')->first();
        $token = $admin->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/admin/stats');

        $response->assertStatus(200);
    }

    public function test_customer_can_access_customer_orders(): void
    {
        $customer = User::where('email', 'customer@fastfood.demo')->first();
        $token = $customer->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
                         ->getJson('/api/orders');

        $response->assertStatus(200);
    }
}
