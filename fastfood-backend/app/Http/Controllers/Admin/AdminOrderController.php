<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Events\OrderStatusUpdated;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with('user', 'items.product', 'payment')
            ->orderByDesc('created_at');

        if ($request->payment_method) {
            $query->where('payment_method', $request->payment_method);
        }
        if ($request->order_status) {
            $query->where('order_status', $request->order_status);
        }
        if ($request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('id', $request->search)
                  ->orWhereHas('user', function ($q2) use ($request) {
                      $q2->where('name', 'like', '%' . $request->search . '%')
                        ->orWhere('email', 'like', '%' . $request->search . '%');
                  });
            });
        }

        $perPage = $request->per_page ?? 20;
        $orders = $query->paginate($perPage);

        return response()->json($orders);
    }

    public function show($id)
    {
        $order = Order::with('user', 'items.product', 'payment')
            ->findOrFail($id);
        return response()->json($order);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'order_status' => 'required|in:pending,waiting_verification,confirmed,preparing,ready,delivered,cancelled',
        ]);

        return DB::transaction(function () use ($request, $id) {
            $order = Order::with(['items.product', 'payment', 'user'])->findOrFail($id);
            $oldStatus = $order->order_status;
            $newStatus = $request->order_status;

            $order->update(['order_status' => $newStatus]);

            // Automatic stock replenishment when cancelled
            if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
                foreach ($order->items as $item) {
                    if ($item->product && $item->product->track_stock) {
                        $item->product->increment('stock', $item->quantity);
                    }
                }
            } elseif ($oldStatus === 'cancelled' && $newStatus !== 'cancelled') {
                foreach ($order->items as $item) {
                    if ($item->product && $item->product->track_stock) {
                        $item->product->decrement('stock', $item->quantity);
                    }
                }
            }

            try {
                broadcast(new OrderStatusUpdated($order));
            } catch (\Throwable $e) {
                Log::warning('Broadcast failed in updateStatus: ' . $e->getMessage());
            }

            return response()->json([
                'message' => 'Order status updated.',
                'order'   => $order->fresh(['items.product', 'payment', 'user']),
            ]);
        });
    }

    public function updatePaymentStatus(Request $request, $id)
    {
        $request->validate([
            'payment_status' => 'required|in:unpaid,pending,paid,rejected',
        ]);

        return DB::transaction(function () use ($request, $id) {
            $order = Order::with(['items.product', 'payment', 'user'])->findOrFail($id);
            $newStatus = $request->payment_status;

            $order->update(['payment_status' => $newStatus]);

            if ($order->payment) {
                $paymentState = match ($newStatus) {
                    'paid'     => 'paid',
                    'rejected' => 'failed',
                    default    => 'pending',
                };

                $order->payment->update([
                    'status'  => $paymentState,
                    'paid_at' => $newStatus === 'paid' ? now() : null,
                ]);
            }

            try {
                broadcast(new OrderStatusUpdated($order));
            } catch (\Throwable $e) {
                Log::warning('Broadcast failed in updatePaymentStatus: ' . $e->getMessage());
            }

            return response()->json([
                'message' => 'Payment status updated successfully.',
                'order'   => $order->fresh(['items.product', 'payment', 'user']),
            ]);
        });
    }
}
