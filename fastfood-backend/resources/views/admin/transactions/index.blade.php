<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transactions — Admin</title>
    @vite(['resources/css/admin.css', 'resources/js/app.js'])
    <style>
        body{font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9}
        table{width:100%;border-collapse:separate;border-spacing:0}
        th{background:#e2e8f0;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em}
        td,th{padding:.5rem .75rem;text-align:left}
        tr:hover td{background:#f8fafc}
    </style>
</head>
<body class="min-h-screen">
    @include('admin.layout')

    <main class="px-6 py-8">
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">💰 Payment Transactions</h1>
                <p class="text-sm text-gray-500">Monitor and manage all KHQR + cash orders</p>
            </div>
            <div class="flex gap-2 flex-wrap">
                <span class="text-xs bg-gray-200 px-3 py-1 rounded-full">Total: {{ $stats['total_transactions'] ?? 0 }}</span>
                <span class="text-xs bg-green-100 px-3 py-1 rounded-full text-green-700">Paid: {{ $stats['paid_qr_payments'] ?? 0 }}</span>
                <span class="text-xs bg-yellow-100 px-3 py-1 rounded-full text-yellow-700">Pending: {{ $stats['pending_qr_payments'] ?? 0 }}</span>
                <span class="text-xs bg-red-100 px-3 py-1 rounded-full text-red-700">Failed: {{ $stats['failed_qr_payments'] ?? 0 }}</span>
            </div>
        </div>

        {{-- Revenue banners ──────────────────────────────────────────────────────}}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div class="bg-white rounded-xl p-4">
                <p class="text-xs text-gray-400">Total Revenue (USD)</p>
                <p class="text-xl font-bold text-orange-500">${{ number_format(($stats['total_revenue_usd'] ?? 0), 0) }}</p>
            </div>
            <div class="bg-white rounded-xl p-4">
                <p class="text-xs text-gray-400">Total Revenue (KHR)</p>
                <p class="text-xl font-bold text-gray-800">{{ number_format(($stats['total_revenue_khr'] ?? 0), 0) }} ៛</p>
            </div>
            <div class="bg-white rounded-xl p-4">
                <p class="text-xs text-gray-400">Awaiting Verification</p>
                <p class="text-xl font-bold text-yellow-600">{{ $stats['awaiting_verification'] ?? 0 }}</p>
            </div>
            <div class="bg-white rounded-xl p-4">
                <p class="text-xs text-gray-400">Total Orders</p>
                <p class="text-xl font-bold text-gray-800">{{ $stats['total_transactions'] ?? 0 }}</p>
            </div>
        </div>

        {{-- Filters ───────────────────────────────────────────────────────────────}}
        <form method="GET" class="flex gap-2 mb-6 flex-wrap bg-white p-4 rounded-xl shadow-sm">
            <select name="payment_status" class="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Payment Status</option>
                <option value="paid"      @selected(request('payment_status')==='paid')>✅ Paid</option>
                <option value="pending"   @selected(request('payment_status')==='pending')>⏳ Pending</option>
                <option value="rejected"  @selected(request('payment_status')==='rejected')>❌ Rejected</option>
                <option value="refunded"  @selected(request('payment_status')==='refunded')>↩️ Refunded</option>
            </select>
            <select name="order_status" class="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Order Status</option>
                @foreach(['pending','waiting_verification','confirmed','preparing','ready','delivered','cancelled'] as $s)
                    <option value="{{ $s }}" @selected(request('order_status')===$s)>{{ str_replace('_',' ',ucfirst($s)) }}</option>
                @endforeach
            </select>
            <select name="payment_method" class="border rounded-lg px-3 py-2 text-sm">
                <option value="">All Methods</option>
                <option value="qr_payment" @selected(request('payment_method')==='qr_payment')>📱 QR Payment</option>
                <option value="cash"       @selected(request('payment_method')==='cash')>💵 Cash</option>
            </select>
            <input type="date" name="date_from" value="{{ request('date_from') }}" class="border rounded-lg px-3 py-2 text-sm">
            <input type="date" name="date_to"   value="{{ request('date_to') }}"   class="border rounded-lg px-3 py-2 text-sm">
            <input type="search" name="search" value="{{ request('search') }}" placeholder="Search ID / name / ref…" class="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]">
            <button type="submit" class="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-medium">Filter</button>
            <a href="{{ route('admin.transactions.index') }}" class="border rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Clear</a>
        </form>

        {{-- Transactions Table ────────────────────────────────────────────────────}}
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Customer</th>
                        <th>Order Status</th>
                        <th>Payment</th>
                        <th>KHQR Ref</th>
                        <th class="text-right">Total</th>
                        <th>Gateway</th>
                        <th>Created</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                @forelse($transactions as $txn)
                    @php
                        $p     = $txn->payment;
                        $paid  = $txn->payment_status === 'paid';
                        $verif = $txn->order_status === 'waiting_verification';
                        $rowBg = $verif ? 'bg-yellow-50' : '';
                        $pBadge = $paid  ? 'bg-green-100 text-green-700'
                              : ($txn->payment_status === 'rejected' ? 'bg-red-100 text-red-700'
                              : $txn->payment_status === 'failed'    ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700');
                    @endphp
                    <tr class="{{ $rowBg }}">
                        <td class="font-bold">{{ $txn->id }}</td>
                        <td>
                            <p class="font-medium text-sm">{{ $txn->user->name ?? '—' }}</p>
                            <p class="text-xs text-gray-400">{{ $txn->user->email ?? '—' }}</p>
                        </td>
                        <td>
                            <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 capitalize">
                                {{ str_replace('_',' ',$txn->order_status) }}
                            </span>
                            @if($verif)
                                <span class="text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full ml-1 animate-pulse">!</span>
                            @endif
                        </td>
                        <td>
                            <span class="text-xs px-2 py-0.5 rounded-full font-medium {{ $pBadge }}">
                                {{ $txn->payment_status }}
                            </span>
                        </td>
                        <td class="font-mono text-xs text-gray-500 max-w-[120px] truncate">
                            {{ $p->khqr_reference ?? ($p->transaction_id ?? '—') }}
                        </td>
                        <td class="text-right font-bold {{ $p && $p->khqr_amount ? 'text-gray-800' : '' }}">
                            {{ $p && $p->khqr_amount ? $p->khqr_amount . ' ៛' : '$' . number_format((float) $txn->total_amount, 2) }}
                        </td>
                        <td class="text-xs capitalize text-gray-500">
                            {{ $p->gateway_provider ?? 'cash' }}
                        </td>
                        <td class="text-xs text-gray-400">
                            {{ \Carbon\Carbon::parse($txn->created_at)->format('d M H:i') }}
                        </td>
                        <td>
                            <a href="{{ route('admin.transactions.show',$txn->id) }}"
                                class="text-orange-500 hover:text-orange-700 font-medium text-sm">
                                View →
                            </a>
                        </td>
                    </tr>
                @empty
                    <tr><td colspan="9" class="text-center py-12 text-gray-400">No transactions found.</td></tr>
                @endforelse
                </tbody>
            </table>
        </div>

        {{-- Pagination ────────────────────────────────────────────────────────────}}
        @if($transactions->hasPages())
            <div class="mt-4 flex gap-2 justify-center">
                @if($transactions->previousPageUrl())
                    <a href="{{ $transactions->previousPageUrl() }}" class="px-4 py-2 bg-white border rounded-xl text-orange-500 text-sm">← Prev</a>
                @endif
                <span class="px-4 py-2 text-sm text-gray-500">Page {{ $transactions->currentPage() }}/{{ $transactions->lastPage() }}</span>
                @if($transactions->nextPageUrl())
                    <a href="{{ $transactions->nextPageUrl() }}" class="px-4 py-2 bg-white border rounded-xl text-orange-500 text-sm">Next →</a>
                @endif
            </div>
        @endif
    </main>
</body>
</html>
