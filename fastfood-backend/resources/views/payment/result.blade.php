<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $success ? 'Payment Successful' : 'Payment Failed' }} — FastFood</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])

    @if($success)
        <meta http-equiv="refresh" content="5;url=/order-success/{{ $order->id }}">
    @endif
</head>
<body class="min-h-screen bg-{{ $success ? 'green-50' : 'red-50' }}">
    <nav class="bg-orange-500 text-white px-4 py-3">
        <a href="/menu" class="text-xl">🍔</a>
        <span class="font-bold">FastFood</span>
    </nav>

    <div class="flex items-center justify-center min-h-[80vh] px-4">
        <div class="bg-white rounded-3xl shadow-lg p-10 text-center max-w-sm w-full">
            <p class="text-6xl mb-4">{{ $success ? '🎉' : '❌' }}</p>
            <h1 class="text-2xl font-bold text-gray-800 mb-2">
                {{ $success ? 'Payment Successful!' : 'Payment Failed' }}
            </h1>
            <p class="text-gray-500 text-sm mb-6">
                @if($success)
                    Your order <strong>#{{ $order->id }}</strong> is now confirmed.
                @else
                    Something went wrong with your payment.
                @endif
            </p>

            <div class="bg-{{ $success ? 'green' : 'red' }}-50 rounded-xl p-4 mb-6 text-left space-y-2">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Order</span>
                    <span class="font-bold">#{{ $order->id }}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Amount</span>
                    <span class="font-bold text-orange-500">{{ number_format((float) $order->total_amount, 2) }} USD</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Payment Status</span>
                    <span class="font-bold {{ $success ? 'text-green-600' : 'text-red-600' }}">
                        {{ $order->payment_status }}
                    </span>
                </div>
            </div>

            <div class="flex gap-3">
                <a href="/order-success/{{ $order->id }}"
                    class="flex-1 {{ $success
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700' }}
                    font-semibold py-3 rounded-xl text-center transition">
                    View Order
                </a>
                <a href="/menu"
                    class="flex-1 border-2 border-orange-500 text-orange-500 font-semibold py-3 rounded-xl hover:bg-orange-50 transition text-center">
                    Menu
                </a>
            </div>
        </div>
    </div>
</body>
</html>
