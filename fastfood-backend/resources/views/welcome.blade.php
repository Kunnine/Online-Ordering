@php
    try {
        $productsCount = \App\Models\Product::count();
        $categoriesCount = \App\Models\Category::count();
        $usersCount = \App\Models\User::count();
        $dbStatus = 'Connected';
    } catch (\Throwable $e) {
        $productsCount = 0;
        $categoriesCount = 0;
        $usersCount = 0;
        $dbStatus = 'Database Error';
    }
    $frontendUrl = env('FRONTEND_URL', 'https://fastfood-frontend-production-online.up.railway.app');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FastFood API & Backend Service</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }
        .container {
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
            max-width: 680px;
            width: 100%;
            padding: 36px;
            border: 1px solid #e2e8f0;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #f1f5f9;
        }
        .logo-group {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .logo-icon {
            font-size: 36px;
            line-height: 1;
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            color: #0f172a;
        }
        .subtitle {
            font-size: 13px;
            color: #64748b;
        }
        .status-badge {
            background: #ecfdf5;
            color: #059669;
            font-size: 12px;
            font-weight: 600;
            padding: 6px 14px;
            border-radius: 9999px;
            border: 1px solid #a7f3d0;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            display: inline-block;
        }
        .notice-box {
            background: #fff7ed;
            border-left: 4px solid #f97316;
            padding: 14px 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 14px;
            color: #9a3412;
            line-height: 1.5;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }
        .stat-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            text-align: center;
        }
        .stat-val {
            font-size: 22px;
            font-weight: 700;
            color: #f97316;
        }
        .stat-label {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .demo-box {
            background: #f1f5f9;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .demo-title {
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .demo-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            font-size: 13px;
        }
        .demo-item {
            background: #ffffff;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .demo-role {
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 4px;
        }
        .demo-cred {
            color: #64748b;
            font-family: monospace;
            font-size: 12px;
        }
        .actions-label {
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 10px;
        }
        .btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.15s ease-in-out;
        }
        .btn-primary {
            background: #f97316;
            color: #ffffff;
        }
        .btn-primary:hover {
            background: #ea580c;
        }
        .btn-secondary {
            background: #f8fafc;
            color: #334155;
            border: 1px solid #cbd5e1;
        }
        .btn-secondary:hover {
            background: #f1f5f9;
        }
        .footer {
            margin-top: 24px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-group">
                <span class="logo-icon">🍔</span>
                <div>
                    <h1>FastFood Backend API</h1>
                    <div class="subtitle">Laravel 11 & MySQL Service on Railway</div>
                </div>
            </div>
            <div class="status-badge">
                <span class="status-dot"></span>
                {{ $dbStatus }}
            </div>
        </div>

        <div class="notice-box">
            <strong>ℹ️ Notice:</strong> You are currently visiting the <strong>Laravel Backend & REST API</strong> service. The React customer store and demo login page run on the frontend web application.
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-val">{{ $productsCount }}</div>
                <div class="stat-label">Products Active</div>
            </div>
            <div class="stat-card">
                <div class="stat-val">{{ $categoriesCount }}</div>
                <div class="stat-label">Categories</div>
            </div>
            <div class="stat-card">
                <div class="stat-val">{{ $usersCount }}</div>
                <div class="stat-label">Users Registered</div>
            </div>
        </div>

        <div class="demo-box">
            <div class="demo-title">Active Demo Credentials</div>
            <div class="demo-grid">
                <div class="demo-item">
                    <div class="demo-role">👤 Demo Customer</div>
                    <div class="demo-cred">customer@fastfood.demo</div>
                    <div class="demo-cred">Password: Customer123!</div>
                </div>
                <div class="demo-item">
                    <div class="demo-role">🛡️ Demo Administrator</div>
                    <div class="demo-cred">admin@fastfood.demo</div>
                    <div class="demo-cred">Password: Admin123!</div>
                </div>
            </div>
        </div>

        <div class="actions-label">Access Applications & Endpoints:</div>
        <div class="btn-group">
            <a href="{{ $frontendUrl }}" class="btn btn-primary" target="_blank">🛒 Open FastFood Store & Demo Login</a>
            <a href="/api/health" class="btn btn-secondary" target="_blank">🩺 Health Check</a>
            <a href="/api/products" class="btn btn-secondary" target="_blank">📦 Products JSON</a>
            <a href="/api/categories" class="btn btn-secondary" target="_blank">📁 Categories JSON</a>
            <a href="/admin/transactions" class="btn btn-secondary">💳 Admin Portal</a>
        </div>

        <div class="footer">
            FastFood Ordering System · Railway Deployment
        </div>
    </div>
</body>
</html>
