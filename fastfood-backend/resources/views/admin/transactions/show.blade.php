<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order #{{ $order->id }} — Admin</title>
    @vite(['resources/css/admin.css', 'resources/js/app.js'])
    <style>
        body{font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9}
    </style>
</head>
<body class="min-h-screen">
    @include('admin.layout')

    <main class="max-w-2xl mx-auto px-6 py-8">
        <div class="flex items-center gap-3 mb-6">
            <a href="{{ route('admin.transactions.index') }}" class="text-orange-500 hover:text-orange-700">← Back</a>
            <h1 class="text-2xl font-bold">Order #{{ $order->id }}</h1>
            @php
                $p     = $order->payment;
                $badgeBg = match($order->order_status) {
                    'delivered'    => 'bg-green-100 text-green-700',
                    'confirmed'    => 'bg-blue-100 text-blue-700',
                    'preparing'    => 'bg-orange-100 text-orange-700',
                    'waiting_verification' => 'bg-yellow-100 text-yellow-700 animate-pulse',
                    'cancelled'    => 'bg-red-100 text-red-700',
                    default        => 'bg-gray-100 text-gray-700',
                };
            @endphp
            <span class="text-xs px-2 py-1 rounded-full font-medium ml-auto {{ $badgeBg }}">
                {{ str_replace('_',' ',ucfirst($order->order_status)) }}
            </span>
        </div>

        @if(session('success'))
            <div class="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-6">{{ session('success') }}</div>
        @endif
        @if(session('error'))
            <div class="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6">{{ session('error') }}</div>
        @endif

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            {{-- Customer info ──────────────────────────────────────────────────}}
            <div class="bg-white rounded-2xl shadow-sm p-6">
                <h2 class="font-semibold mb-4">👤 Customer</h2>
                <div class="space-y-2 text-sm">
                    <p><span class="text-gray-500 w-24 inline-block">Name</span> <strong>{{ $order->user->name ?? '—' }}</strong></p>
                    <p><span class="text-gray-500 w-24 inline-block">Email</span> {{ $order->user->email ?? '—' }}</p>
                    <p><span class="text-gray-500 w-24 inline-block">Phone</span> {{ $order->user->phone ?? '—' }}</p>
                </div>
                <div class="mt-4 bg-gray-50 rounded-xl p-3">
                    <p class="text-xs font-medium text-gray-500 mb-1">🚗 Delivery Address</p>
                    <p class="text-sm text-gray-700">{{ $order->delivery_address }}</p>
                </div>
            </div>

            {{-- Payment info ────────────────────────────────────────────────────}}
            <div class="bg-white rounded-2xl shadow-sm p-6">
                <h2 class="font-semibold mb-4">💳 Payment</h2>
                <div class="space-y-2 text-sm">
                    <p>
                        <span class="text-gray-500 w-32 inline-block">Method</span>
                        <span>{{ $order->payment_method === 'qr_payment' ? '📱 KHQR Payment' : '💵 Cash' }}</span>
                    </p>
                    <p>
                        <span class="text-gray-500 w-32 inline-block">Payment Status</span>
                        <span class="bg-{{ $order->payment_status === 'paid' ? 'green' : ($order->payment_status === 'rejected' ? 'red' : 'yellow') }}-100 text-{{ $order->payment_status === 'paid' ? 'green' : ($order->payment_status === 'rejected' ? 'red' : 'yellow') }}-700 text-xs px-2 py-0.5 rounded-full font-medium capitalize">
                            {{ $order->payment_status }}
                        </span>
                    </p>
                    @if($p && $p->khqr_reference)
                        <p><span class="text-gray-500 w-32 inline-block">KHQR Ref</span> <code class="text-xs bg-gray-100 px-2 py-0.5 rounded">{{ $p->khqr_reference }}</code></p>
                        <p><span class="text-gray-500 w-32 inline-block">Bill Number</span> <code class="text-xs bg-gray-100 px-2 py-0.5 rounded">{{ $p->khqr_bill_number ?? '—' }}</code></p>
                        <p><span class="text-gray-500 w-32 inline-block">Gateway</span> <span class="capitalize">{{ str_replace('_',' ',($p->gateway_provider ?? '—')) }}</span></p>
                        <p><span class="text-gray-500 w-32 inline-block">Paid At</span> {{ $p->paid_at ? \Carbon\Carbon::parse($p->paid_at)->format('d M Y, H:i') : '—' }}</p>
                    @endif
                    <p class="border-t pt-2 font-bold text-orange-500">
                        {{ $p && $p->khqr_amount ? $p->khqr_amount . ' ៛' : '$' . number_format((float)$order->total_amount,2) }}
                    </p>
                </div>
            </div>

            {{-- Order items ──────────────────────────────────────────────────────}}
            <div class="bg-white rounded-2xl shadow-sm p-6 md:col-span-2">
                <h2 class="font-semibold mb-4">📦 Items</h2>
                <table class="w-full">
                    <thead><tr class="text-xs text-gray-400 border-b"><th>Product</th><th class="text-right">Qty</th><th class="text-right">Unit</th><th class="text-right">Subtotal</th></tr></thead>
                    <tbody>
                    @foreach($order->items as $item)
                        <tr class="border-b last:border-0">
                            <td class="py-2 text-sm">{{ $item->product?->name ?? 'Product #'.$item->product_id }}</td>
                            <td class="text-right text-sm">{{ $item->quantity }}</td>
                            <td class="text-right text-sm">{{ number_format((float)$item->price,2) }} $</td>
                            <td class="text-right text-sm font-semibold">{{ number_format((float)$item->subtotal,2) }} $</td>
                        </tr>
                    @endforeach
                    <tr><td colspan="4" class="text-right pt-3 font-bold text-orange-500">
                        Total: {{ number_format((float)$order->total_amount,2) }} $ ({{ number_format((int)round((float)$order->total_amount*4100)) }} ៛)
                    </td></tr>
                    </tbody>
                </table>
            </div>

            {{-- QR Approve / Reject ──────────────────────────────────────────────}}
            @if($order->order_status === 'waiting_verification')
                <div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 md:col-span-2">
                    <h2 class="font-semibold text-yellow-800 mb-4">⚠️ Payment Verification Required</h2>
                    <form method="POST" action="{{ route('admin.transactions.approve',$order->id) }}" class="inline">
                        @csrf
                        <button type="submit"
                            class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl font-medium mr-2">
                            ✅ Approve Payment
                        </button>
                    </form>
                    <form method="POST" action="{{ route('admin.transactions.reject',$order->id) }}" class="inline" onsubmit="return confirm('Reject this payment? This will cancel the order.')">
                        @csrf
                        <button type="submit"
                            class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-xl font-medium">
                            ✕ Reject Payment
                        </button>
                    </form>
                </div>
            @endif

            {{-- Update order status ──────────────────────────────────────────────}}
            @if($order->payment_status === 'paid' || $order->order_status !== 'cancelled')
                <div class="bg-white rounded-2xl shadow-sm p-6 md:col-span-2">
                    <h2 class="font-semibold mb-3">📦 Update Order Status</h2>
                    <form method="POST" action="{{ route('admin.transactions.status',$order->id) }}" class="flex gap-2">
                        @csrf
                        <select name="order_status" class="flex-1 border rounded-xl px-4 py-2 text-sm">
                            @foreach(['pending','waiting_verification','confirmed','preparing','ready','delivered','cancelled'] as $s)
                                <option value="{{ $s }}" @selected($order->order_status === $s)>{{ str_replace('_',' ',ucfirst($s)) }}</option>
                            @endforeach
                        </select>
                        <button type="submit" class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl text-sm font-medium">Update</button>
                    </form>
                </div>
            @endif

            @if($order->notes)
                <div class="bg-white rounded-2xl shadow-sm p-6 md:col-span-2">
                    <h2 class="font-semibold mb-2">📝 Customer Notes</h2>
                    <p class="text-sm text-gray-600">{{ $order->notes }}</p>
                </div>
            @endif
        </div>
    </main>
</body>
</html>
