<?php

use Illuminate\Support\Facades\Route;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;

Route::get('/debug/stats', function () {
    try {
        $totalOrders = Order::count();
        return response()->json(['total_orders' => $totalOrders]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

Route::get('/debug/order-status', function () {
    try {
        $order = Order::first();
        if ($order) {
            return response()->json([
                'status' => $order->status,
                'order_status' => $order->order_status,
                'attributes' => $order->getAttributes()
            ]);
        }
        return response()->json(['message' => 'No orders found']);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});
