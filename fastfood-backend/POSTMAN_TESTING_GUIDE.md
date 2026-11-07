# KHQR Payment Flow — Postman Testing Guide

> **Base URL:** `http://127.0.0.1:8000`  
> **Auth header on every customer route:**  
> `Authorization: Bearer <SANCTUM_TOKEN>`

---

## ⚙️ Step 0 — Prerequisites

```bash
# 1. Ensure MySQL DB is connected in .env
php artisan migrate          # already done

# 2. Start server
php artisan serve            # http://127.0.0.1:8000

# 3. Get an existing admin token (for admin endpoints):
#    POST /api/login  {email, password}
```

---

## 🔐 1. Register a Customer

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `http://127.0.0.1:8000/api/register` |
| Body | JSON |

```json
{
  "name":     "John Doe",
  "email":    "john@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "phone":    "012345678",
  "address":  "Phnom Penh, Cambodia"
}
```

**Response:**
```json
{
  "message":   "Registration successful",
  "token":     "1|abcd1234efgh5678…",
  "user":      { "id": 1, "name": "John Doe", ... }
}
```
→ Save the `token` for all subsequent requests.

---

## 🛒 2. Browse Menu

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `http://127.0.0.1:8000/api/products` |
| Headers | `Authorization: Bearer {token}` |

Creates the order record via the API.

---

## 📦 3. Place a KHQR Order

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `http://127.0.0.1:8000/api/orders` |
| Headers | `Authorization: Bearer {token}`, `Content-Type: application/json` |

```json
{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 3, "quantity": 1 }
  ],
  "delivery_address":  "#123 St 456, Phnom Penh",
  "payment_method":    "qr_payment",
  "notes":             "No spicy sauce"
}
```

**Expected `201` response:**
```json
{
  "message": "Order placed successfully!",
  "order": {
    "id":          7,
    "total_amount": "15.00",
    "payment_method": "qr_payment",
    "payment_status": "pending",
    "order_status":   "waiting_verification",
    "items": [
      { "id": 1, "name": "Burger",     "quantity": 2, "price": "5.00", "subtotal": "10.00" },
      { "id": 3, "name": "French Fry", "quantity": 1, "price": "5.00", "subtotal":  "5.00" }
    ],
    …
  }
}
```

> **NOTE:** `order_status = waiting_verification` + `payment_status = pending`  
> → The order is now awaiting KHQR payment.

---

## 📱 4. Initiate KHQR Payment

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `http://127.0.0.1:8000/api/payment/initiate` |
| Headers | `Authorization: Bearer {token}` |

```json
{ "order_id": 7, "provider": "aba_payway" }
```

**Response (`200`):**
```json
{
  "success":     true,
  "message":     "KHQR code generated successfully.",
  "qr":          "iVBORw0KGgoAAAA…",    // base64 png
  "reference":   "KHQR-XYZABC12",
  "expires_at":  "2026-05-17T10:30:00Z",
  "amount_khr":  61500,
  "amount_usd":  "15.00",
  "payment":     { … },
  "order":       { … }
}
```

---

## 🔍 5. Poll Payment Status

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `http://127.0.0.1:8000/api/payment/status/7` |

```json
{
  "success":       true,
  "payment_status":"pending",
  "order_status":  "waiting_verification",
  "gateway_status":"pending",
  "paid_at":       null
}
```

### After customer scans & pays (ABA PayWay processes it):

```json
{
  "success":       true,
  "payment_status":"paid",
  "order_status":  "confirmed",
  "gateway_status":"paid",
  "paid_at":       "2026-05-17T10:05:00Z"
}
```

---

## 💳 6. Webhook Callback (ABA PayWay / Bakong)

> Sent by the bank, not by you — **no auth header required** if `KHQR_WEBHOOK_SECRET` is not set.  
> When `KHQR_WEBHOOK_SECRET` is set, ABA includes `X-KHQR-Signature`.

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `http://127.0.0.1:8000/payment/khqr-callback` |

