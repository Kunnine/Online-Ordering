<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Placed! — FastFood</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-orange-50">
    <nav class="bg-orange-500 text-white px-4 py-3 flex items-center gap-4">
        <a href="/menu" class="text-xl">🍔</a>
        <span class="font-bold">FastFood</span>
        <a href="/menu" class="ml-auto text-sm hover:text-orange-200">Menu</a>
    </nav>

    <div class="flex items-center justify-center min-h-[80vh] px-4">
        <div class="bg-white rounded-3xl shadow-xl p-10 text-center max-w-sm w-full">
            <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-5xl mx-auto mb-4">🎉</div>
            <h1 class="text-3xl font-bold text-gray-800 mb-2">Order Placed!</h1>
            <p class="text-gray-500 mb-6">Your order <strong>#{{ $order }}</strong> has been received.</p>

            <div class="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-500">Order ID</span>
                    <span class="font-bold">#{{ $order }}</span>
                </div>
                <div class="flex justify-between text-sm border-t pt-2">
                    <span class="text-gray-500 font-medium">Total</span>
                    <span class="font-bold text-orange-500">${{ number_format($total,2) }}</span>
                </div>
            </div>

            <form action="/orders/{{ $order }}/cancel" method="POST" class="border-t pt-3 mt-3">
                @csrf
                @method('DELETE')
                <button type="submit"
                    onclick="return confirm('Cancel this order?')"
                    class="text-sm text-red-500 hover:text-red-700 underline">
                    Cancel Order
                </button>
            </form>

            <div class="flex gap-3 mt-4">
                <a href="/orders/{{ $order }}" class="flex-1 border-2 border-orange-500 text-orange-500 font-semibold py-3 rounded-xl hover:bg-orange-50 transition text-center">
                    Track Order
                </a>
                <a href="/menu" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition text-center">
                    Order More
                </a>
            </div>
        </div>
    </div>
</body>
</html>
