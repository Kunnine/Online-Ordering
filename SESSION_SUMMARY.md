# KHQR Payment Flow — Complete Overview

## Files You Can See in IDE

### 1. `fastfood-frontend/src/pages/Checkout.jsx`
**What it does right now:**
- Shows delivery address form + payment method selector (KHQR / Cash)
- `POST /api/orders` — creates the order in Laravel
- If **QR payment**: calls `POST /api/payment/initiate` (generates QR + saves image on server), then `navigate("/order-success")`
- If **Cash**: `navigate("/order-success")` directly

**Key endpoints on this page:**
```
POST /api/orders         →  PaymentWebController@submitOrder
POST /api/payment/initiate → Api\PaymentController@initiate
```

---

### 2. `fastfood-frontend/src/pages/KhqrPayment.jsx`
**What it does right now:**
- Fetches `GET /api/payment/qr-code?order_id=…` via `api.get()` (auth:sanctum + Bearer token)
- Shows the ABA-style QR card with scan-to-pay button
- Shows static `/image/qr.jpg` as the first `onError` fallback
- Shows receipt upload form underneath (proof of payment workflow)
- Has its own `Navbar` import

**Key endpoint on this page:**
```
GET /api/payment/qr-code?order_id=... → Api\PaymentController@getQrCode
```
Returns: `{qr_code_url: "data:image/png;base64,...", amount, currency, merchant_name, paid_at, order, payment}`

---

### 3. `fastfood-backend/app/Http/Controllers/PaymentController.php`
**NEW — replaces the old hardcoded `qr_code_url`:**
- `getQrCode()` — calls `KhqrService::buildMark()` to create a real EMVCo OB1 mark, saves PNG to `storage/app/public/payments/{orderId}/qr.png`
- QR image is served as `data:image/png;base64,…` directly in the JSON (the "image in the folder" technique)
- Persists `khqr_mark`, `khqr_bill_number`, `khqr_expires_at`, `qr_image_*` on the `payments` row
- `uploadReceipt()`, `confirmQrPayment()`, `rejectQrPayment()`, `cashOnDelivery()` — legacy receipt/admin endpoints

---

### 4. `fastfood-backend/app/Http/Controllers/Api/PaymentController.php`
**Full KHQR payment controller under `App\Http\Controllers\Api`:**
- `initiate()` — **POST** `/api/payment/initiate` — generates KHQR via factory, renders QR PNG via `renderQrImage()`, saves to `payments/{orderId}/qr.png`, returns full envelope with `qrImage`, `khqrMark`, `md5Hash`
- `getQrCode()` — **GET** `/api/payment/qr-code` — reads stored mark or builds one on the fly, returns same format as KhqrPayment expects
- `generateKhqr()` — **GET** `/api/payment/qr/{orderId}` — same as `getQrCode`, auth checked against `$request->user()->id`
- `getPaymentStatus()` — **GET** `/api/payment/status/{orderId}` — calls `KhqrFactory::make()->getStatus()`
- `uploadReceipt()` — **POST** `/api/payment/upload-receipt` — file upload, stores in `storage/app/public/receipts/`
- `refund()` — **POST** `/api/payment/refund/{order}` — calls `KhqrFactory::make()->refund()`
- `transactions()` — **GET** `/api/payment/transactions` — paginated history
- `transactionDetail()` — **GET** `/api/payment/transactions/{id}` — single order detail

---

### 5. `fastfood-backend/app/Http/Controllers/PaymentWebController.php`
- `submitOrder()` — **POST** `/api/orders` — creates Order + Payment rows, returns JSON `{ order: ..., payment_required: true }`
- `khqrCallback()` — **POST** `/payment/khqr-callback` — HMAC-sig verified webhook from KHQR bank

---

### 6. `fastfood-backend/app/Services/Khqr/AbapayService.php`
**ABA PayWay driver:**
- `generateBill()` — POSTs to ABA PayWay `/api/v1/bill/create`, assembles real EMVCo OB1 mark using `assembleMark()` + CRC-16-CCITT, returns `qr_base64` + `khqr_reference` + `raw.mark`
- `getStatus()` — GETs ABA PayWay `/api/v1/bill/status`
- `refund()` — POSTs ABA PayWay `/api/v1/bill/refund`
- `assembleMark()` — TLV builder that produces a compliant OB1 mark string

---

### 7. `fastfood-backend/app/Services/Khqr/BakongService.php`
**Bakong KHQR driver:**
- `generateBill()` — calls CreditEndpoint `POST /bakong/khqr/credit-endpoint`, renders QR PNG via `QrCode::format('png')`
- `getStatus()` — calls DebitEndpoint `GET /bakong/khqr/check-transaction`
- `refund()` — calls Bakong refund endpoint

---

### 8. `fastfood-backend/app/Services/Khqr/KhqrService.php`
**Shared services (used by both controllers):**
- `buildMark()` — creates a full Bakong OB1 mark with TLV tags + SHA-256 + CRC-16/CCITT
- `renderImage()` — saves PNG to `storage/app/public/payments/{orderId}/qr.png`
- Bank code map: `002 → ABA`, `001 → ACLEDA`, `009 → WING`

---