```json
{
  "bill_number":  "KHQR-XYZABC12",
  "status":       "paid",
  "paid_at":      "2026-05-17T10:05:00Z",
  "provider":     "aba_payway"
}
```

**Response:** `200`  
```json
{ "success": true, "status": "paid" }
```

> The callback automatically:
> 1. Finds the `Payment` row by `khqr_bill_number` / `khqr_reference`
> 2. Sets `payment_status = paid` and `order_status = confirmed`
> 3. Fires the `OrderStatusUpdated` broadcast event

---

## 📸 7. Upload Payment Receipt (optional, manual alternative to webhook)

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `http://127.0.0.1:8000/api/payment/upload-receipt` |
| Headers | `Authorization: Bearer {token}`, `Content-Type: multipart/form-data` |
| Body → form-data | `order_id = 7` (number), `receipt = <file>` (image, max 5 MB) |

**Response:**
```json
{
  "success":     true,
  "message":     "Receipt uploaded. Waiting for admin verification.",
  "receipt_url": "http://127.0.0.1:8000/storage/receipts/2026/05/abc.jpg"
}
```

---

## 📋 8. Customer Transaction History

| Field | Value |
|---|---|
| Method | `GET` |
| URL | `http://127.0.0.1:8000/api/payment/transactions` |
| Headers | `Authorization: Bearer {token}` |
| Query params (optional) | `status=paid`, `method=qr_payment`, `date_from=2026-05-01`, `date_to=2026-05-18`, `search=7` |

**Response:**
```json
{
  "data": [
    {
      "id":            7,
      "order_id":      7,
      "transaction_id":"KHQR-XYZABC12",
      "payment_method":"qr_payment",
      "payment_status":"paid",
      "order_status":  "confirmed",
      "total_amount":  15.00,
      "currency":      "KHR",
      "paid_at":       "2026-05-17T10:05:00Z",
      "created_at":    "2026-05-17T09:30:00Z",
      "items_count":   2
    }
  ],
  "current_page": 1,
  "last_page":    1,
  "total":        1,
  "per_page":     15
}
```

---

## 🔁 9. Refund (Admin only)

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `http://127.0.0.1:8000/api/payment/refund/7` |
| Headers | `Authorization: Bearer {ADMIN_TOKEN}` |

```json
// optional body — omit to refund full amount
{ "amount": 15000 }
```

**Response:**
```json
{ "success": true, "message": "Refund processed", "result": { "status": "refunded" } }
```

---

## 🧪 Quick Postman Environment Variables

| Key | Value |
|---|---|
| `baseUrl` | `http://127.0.0.1:8000` |
| `token` | (paste customer token from step 1) |
| `adminToken` | (paste admin token from login step) |
| `orderId` | (order ID returned by step 3) |

---

## ⏱️ Expected Status Flow

```
"waiting_verification"  ← order just created
        |
  [customer scans QR ── ABA processes ── webhook fires]
        |
"confirmed"             ← payment_status === "paid"
        |
"preparing"             ← kitchen starts cooking
        |
"ready"                 ← ready for delivery
        |
"delivered"             ← rider confirms delivery
```

If payment is **rejected by admin** or **gateway returns failed**:

```
"waiting_verification"  ── reject / fail
        |
"cancelled"   +   payment_status = "rejected"
```

---

## 🔐 Security Notes

| Rule | Reason |
|---|---|
| Always send `Authorization: Bearer` on customer API routes | Sanctum `auth:sanctum` middleware enforces it |
| Verify `KHQR_WEBHOOK_SECRET` in production | Prevents spoofed callback payloads |
| Never log raw `Authorization` headers | Stack traces could leak tokens |
| Use `withToken()` (axios) or `Authorization:` (fetch) consistently | Token header is the single source of trust |
| The webhook is open (no auth middleware) | Signature HMAC verification is the only trust gate |
