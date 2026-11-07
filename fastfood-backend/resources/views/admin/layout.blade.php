@php
    $routeName = request()->route()?->getName() ?? '';
    $isTrans   = str_contains($routeName, 'transactions');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Admin — FastFood')</title>
    @vite(['resources/css/admin.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-gray-100">
    <aside class="fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-gray-200 z-10">
        <div class="p-4 border-b border-gray-100">
            <p class="font-bold text-orange-500 text-lg">🍔 Admin</p>
            <p class="text-xs text-gray-400 mt-0.5">FastFood</p>
        </div>
        <nav class="p-2 space-y-1">
            <a href="/admin/transactions"
                class="block px-3 py-2 rounded-lg text-sm font-medium {{ $isTrans ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100' }}">
                💳 Transactions
            </a>
            <a href="/admin/orders"
                class="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                📋 All Orders
            </a>
            <a href="/admin/reports"
                class="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                📊 Reports
            </a>
            <div class="border-t mt-2 pt-2">
                <a href="/logout"
                    onclick="event.preventDefault();document.getElementById('lf').submit()"
                    class="block px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50">
                    ⎋ Logout
                </a>
                <form id="lf" method="POST" action="/logout" class="hidden">@csrf</form>
            </div>
        </nav>
    </aside>
    <main class="ml-56 min-h-screen">
        @yield('content')
    </main>
</body>
</html>