### 9. `fastfood-backend/routes/api.php`
**Laravel API routes (all `auth:sanctum`):**
```
POST  /api/orders                  → PaymentWebController@submitOrder
GET   /api/orders                  → OrderController@index
GET   /api/orders/{id}             → OrderController@show
POST  /api/payment/initiate        → Api\PaymentController@initiate
GET   /api/payment/qr-code         → Api\PaymentController@getQrCode
GET   /api/payment/qr/{orderId}    → Api\PaymentController@generateKhqr
POST  /api/payment/refund/{order}  → Api\PaymentController@refund
GET   /api/payment/status/{orderId} → Api\PaymentController@getPaymentStatus
GET   /api/payment/transactions    → Api\PaymentController@transactions
GET   /api/payment/transactions/{id}→ Api\PaymentController@transactionDetail
POST  /api/payment/upload-receipt   → Api\PaymentController@uploadReceipt
```

---

### 10. `fastfood-backend/routes/web.php`
**Laravel web routes:**
```
GET   /                                         → welcome.blade.php
POST  /logout                                   → session logout
GET|POST /admin/transactions                    → AdminTransactionController (index/show/approve/reject/updateStatus)
POST  /payment/khqr-callback                    → PaymentWebController@khqrCallback (webhook, HMAC verified)
```

---

### 11. `fastfood-frontend/src/services/api.js`
```js
const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",   // ← Laravel
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});
// Auto-attaches Bearer token from localStorage on every request
```

---

## Payment Flow End-to-End

```
User clicks "Checkout" in Menu
    │
    ▼
Checkout.jsx → POST /api/orders
    ├─ Creates Order row (payment_status = 'pending', order_status = 'waiting_verification')
    ├─ Creates Payment row (status = 'pending')
    │
    ├── KHQR payment ──► POST /api/payment/initiate
    │                        ├─ KhqrFactory::make('aba_payway') → AbapayService
    │                        ├─ POST ABA PayWay /api/v1/bill/create
    │                        ├─ assembleMark() → real EMVCo OB1 mark string
    │                        ├─ renderQrImage() → PNG saved to
    │                        │   storage/app/public/payments/{orderId}/qr.png
    │                        └─ Returns { qrImage, khqrMark, md5Hash, expiresAt, payment, order }
    │
    └─ navigate("/payment/:orderId") ──► KhqrPayment.jsx
                                            ├─ GET /api/payment/qr-code?order_id=:id
                                            │     └─ Returns { qr_code_url, amount, merchant_name, ... }
                                            ├─ <img src={qr_code_url}> ← real PNG from server
                                            └─ onError fallback chain:
                                                 1. /qr_code_url (API)
                                                 2. /image/qr.jpg (local static → backend/public/image/qr.jpg)
                                                 3. qrserver.com (external last resort)

Bank pushes webhook → POST /payment/khqr-callback
    └─ HMAC-verified, sets payment_status = 'paid', order_status = 'confirmed'

OR

Frontend polls ← GET /api/payment/status/:orderId (every 3s while status = PENDING)
    └─ On PAID → navigate("/order-success/:id")
```

---

## What IS working now

| Feature | Status |
|---|---|
| `POST /api/orders` → creates order | ✅ |
| `POST /api/payment/initiate` → real KhqrService OB1 mark + PNG saved to disk | ✅ |
| `GET /api/payment/qr-code` → returns `data:image/png;base64,…` data-URI | ✅ |
| `KhqrPayment.jsx` fetches QR from `/api/payment/qr-code` and shows `<img src={…}>` | ✅ |
| Static fallback `/image/qr.jpg` in `onError` chain (line 9) | ✅ |
| No more redirect to `/payment/qr` (broken route that didn't exist) | ✅ |
| `Checkout.jsx` navigates to `/payment/:orderId` for QR payments | ✅ |
| Static `.png` served from `fastfood-backend/public/image/qr.jpg` at `/image/qr.jpg` on dev | ✅ |

---

## Key config values

| Var | Default | Location |
|---|---|---|
| `BAKONG_BANK_CODE` | `002` (ABA) | `.env`, `khqr-api/server.js` |
| `MERCHANT_NAME` | `FastFood KH` | `.env`, `config/khqr.php` |
| `API_KEY` | `dev-api-key-change-me` | `.env`, `api.js` (frontend) |
| `X-SIGNATURE` secret | `dev-webhook-secret-change-me` | `.env`, `KhqrPaymentController.php`, `khqr-api/server.js` |

---

## What the user needs to verify

1. **Laravel is running** at `http://127.0.0.1:8000` (`php artisan serve`)
2. **`storage/app/public` symlink exists** (`php artisan storage:link`) — needed for `qr_image_uri` to be served
3. **AuthContext** — user must be logged in (token in `localStorage`) when placing a QR order, so `api.js` can send `Authorization: Bearer …`
4. **`/image/qr.jpg` — file at `fastfood-backend/public/image/qr.jpg` must exist (confirmed ✅)
5. **AB → Open `Checkout.jsx`** → add items → click **"Pay with KHQR"**
   → should land on `/payment/:orderId` showing the real QR image from `/api/payment/qr-code`
6. **Orders → KhqrPayment.jsx** (via order success page `/order-success/:orderId`) → QR from API
