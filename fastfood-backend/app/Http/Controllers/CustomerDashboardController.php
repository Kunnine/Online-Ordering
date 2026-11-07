<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;

class CustomerDashboardController extends Controller
{
    public function stats(Request $request)
    {
        $userId = $request->user()->id;

        $totalOrders = Order::where('user_id', $userId)->count();
        $totalSpent = Order::where('user_id', $userId)
            ->where('order_status', 'delivered')
            ->sum('total_amount');
        $deliveredOrders = Order::where('user_id', $userId)
            ->where('order_status', 'delivered')
            ->count();
        $pendingOrders = Order::where('user_id', $userId)
            ->whereIn('order_status', ['pending', 'waiting_verification', 'confirmed', 'preparing', 'ready'])
            ->count();

        $recentOrders = Order::where('user_id', $userId)
            ->with('items.product')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'total_orders' => $totalOrders,
            'total_spent' => (float) $totalSpent,
            'delivered_orders' => $deliveredOrders,
            'pending_orders' => $pendingOrders,
            'recent_orders' => $recentOrders,
        ]);
    }
}