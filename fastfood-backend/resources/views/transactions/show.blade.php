<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaction #{{ $order->id }} — FastFood</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-orange-50">
    <nav class="bg-orange-500 text-white px-4 py-3 flex items-center gap-4">
        <a href="/menu" class="text-xl">🍔</a>
        <span class="font-bold">FastFood</span>
        <a href="{{ route('transactions.history') }}" class="ml-auto text-sm hover:text-orange-200">← Transactions</a>
    </nav>

    <main class="max-w-lg mx-auto px-4 py-8">
        @php
            $p = $order->payment;
            $paid   = $order->payment_status === 'paid';
            $reject = in_array($order->payment_status, ['rejected','cancelled','failed']);
            $statusColor = $paid ? 'green'
                         : ($reject ? 'red' : 'yellow');
        @endphp

        <div class="bg-white rounded-3xl shadow-sm p-8 mb-6">
            <div class="text-center mb-6">
                <p class="text-5xl mb-3">{{ $paid ? '✅' : ($reject ? '❌' : '⏳') }}</p>
                <h1 class="text-2xl font-bold text-gray-800">Order #{{ $order->id }}</h1>
                <p class="text-gray-500">{{ \Carbon\Carbon::parse($order->created_at)->format('d M Y, H:i') }}</p>
            </div>

            {{-- Order items ────────────────────────────────────────────────────}}
            <details class="mb-6" open>
                <summary class="font-semibold text-gray-700 cursor-pointer mb-3">🛒 Items ({{ $order->items->count() }})</summary>
                <div class="space-y-2">
                    @foreach($order->items as $item)
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">{{ $item->product->name }} × {{ $item->quantity }}</span>
                            <span class="font-medium">{{ number_format((float) $item->subtotal, 2) }} $</span>
                        </div>
                    @endforeach
                </div>
            </details>

            {{-- Payment details ─────────────────────────────────────────────────}}
            <div class="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Method</span>
                    <span class="font-semibold">{{ $order->payment_method === 'qr_payment' ? '📱 KHQR' : '💵 Cash' }}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Payment Status</span>
                    <span class="bg-{{ $statusColor }}-100 text-{{ $statusColor }}-700 text-xs px-2 py-0.5 rounded-full font-medium capitalize">
                        {{ $order->payment_status }}
                    </span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Order Status</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium capitalize">
                        {{ str_replace('_',' ',$order->order_status) }}
                    </span>
                </div>
                @if($p && $p->khqr_reference)
                    <div class="flex justify-between text-sm border-t pt-2">
                        <span class="text-gray-500">KHQR Ref</span>
                        <span class="font-mono text-xs text-gray-700">{{ $p->khqr_reference }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Transaction ID</span>
                        <span class="font-mono text-xs text-gray-700">{{ $p->transaction_id ?? '—' }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Paid At</span>
                        <span>{{ $p->paid_at ? \Carbon\Carbon::parse($p->paid_at)->format('d M Y, H:i') : '—' }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Gateway</span>
                        <span class="capitalize">{{ str_replace('_',' ',($p->gateway_provider ?? 'aba_payway')) }}</span>
                    </div>
                @endif
                <div class="flex justify-between text-lg font-bold border-t pt-3">
                    <span>Total</span>
                    <span class="text-orange-500">{{ $p && $p->khqr_amount ? $p->khqr_amount : number_format((int)round((float)$order->total_amount*4100)) }} ៛</span>
                </div>
            </div>

            @if($order->delivery_address)
                <div class="mb-6">
                    <p class="text-xs font-medium text-gray-500 mb-1">🚗 Delivery Address</p>
                    <p class="text-sm text-gray-700">{{ $order->delivery_address }}</p>
                </div>
            @endif

            <a href="{{ route('transactions.history') }}" class="block text-center border-2 border-orange-500 text-orange-500 font-semibold py-3 rounded-xl hover:bg-orange-50">
                ← All Transactions
            </a>
        </div>
    </main>
</body>
</html>
