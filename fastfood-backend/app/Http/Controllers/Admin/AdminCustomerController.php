<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Order;
use Illuminate\Http\Request;

class AdminCustomerController extends Controller
{
    // Get all customers
    public function index(Request $request)
    {
        $query = User::where('role', 'customer')
            ->withCount('orders')
            ->withSum('orders', 'total_amount')
            ->orderBy('created_at', 'desc');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name',  'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%')
                    ->orWhere('phone', 'like', '%' . $request->search . '%');
            });
        }

        return response()->json($query->get());
    }

    // Get single customer with orders
    public function show($id)
    {
        $customer = User::where('role', 'customer')
            ->withCount('orders')
            ->withSum('orders', 'total_amount')
            ->findOrFail($id);

        $orders = Order::where('user_id', $id)
            ->with('items.product')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'customer' => $customer,
            'orders'   => $orders,
        ]);
    }

    // Block or unblock customer
    public function toggleBlock($id)
    {
        $customer = User::where('role', 'customer')->findOrFail($id);
        $customer->update([
            'is_blocked' => !$customer->is_blocked,
        ]);

        return response()->json([
            'message'  => $customer->is_blocked ? 'Customer blocked.' : 'Customer unblocked.',
            'customer' => $customer,
        ]);
    }

    // Delete customer
    public function destroy($id)
    {
        $customer = User::where('role', 'customer')->findOrFail($id);
        $customer->delete();

        return response()->json(['message' => 'Customer deleted.']);
    }
}
