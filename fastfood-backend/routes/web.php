<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AdminTransactionController;
use App\Http\Controllers\Api\WebhookController;
use Illuminate\Http\Request;

Route::get('/', fn () => view('welcome'))->name('home');

// ─── Session logout ────────────────────────────────────────────────────
Route::post('/logout', function (Request $request) {
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return redirect('/login');
})->middleware('auth:sanctum')->name('logout');

// ─── Admin Pages ───────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', \App\Http\Middleware\AdminMiddleware::class])
    ->prefix('admin')
    ->group(function () {
        Route::get('/transactions',            [AdminTransactionController::class, 'index'])->name('admin.transactions.index');
        Route::get('/transactions/{id}',       [AdminTransactionController::class, 'show'])->name('admin.transactions.show');
        Route::post('/transactions/{id}/approve', [AdminTransactionController::class, 'approve'])->name('admin.transactions.approve');
        Route::post('/transactions/{id}/reject',  [AdminTransactionController::class, 'reject'])->name('admin.transactions.reject');
        Route::post('/transactions/{id}/status',  [AdminTransactionController::class, 'updateStatus'])->name('admin.transactions.status');

        Route::get('/orders',  fn () => redirect('/admin/transactions'));
        Route::get('/reports', fn () => redirect('/admin/transactions'));
    });

// ─── KHQR / Payment Webhook ──────────────────────────────────────────────
// Public endpoint — signature HMAC verification inside WebhookController.
Route::post('/payment/khqr-callback', [WebhookController::class, 'handle'])
    ->name('payment.khqr-callback');
