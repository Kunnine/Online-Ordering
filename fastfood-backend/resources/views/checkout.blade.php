<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkout — FastFood</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        body{font-family:system-ui,-apple-system,sans-serif;background:#fef3c7}
        .card{background:#fff;border-radius:1rem;box-shadow:0 1px 3px rgba(0,0,0,.1)}
    </style>
</head>
<body class="min-h-screen">
    <nav class="bg-orange-500 text-white px-4 py-3 flex items-center gap-4">
        <span class="text-xl">🍔</span>
        <span class="font-bold text-lg">FastFood</span>
        <a href="/orders" class="ml-auto text-sm hover:text-orange-200">My Orders</a>
    </nav>

    <main class="max-w-2xl mx-auto px-4 py-8">
        <h1 class="text-2xl font-bold text-gray-800 mb-6">Complete Your Order</h1>

        {{-- Cart summary rendered by JS --}}
        <div id="cart-summary" class="card p-6 mb-6 space-y-3">
            <p class="text-gray-400 text-sm">Loading cart…</p>
        </div>

        <form method="POST" action="{{ route('checkout.submit') }}" class="card p-6 space-y-5">
            @csrf

            {{-- Hidden items JSON filled in by JS --}}
            <input type="hidden" name="items" id="hidden-items">

            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">🚗 Delivery Address*</label>
                <textarea name="delivery_address" rows="3" required placeholder="#123 St 123, Phnom Penh"
                    class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400">{{ old('delivery_address') }}</textarea>
            </div>

            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">📝 Delivery Notes</label>
                <textarea name="notes" rows="2" placeholder="e.g. No spicy sauce, extra napkins…"
                    class="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400">{{ old('notes') }}</textarea>
            </div>

            {{-- Payment Method ────────────────────────────────────────────────}}
            <div>
                <p class="text-sm font-semibold text-gray-700 mb-2">💳 Payment Method</p>
                <div class="grid grid-cols-2 gap-3">
                    <label class="cursor-pointer px-4 py-3 border-2 border-orange-500 bg-orange-50 rounded-xl text-sm font-semibold text-orange-700">
                        <input type="radio" name="payment_method" value="qr_payment" checked class="hidden">
                        📱 KHQR Payment
                    </label>
                    <label class="cursor-pointer px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-orange-300">
                        <input type="radio" name="payment_method" value="cash" class="hidden">
                        💵 Cash on Delivery
                    </label>
                </div>
            </div>

            @if($errors->any())
                <div class="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
                    {{ $errors->first() }}
                </div>
            @endif

            {{-- Totals ──────────────────────────────────────────────────────}}
            <div class="border-t pt-4 space-y-2">
                <div class="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span id="summary-subtotal">—</span></div>
                <div class="flex justify-between text-sm text-green-600"><span>Delivery fee</span><span>Free</span></div>
                <div class="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span><span class="text-orange-500" id="summary-total">—</span>
                </div>
            </div>

            <button type="submit"
                class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition">
                📱 Proceed to KHQR Payment
            </button>
        </form>
    </main>

    <script>
    // ── Render cart items (matches exactly what the JS cart stores) ──────
    let cart = [];

    function renderCart() {
        const container = document.getElementById('cart-summary');
        const subEl     = document.getElementById('summary-subtotal');
        const totEl     = document.getElementById('summary-total');

        const items = [...cart];
        let total   = 0;

        container.innerHTML = items.length
            ? items.map(i => {
                total += i.price * i.quantity;
                return `<div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-lg">🍔</div>
                    <div class="flex-1 text-sm">
                        <p class="font-medium">${i.name}</p>
                        <p class="text-xs text-gray-400">x${i.quantity} × ${Number(i.price).toFixed(0)} ៛</p>
                    </div>
                    <p class="font-semibold text-sm">${Number(i.price * i.quantity).toFixed(0)} ៛</p>
                </div>`;
            }).join('')
            : '<p class="text-gray-400 text-sm">Cart is empty — <a href="/menu" class="underline">go to menu</a>.</p>';

        const khr = total.toLocaleString('en');
        subEl.textContent = khr + ' ៛';
        totEl.textContent = khr + ' ៛';

        document.getElementById('hidden-items').value = JSON.stringify(items.map(i => ({
            product_id: i.id,
            quantity:   i.quantity,
        })));
    }

    // ── Read cart from localStorage or Hydrated window global ────────────
    function loadCart() {
        try { cart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch (_) {}
        renderCart();
    }

    loadCart();
    </script>
</body>
</html>
