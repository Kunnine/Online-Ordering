<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transactions — FastFood</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-orange-50">
    <nav class="bg-orange-500 text-white px-4 py-3 flex items-center gap-4">
        <a href="/menu" class="text-xl">🍔</a>
        <span class="font-bold">FastFood</span>
        <span class="ml-auto text-xs bg-white/20 rounded-full px-3 py-1">Transactions</span>
    </nav>

    <main class="max-w-3xl mx-auto px-4 py-8">

        {{-- Filters ──────────────────────────────────────────────────────────}}
        <form method="GET" action="{{ route('transactions.history') }}" class="flex gap-2 mb-6 flex-wrap">
            <select name="status" class="border rounded-xl px-3 py-2 text-sm bg-white">
                <option value="">All Statuses</option>
                <option value="paid"        @selected(request('status')==='paid')>✅ Paid</option>
                <option value="pending"     @selected(request('status')==='pending')>⏳ Pending</option>
                <option value="rejected"    @selected(request('status')==='rejected')>❌ Rejected</option>
                <option value="refunded"    @selected(request('status')==='refunded')>↩️ Refunded</option>
            </select>
            <select name="method" class="border rounded-xl px-3 py-2 text-sm bg-white">
                <option value="">All Methods</option>
                <option value="qr_payment" @selected(request('method')==='qr_payment')>📱 QR Payment</option>
                <option value="cash"       @selected(request('method')==='cash')>💵 Cash</option>
            </select>
            <input type="search" name="search" value="{{ request('search') }}" placeholder="Search ID / reference…"
                class="border rounded-xl px-3 py-2 text-sm bg-white flex-1 min-w-[160px]">
            <button type="submit" class="bg-orange-500 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-orange-600">Filter</button>
            <a href="{{ route('transactions.history') }}" class="border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-white">Clear</a>
        </form>

        {{-- Stats Row ─────────────────────────────────────────────────────────}}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            @php
                $stats = $transactions->getCollection()->groupBy('payment_status');
            @endphp
            <div class="bg-white rounded-xl p-4">
                <p class="text-xs text-gray-400">Total</p>
                <p class="text-xl font-bold text-gray-800">{{ number_format($transactions->total(),0) }}</p>
            </div>
            <div class="bg-white rounded-xl p-4">
                <p class="text-xs text-gray-400">Paid</p>
                <p class="text-xl font-bold text-green-600">{{ number_format($transactions->getCollection()->where('payment_status','paid')->count(),0) }}</p>
            </div>
            <div class="bg-white rounded-xl p-4">
                <p class="text-xs text-gray-400">Pending</p>
                <p class="text-xl font-bold text-orange-600">{{ number_format($transactions->getCollection()->where('payment_status','pending')->count(),0) }}</p>
            </div>
            <div class="bg-white rounded-xl p-4">
                <p class="text-xs text-gray-400">Total Spent</p>
                <p class="text-xl font-bold text-orange-500">{{ number_format($transactions->getCollection()->where('payment_status','paid')->sum(fn($o)=>$o->total_amount),0) }} ៛</p>
            </div>
        </div>

        {{-- Transaction List ──────────────────────────────────────────────────}}
        @if($transactions->isEmpty())
            <div class="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400">
                <p class="text-5xl mb-3">📋</p>
                <p class="font-medium">No transactions yet</p>
                <a href="/menu" class="inline-block mt-3 text-orange-500 text-sm hover:underline">Browse Menu</a>
            </div>
        @else
            <div class="space-y-3">
                @foreach($transactions as $txn)
                    @php
                        $paid   = $txn->payment_status === 'paid';
                        $failed = in_array($txn->payment_status, ['rejected','failed']);
                        $badgeBg= $paid ? 'bg-green-100 text-green-700'
                              : ($failed ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700');
                        $khr    = number_format((int)round((float)$txn->total_amount * 4100));
                        $txRef  = $txn->payment->khqr_reference ?? $txn->payment->transaction_id ?? '—';
                    @endphp
                    <a href="{{ route('transactions.detail',$txn->id) }}"
                        class="bg-white rounded-2xl shadow-sm p-5 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-md transition block">
                        <div class="flex items-center gap-4 flex-1">
                            <p class="font-bold text-gray-800">#{{ $txn->id }}</p>
                            <span class="text-xs px-2 py-0.5 rounded-full font-medium {{ $badgeBg }}">
                                {{ $txn->payment_status }}
                            </span>
                            <span class="text-xs text-gray-400">
                                {{ \Carbon\Carbon::parse($txn->created_at)->format('d M Y · H:i') }}
                            </span>
                        </div>
                        <div class="flex items-center gap-4 md:gap-6">
                            <div class="text-right">
                                <p class="font-bold text-orange-500">{{ $khr }} ៛</p>
                                <p class="text-xs text-gray-400">Ref: {{ str_limit($txRef,18) }}</p>
                            </div>
                            <span class="text-gray-300">›</span>
                        </div>
                    </a>
                @endforeach
            </div>

            {{-- Pagination ────────────────────────────────────────────────────}}
            @if($transactions->hasPages())
                <div class="mt-6 flex gap-2 justify-center">
                    @if($transactions->previousPageUrl())
                        <a href="{{ $transactions->previousPageUrl() }}" class="px-4 py-2 border rounded-xl bg-white text-orange-500">← Prev</a>
                    @endif
                    <span class="px-4 py-2 text-sm text-gray-500">Page {{ $transactions->currentPage() }} / {{ $transactions->lastPage() }}</span>
                    @if($transactions->nextPageUrl())
                        <a href="{{ $transactions->nextPageUrl() }}" class="px-4 py-2 border rounded-xl bg-white text-orange-500">Next →</a>
                    @endif
                </div>
            @endif
        @endif
    </main>
</body>
</html>
