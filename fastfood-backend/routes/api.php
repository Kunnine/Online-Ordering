<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminMenuController;
use App\Http\Controllers\Admin\AdminOrderController;
use App\Http\Controllers\Admin\AdminReportController;
use App\Http\Controllers\CustomerDashboardController;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\PaymentWebController;
use App\Http\Controllers\Admin\AdminCustomerController;


Route::get('/health', function () {
  return response()->json(['status' => 'ok', 'app' => config('app.name')]);
});

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1')->name('login');

Route::get('/categories',    [MenuController::class, 'categories']);
Route::get('/products',      [MenuController::class, 'products']);
Route::get('/products/{id}', [MenuController::class, 'show']);

// ─── Payment webhook (public, HMAC signature-verified) ──────────────────────────
// Gateways (Bakong, ABA PayWay) POST here after a transaction.
Route::post('/payment/webhook', [WebhookController::class, 'handle']);
Route::post('/payment/callback', [WebhookController::class, 'handle']);

Route::middleware('auth:sanctum')->group(function () {
   Route::get('/me',      [AuthController::class, 'me']);
   Route::post('/logout', [AuthController::class, 'logout']);

   // Customer Dashboard
   Route::get('/customer/stats', [CustomerDashboardController::class, 'stats']);

    // Orders
    Route::post('/orders',         [OrderController::class, 'store']);
   Route::get('/orders',          [OrderController::class, 'index']);
   Route::get('/orders/{id}',     [OrderController::class, 'show']);

  // Payments
  Route::get('/payment/qr-code',                              [PaymentController::class, 'getQrCode']);
  Route::get('/payment/qr/{orderId}',                         [PaymentController::class, 'generateKhqr']);
  Route::get('/payment/status/{orderId}',                     [PaymentController::class, 'getPaymentStatus']);
  Route::post('/payment/create',                              [PaymentController::class, 'create']);
  Route::post('/payment/initiate',                            [PaymentController::class, 'initiate']);
  Route::get('/payment/transactions',                         [PaymentController::class, 'transactions']);
  Route::get('/payment/transactions/{id}',                    [PaymentController::class, 'transactionDetail']);

  // Admin routes
  Route::middleware('admin')->prefix('admin')->group(function () {
    Route::get('/stats', [AdminDashboardController::class, 'stats']);
    Route::get('/reports/qr-payments', [AdminReportController::class, 'qrPaymentReport']);

    Route::get('/categories',         [AdminMenuController::class, 'categories']);
    Route::post('/categories',        [AdminMenuController::class, 'storeCategory']);
    Route::put('/categories/{id}',    [AdminMenuController::class, 'updateCategory']);
    Route::delete('/categories/{id}', [AdminMenuController::class, 'destroyCategory']);
    Route::put('/categories/{id}/toggle', [AdminMenuController::class, 'toggleCategory']);

    Route::get('/products',           [AdminMenuController::class, 'products']);
    Route::post('/products',          [AdminMenuController::class, 'storeProduct']);
    Route::put('/products/{id}',      [AdminMenuController::class, 'updateProduct']);
    Route::delete('/products/{id}',   [AdminMenuController::class, 'destroyProduct']);
    Route::put('/products/{id}/stock', [AdminMenuController::class, 'updateStock']);

    Route::get('/orders',                       [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}',                  [AdminOrderController::class, 'show']);
    Route::put('/orders/{id}/status',           [AdminOrderController::class, 'updateStatus']);
    Route::put('/orders/{id}/payment-status',   [AdminOrderController::class, 'updatePaymentStatus']);
    Route::post('/payment/refund/{order}',      [PaymentController::class, 'refund']);

    Route::get('/reports/overview',          [AdminReportController::class, 'overview']);
    Route::get('/reports/sales-by-day',      [AdminReportController::class, 'salesByDay']);
    Route::get('/reports/sales-by-month',    [AdminReportController::class, 'salesByMonth']);
    Route::get('/reports/top-products',      [AdminReportController::class, 'topProducts']);
    Route::get('/reports/top-customers',     [AdminReportController::class, 'topCustomers']);
    Route::get('/reports/orders-by-status',  [AdminReportController::class, 'ordersByStatus']);
    Route::get('/reports/recent-orders',     [AdminReportController::class, 'recentOrders']);

    // Customers
    Route::get('/customers',           [AdminCustomerController::class, 'index']);
    Route::get('/customers/{id}',      [AdminCustomerController::class, 'show']);
    Route::put('/customers/{id}/block', [AdminCustomerController::class, 'toggleBlock']);
    Route::delete('/customers/{id}',   [AdminCustomerController::class, 'destroy']);
  });
});
