<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function stats()
    {
        try {
            $totalOrders     = Order::count();
            $totalRevenue    = Order::where('order_status', 'delivered')
                ->sum('total_amount');
            $totalProducts   = Product::count();
            $totalCustomers  = User::where('role', 'customer')->count();

            // QR Payment stats
            $totalQrPayments   = Payment::where('payment_method', 'qr_payment')->count();
            $qrPaymentsPaid    = Payment::where('payment_method', 'qr_payment')->where('status', 'paid')->count();
            $qrPaymentsPending = Payment::where('payment_method', 'qr_payment')->where('status', 'pending')->count();
            $qrPaymentsFailed  = Payment::where('payment_method', 'qr_payment')->where('status', 'failed')->count();

            // QR revenue (sum of order totals for paid QR orders)
            $qrTotalRevenue    = Order::where('payment_method', 'qr_payment')
                                      ->where('payment_status', 'paid')
                                      ->sum('total_amount');

            // Orders needing verification
            $awaitingVerification = Order::where('order_status', 'waiting_verification')->count();

            $recentOrders = Order::with('user', 'items.product')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get();

            $ordersByStatus = Order::selectRaw('order_status as status, count(*) as count')
                ->groupBy('order_status')
                ->get();

            $paymentStatusBreakdown = Order::selectRaw('payment_status as status, count(*) as count')
                ->groupBy('payment_status')
                ->get();

            $topProducts = Product::withCount('orderItems')
                ->orderBy('order_items_count', 'desc')
                ->take(5)
                ->get();

            return response()->json([
                'stats' => [
                    'total_orders'            => $totalOrders,
                    'total_revenue'           => (float) $totalRevenue,
                    'total_products'          => $totalProducts,
                    'total_customers'         => $totalCustomers,
                    'total_qr_payments'       => $totalQrPayments,
                    'qr_payments_paid'        => $qrPaymentsPaid,
                    'qr_payments_pending'     => $qrPaymentsPending,
                    'qr_payments_failed'      => $qrPaymentsFailed,
                    'qr_total_revenue'        => (float) $qrTotalRevenue,
                    'awaiting_verification'   => $awaitingVerification,
                ],
                'recent_orders'            => $recentOrders,
                'orders_by_status'         => $ordersByStatus,
                'payment_status_breakdown' => $paymentStatusBreakdown,
                'top_products'             => $topProducts,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Failed to load stats',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}