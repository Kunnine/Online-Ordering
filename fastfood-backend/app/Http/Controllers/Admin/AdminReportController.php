<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Payment;
use App\Models\OrderItem;
use Illuminate\Http\Request;

class AdminReportController extends Controller
{
    public function overview()
    {
        $totalRevenue       = Order::where('order_status', 'delivered')->sum('total_amount');
        $totalOrders        = Order::count();
        $totalCustomers     = User::where('role', 'customer')->count();
        $totalProducts      = Product::count();

        $pendingOrders      = Order::where('order_status', 'pending')->count();
        $waitingVerification = Order::where('order_status', 'waiting_verification')->count();
        $preparingOrders    = Order::whereIn('order_status', ['confirmed', 'preparing'])->count();
        $deliveredOrders    = Order::where('order_status', 'delivered')->count();
        $cancelledOrders    = Order::where('order_status', 'cancelled')->count();

        // QR Payment specific stats
        $qrPaymentStats = Payment::where('payment_method', 'qr_payment')
            ->selectRaw('status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount')
            ->groupBy('status')
            ->get();

        $qrTotal          = $qrPaymentStats->where('status', 'paid')->sum('total_amount');
        $qrPendingCount   = $qrPaymentStats->where('status', 'pending')->sum('count');
        $qrPaidCount      = $qrPaymentStats->where('status', 'paid')->sum('count');
        $qrFailedCount    = $qrPaymentStats->where('status', 'failed')->sum('count');

        // Payment method breakdown
        $paymentMethodBreakdown = Order::selectRaw('payment_method, COUNT(*) as count, SUM(total_amount) as total')
            ->groupBy('payment_method')
            ->get();

        return response()->json([
            'total_revenue'           => $totalRevenue,
            'total_orders'            => $totalOrders,
            'total_customers'         => $totalCustomers,
            'total_products'          => $totalProducts,
            'pending_orders'          => $pendingOrders,
            'waiting_verification'    => $waitingVerification,
            'preparing_orders'        => $preparingOrders,
            'delivered_orders'        => $deliveredOrders,
            'cancelled_orders'        => $cancelledOrders,
            // QR payment stats
            'qr_total_revenue'        => (float) $qrTotal,
            'qr_payments_paid'        => $qrPaidCount,
            'qr_payments_pending'     => $qrPendingCount,
            'qr_payments_failed'      => $qrFailedCount,
            'qr_payment_breakdown'    => $qrPaymentStats,
            'payment_method_breakdown'=> $paymentMethodBreakdown,
        ]);
    }

    public function salesByDay(Request $request)
    {
        $days = $request->days ?? 7;

        $sales = Order::where('order_status', 'delivered')
            ->where('created_at', '>=', now()->subDays($days))
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json($sales);
    }

    public function salesByMonth()
    {
        $sales = Order::where('order_status', 'delivered')
            ->where('created_at', '>=', now()->subMonths(12))
            ->selectRaw('YEAR(created_at) as year, MONTH(created_at) as month, SUM(total_amount) as revenue, COUNT(*) as orders')
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                $item->label = date('M Y', mktime(0, 0, 0, $item->month, 1, $item->year));
                return $item;
            });

        return response()->json($sales);
    }

    public function topProducts(Request $request)
    {
        $limit = $request->limit ?? 10;

        $products = OrderItem::selectRaw('product_id, SUM(quantity) as total_sold, SUM(subtotal) as total_revenue')
            ->with('product.category')
            ->groupBy('product_id')
            ->orderBy('total_sold', 'desc')
            ->take($limit)
            ->get();

        return response()->json($products);
    }

    public function topCustomers(Request $request)
    {
        $limit = $request->limit ?? 10;

        $customers = Order::selectRaw('user_id, COUNT(*) as total_orders, SUM(total_amount) as total_spent')
            ->with('user')
            ->where('order_status', 'delivered')
            ->groupBy('user_id')
            ->orderBy('total_spent', 'desc')
            ->take($limit)
            ->get();

        return response()->json($customers);
    }

    public function ordersByStatus()
    {
        $totalOrders = Order::count();

        // Build a row for every possible order status so the UI never shows a missing step
        $orderRows = collect([
            'pending',
            'waiting_verification',
            'confirmed',
            'preparing',
            'ready',
            'delivered',
            'cancelled',
        ])->map(function ($status) use ($totalOrders) {
            $count = Order::where('order_status', $status)->count();
            return [
                'status'          => $status,
                'count'           => $count,
                'percentage'      => $totalOrders > 0 ? round($count / $totalOrders * 100, 1) : 0,
            ];
        });

        // Payment status breakdown
        $paymentRows = collect(['paid', 'pending', 'rejected', 'failed'])->map(function ($status) {
            $count = Order::where('payment_status', $status)->count();
            return [
                'status'          => $status,
                'count'           => $count,
                'payment_method'  => true,
            ];
        });

        return response()->json([
            'total_orders'       => $totalOrders,
            'order_statuses'     => $orderRows,
            'payment_statuses'   => $paymentRows,
        ]);
    }

    // QR Payment specific report
    public function qrPaymentReport()
    {
        $payments = Payment::where('payment_method', 'qr_payment')
            ->with(['order' => function ($q) {
                $q->with('user', 'items.product');
            }])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'qr_payments' => $payments->items(),
            'pagination'  => [
                'total'        => $payments->total(),
                'per_page'     => $payments->perPage(),
                'current_page' => $payments->currentPage(),
                'last_page'    => $payments->lastPage(),
            ],
        ]);
    }

    public function recentOrders()
    {
        $orders = Order::with('user', 'items.product', 'payment')
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        return response()->json($orders);
    }
}