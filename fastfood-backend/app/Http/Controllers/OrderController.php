<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'full_name'          => 'required|string|max:255',
            'phone_number'       => 'required|string|max:30',
            'delivery_address'   => 'required|string',
            'payment_method'     => 'required|in:cash,qr_payment',
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1',
        ], [
            'full_name.required'        => 'Please provide your full name.',
            'phone_number.required'     => 'Please provide your phone number.',
            'delivery_address.required' => 'Please provide your delivery address.',
            'items.required'            => 'Your cart is empty. Please add items to your cart.',
            'items.*.product_id.exists' => 'One of the items in your cart is no longer available.',
        ]);

        if ($validator->fails()) {
            Log::warning('Order validation failed: ' . $validator->errors()->first(), [
                'user_id' => $request->user()?->id,
                'errors'  => $validator->errors()->toArray(),
                'payload' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors()->toArray(),
            ], 422);
        }

        $validated = $validator->validated();

        try {
            return DB::transaction(function () use ($request, $validated) {
                $items = [];
                $total = 0;

                foreach ($validated['items'] as $item) {
                    $product = Product::where('id', $item['product_id'])->lockForUpdate()->first();

                    if (!$product) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Product not found.',
                            'errors'  => ['items' => ['Product not found.']],
                        ], 422);
                    }

                    if (!$product->is_available) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Sorry, "' . $product->name . '" is currently unavailable.',
                            'errors'  => ['items' => ['"' . $product->name . '" is currently unavailable.']],
                        ], 422);
                    }

                    if ($product->track_stock && $product->stock < $item['quantity']) {
                        $stockMsg = $product->stock <= 0
                            ? 'Sorry, "' . $product->name . '" is out of stock.'
                            : 'Sorry, "' . $product->name . '" only has ' . $product->stock . ' left in stock.';

                        return response()->json([
                            'success' => false,
                            'message' => $stockMsg,
                            'errors'  => ['items' => [$stockMsg]],
                        ], 422);
                    }

                    $subtotal    = $product->price * $item['quantity'];
                    $total      += $subtotal;
                    $items[]     = [
                        'product'  => $product,
                        'quantity' => $item['quantity'],
                        'price'    => $product->price,
                        'subtotal' => $subtotal,
                    ];
                }

                $paymentStatus = $validated['payment_method'] === 'cash' ? 'unpaid'  : 'pending';
                $orderStatus   = $validated['payment_method'] === 'cash' ? 'pending' : 'waiting_verification';

                $order = Order::create([
                    'user_id'          => $request->user()->id,
                    'full_name'        => $validated['full_name'],
                    'phone_number'     => $validated['phone_number'],
                    'total_amount'     => $total,
                    'payment_method'   => $validated['payment_method'],
                    'payment_status'   => $paymentStatus,
                    'order_status'     => $orderStatus,
                    'delivery_address' => $validated['delivery_address'],
                    'notes'            => $validated['notes'] ?? null,
                ]);

                foreach ($items as $item) {
                    OrderItem::create([
                        'order_id'   => $order->id,
                        'product_id' => $item['product']->id,
                        'quantity'   => $item['quantity'],
                        'price'      => $item['price'],
                        'subtotal'   => $item['subtotal'],
                    ]);

                    if ($item['product']->track_stock) {
                        $item['product']->decrement('stock', $item['quantity']);
                    }
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Order placed successfully',
                    'order'   => $order->load('items.product'),
                ], 201);
            });
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Order creation failed: ' . $e->getMessage(), [
                'user_id' => $request->user()?->id,
                'trace'   => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to place order. Please try again.',
            ], 500);
        }
    }

    public function index(Request $request)
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->with('items.product')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($orders);
    }

    public function show($id, Request $request)
    {
        $order = Order::where('user_id', $request->user()->id)
            ->with(['items.product', 'payment'])
            ->findOrFail($id);

        return response()->json($order);
    }
}
