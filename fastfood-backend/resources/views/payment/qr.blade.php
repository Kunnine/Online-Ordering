<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KHQR Payment — FastFood Order #{{ $order->id }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        body{font-family:system-ui,-apple-system,sans-serif;background:#eef2ff}
        .qr-img{image-rendering:pixelated}
    </style>
</head>
<body class="min-h-screen">
    <nav class="bg-orange-500 text-white px-4 py-3 flex items-center gap-4">
        <a href="/menu" class="text-xl">🍔</a>
        <span class="font-bold">FastFood</span>
        <a href="/transactions" class="ml-auto text-sm hover:text-orange-200">Transactions</a>
    </nav>

    <main class="max-w-md mx-auto px-4 py-8">
        <div class="text-center mb-6">
            <p class="text-xs text-orange-500 uppercase tracking-widest font-semibold">Order #{{ $order->id }}</p>
        </div>

        {{-- ── QR Code Panel ──────────────────────────────────────────────────}}
        <div class="bg-white rounded-3xl shadow-xl p-8 text-center mb-6">
            <div class="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-white text-xs">📱</span>
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-1">Scan to Pay</h2>
            <p class="text-sm text-gray-500">Use your ABA / ACLEDA / Wing banking app</p>

            <div class="bg-white rounded-2xl p-4 shadow-inner my-6 inline-block border-2 border-gray-100">
                <img
                    id="khqr-image"
                    src="data:image/png;base64,{{ $qr_base64 }}"
                    alt="KHQR Code"
                    class="qr-img w-72 h-72 mx-auto"
                >
            </div>

            <p class="text-4xl font-black text-gray-800 mb-1">{{ $amount_khr ?? $order->total_amount * 4100 }} ៛</p>
            <p class="text-gray-400 text-sm">(USD {{ $amount_usd ?? number_format((float) $order->total_amount, 2) }})</p>

            <div class="bg-orange-50 border border-orange-200 rounded-xl p-3 mt-4 text-left">
                <p class="text-xs text-gray-400">Reference / Bill Number</p>
                <p class="font-mono font-bold text-orange-700 truncate">{{ $bill_number }}</p>
            </div>
        </div>

        {{-- ── Countdown Timer ─────────────────────────────────────────────────}}
        <div class="bg-white rounded-2xl shadow-sm p-4 mb-6 flex items-center gap-3">
            <span id="timer-icon" class="text-2xl">⏳</span>
            <div class="flex-1">
                <p class="text-sm font-semibold text-gray-700" id="timer-label">Time remaining</p>
                <p class="text-2xl font-black text-orange-500 font-mono" id="timer-display">--:--</p>
            </div>
        </div>

        {{-- ── Payment Steps ───────────────────────────────────────────────────}}
        <div class="bg-white rounded-2xl shadow-sm p-6 mb-6 space-y-3">
            <p class="text-xs font-semibold text-gray-400 uppercase">How to pay</p>
            <div class="space-y-3 text-sm">
                <div id="step-1" class="flex items-center gap-3">
                    <span class="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span class="text-gray-700">Open your <strong>ABA</strong> / <strong>ACLEDA</strong> / <strong>Wing</strong> app</span>
                </div>
                <div id="step-2" class="flex items-center gap-3">
                    <span class="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span class="text-gray-700">Tap <strong>"Scan QR"</strong> and scan the code above</span>
                </div>
                <div id="step-3" class="flex items-center gap-3">
                    <span class="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span class="text-gray-700">Confirm <strong>{{ number_format((int) $amount_khr) }} ៛</strong> payment</span>
                </div>
            </div>
        </div>

        {{-- ── Status Alert (hidden, shown by JS on status change) ─────────────}}
        <div id="status-alert" class="hidden rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span id="status-icon"></span>
            <div>
                <p id="status-title" class="font-bold"></p>
                <p id="status-msg"   class="text-sm"></p>
            </div>
        </div>

        {{-- ── Action Buttons ──────────────────────────────────────────────────}}
        <div class="flex gap-3">
            <a href="/menu"
                class="flex-1 text-center border-2 border-orange-500 text-orange-500 font-semibold py-3 rounded-xl hover:bg-orange-50 transition">
                ← Menu
            </a>
            <a href="/transactions"
                class="flex-1 text-center bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition">
                Transactions
            </a>
        </div>
    </main>

    <script>
    const ORDER_ID    = {{ $order->id }};
    const EXPIRES_TS  = {{ $expires_ts }};
    const TOKEN       = '{{ session("auth_token","") }}'; // set by auth middleware if used

    // ── Countdown ────────────────────────────────────────────────────────
    let remaining = Math.max(0, EXPIRES_TS - Math.floor(Date.now() / 1000));

    function updateTimer() {
        remaining = Math.max(0, EXPIRES_TS - Math.floor(Date.now() / 1000));
        if (remaining <= 0) {
            document.getElementById('timer-label').textContent  = 'QR Code expired';
            document.getElementById('timer-display').textContent = 'Expired';
            document.getElementById('timer-icon').textContent    = '⏰';
            document.getElementById('timer-display').classList.replace('text-orange-500', 'text-red-500');
            return;
        }
        const m = String(Math.floor(remaining / 60)).padStart(2, '0');
        const s = String(remaining % 60).padStart(2, '0');
        document.getElementById('timer-display').textContent = `${m}:${s}`;
        // Cursor at 5-min warning
        if (remaining <= 300) {
            document.getElementById('timer-display').classList.replace('text-orange-500', 'text-red-500');
            document.getElementById('timer-icon').textContent = '⏰';
        }
    }
    updateTimer();
    setInterval(updateTimer, 1000);

    // ── Poll payment status ──────────────────────────────────────────────
    async function checkStatus() {
        try {
            const res = await fetch(`/api/payment/status/${ORDER_ID}`, {
                headers: TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {},
            });
            const d    = await res.json();
            const psts = d.payment_status || '';

            if (psts === 'paid') {
                window.location.href = `/payment/result/${ORDER_ID}?success=1`;
            } else if (['failed', 'rejected'].includes(psts)) {
                window.location.href = `/payment/result/${ORDER_ID}?failed=1`;
            }
        } catch (_) { /* keep polling */ }
    }

    setInterval(checkStatus, 4000);
    </script>
</body>
</html>
