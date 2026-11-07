<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * AdminTransactionController — browser-facing transaction management.
 *
 * All routes use the web middleware group (auth + session), returning
 * Blade views from resources/views/admin/transactions/*.blade.php
 */
class AdminTransactionController extends Controller
{
    /**
     * GET /admin/transactions
     *
     * Returns the transaction list view.
     */
    public function index(Request $request)
    {
        $query = Order::with(['user', 'items.product', 'payment'])
            ->orderByDesc('created_at');

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }
        if ($request->filled('order_status')) {
            $query->where('order_status', $request->order_status);
        }
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('payment', fn ($q2) => $q2->where('khqr_reference', 'like', "%{$search}%")
                                                      ->orWhere('transaction_id', 'like', "%{$search}%"))
                  ->orWhereHas('user', fn ($q2) => $q2->where('name', 'like', "%{$search}%"));
            });
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $transactions = $query->paginate(20)->withQueryString();
        $stats        = $this->stats();

        return view('admin.transactions.index', [
            'transactions'   => $transactions,
            'stats'          => $stats,
            'filters'        => $request->only(['payment_status', 'order_status', 'payment_method', 'search', 'date_from', 'date_to']),
        ]);
    }

    /**
     * GET /admin/transactions/{id}
     *
     * Returns the transaction detail view.
     */
    public function show(int $id)
    {
        $order = Order::with(['user', 'items.product', 'payment'])->findOrFail($id);
        return view('admin.transactions.show', ['order' => $order]);
    }

    /**
     * POST /admin/transactions/{id}/approve
     *
     * Approves a KHQR payment verification.
     */
    public function approve(int $id)
    {
        $order = Order::with('payment')->findOrFail($id);

        if ($order->order_status !== 'waiting_verification') {
            return redirect()->back()
                ->with('error', "Cannot approve. Order status is '{$order->order_status}'.");
        }

        $order->update([
            'payment_status' => 'paid',
            'order_status'   => 'preparing',
        ]);
        $order->payment->update([
            'status'         => 'paid',
            'paid_at'        => now(),
            'transaction_id' => 'ADMIN-' . strtoupper(uniqid()),
        ]);

        return redirect()
            ->route('admin.transactions.show', $id)
            ->with('success', 'Payment approved! Order confirmed.');
    }

    /**
     * POST /admin/transactions/{id}/reject
     *
     * Rejects a KHQR payment and cancels the order.
     */
    public function reject(int $id)
    {
        $order = Order::with('payment')->findOrFail($id);

        $order->update([
            'payment_status' => 'rejected',
            'order_status'   => 'cancelled',
        ]);
        $order->payment->update([
            'status'         => 'failed',
            'gateway_message'=> 'Rejected by admin',
        ]);

        return redirect()
            ->route('admin.transactions.show', $id)
            ->with('error', 'Payment rejected. Order cancelled.');
    }

    /**
     * POST /admin/transactions/{id}/status
     *
     * Updates order status (delivery progress).
     */
    public function updateStatus(int $id, Request $request)
    {
        $order = Order::with('payment')->findOrFail($id);
        $valid = $request->validate([
            'order_status' => 'required|in:pending,waiting_verification,confirmed,preparing,ready,delivered,cancelled',
        ]);

        $order->update(['order_status' => $valid['order_status']]);

        return redirect()
            ->route('admin.transactions.show', $id)
            ->with('success', 'Order status updated.');
    }

    // ── Stats helper ────────────────────────────────────────────────────────

    protected function stats(): array
    {
        return [
            'total_qr_payments'       => Payment::where('payment_method', 'qr_payment')->count(),
            'paid_qr_payments'        => Payment::where('payment_method', 'qr_payment')->where('status', 'paid')->count(),
            'pending_qr_payments'     => Payment::where('payment_method', 'qr_payment')->where('status', 'pending')->count(),
            'failed_qr_payments'      => Payment::where('payment_method', 'qr_payment')->where('status', 'failed')->count(),
            'awaiting_verification'   => Order::where('order_status', 'waiting_verification')->count(),
            'total_revenue_khr'       => Order::where('payment_status', 'paid')->sum('total_amount'),
            'total_revenue_usd'       => Order::where('payment_status', 'paid')->sum('total_amount') / 4100,
            'total_transactions'      => Order::count(),
        ];
    }
}
