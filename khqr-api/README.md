# 🍔 FastFood KHQR — Node.js + Express Payment Microservice

> Standalone Express microservice that generates and verifies **Bakong KHQR** payment codes for the Fastfood Cambodia checkout flow.

---

## Architecture

```
fastfood-frontend  (React + Vite)
  │
  │  POST  /api/payments/initiate        body: { orderId, amountKhr }
  │  GET   /api/payments/status/:orderId  (every 3 s)
  │  POST  /api/payments/webhook/callback ← Bakong pushes IPN here
  ▼
khqr-api  (Node.js + Express)   ← you are here
  │
  │  bakong-khqr  →  EMVCo OB1 mark string
  │  qrcode       →  PNG data-URI ("image in the folder")
  │  mongoose     →  order + payment document store
  ▼
MongoDB  (khqr_orders  — .env response collects schema)
```

Laravel handles **auth, menu, orders**. This service owns the **payment lifecycle** from QR initiation to confirmation.

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 18 LTS (20 recommended) |
| MongoDB | 5.x or 6.x (local or Atlas) |
| npm | 9.x |

Install MongoDB locally (WAMP already covers PHP/MySQL — Mongo is separate):

```powershell
# WAMP optional — MongoDB via community installer:
# https://www.mongodb.com/try/download/community
```

---

## Quick Start (Sandbox — no bank account needed)

```powershell
# 1 · Navigate to the service directory
cd C:\wamp64\www\Online_Ordering\khqr-api

# 2 · Install dependencies
npm install

# 3 · Create your environment file
copy .env.example .env

# 4 · Start the service (NODE_ENV=development = Bakong Sandbox)
npm run sandbox

#   OR just:
set NODE_ENV=development
npm start

#   Service boots on http://localhost:3001
```

---

## Environment Variables (.env)

```ini
# ── Server ──────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development          # development = Bakong Sandbox (no real account)

# ── Database ────────────────────────────────────────────────────────────────
MONGODB_URI=mongodb://127.0.0.1:27017/fastfood_khqr

# ── Merchant info (displayed on the bank statement / QR metadata) ───────────
MERCHANT_NAME=FastFood KH
MERCHANT_CITY=Phnom Penh

# ── Bank selection ──────────────────────────────────────────────────────────
BAKONG_BANK_CODE=002          # 001=ACLEDA | 002=ABA | 009=Wing

# Live clearing accounts (set these only when going to production)
# MERCHANT_KHR_ACCOUNT=010161254
# MERCHANT_USD_ACCOUNT=010161254

# ── Security ────────────────────────────────────────────────────────────────
WEBHOOK_SECRET=change-this-to-a-long-random-string
API_KEY=dev-api-key-change-me   # sent as X-API-Key header

# ── CORS / Frontend ─────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173
```

---

## API Reference

All routes below are prefixed with the service root URL — `http://localhost:3001`.

```
GET  /health
POST /api/payments/initiate
GET  /api/payments/status/:orderId
POST /api/payments/webhook/callback
GET  /api/admin/payments
GET  /api/admin/payments/:orderId
POST /api/admin/payments/:orderId/refund
```

---

### `GET /health`

Liveness check — returns the service status and active bank code.

```bash
curl http://localhost:3001/health
```

```json
{
  "service": "khqr-api",
  "status": "ok",
  "bank": "ABA",
  "env": "development"
}
```

---

### `POST /api/payments/initiate` — Generate KHQR

This is the **core endpoint**. Called once when the customer lands on the payment page.

**Auth header** (required in production):  
`X-API-Key: dev-api-key-change-me`

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `orderId` | string/number | ✅ | Your internal order ID |
| `amountKhr` | number | ✅ | Amount in **Riel** (e.g. 24 500) |
| `currency` | string | ❌ | `"KHR"` (default) or `"USD"` |
| `items` | array | ❌ | Order line-items (stored for audit) |
| `deliveryAddress` | string | ❌ | Customer address |

**Example request**

```bash
curl -X POST http://localhost:3001/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-me" \
  -d '{"orderId":"FF-20250501-001","amountKhr":24500,"currency":"KHR"}'
```

**Response (`201 Created`)**

```json
{
  "success": true,
  "khqrMark":      "000201...",           // raw EMVCo OB1 TLV string (send this to qrcode.react)
  "khqrReference": "ABA-X7K9M2P4L",       // QR reference / bill number shown on bank statement
  "md5Hash":       "a1b2c3...",           // SHA-256 / MD5 of the mark — verify in webhook
  "qrImage":       "data:image/png;base64,iVBORw0KGgo...",  // ← "image in the folder"
  "qrImageDataUri":"data:image/png;base64,iVBORw0KGgo...",  // same, explicit name
  "paymentIndex":  "ABA-X7K9M2P4L",
  "accountId":     "010161254",
  "billNumber":    "ABA-X7K9M2P4L",
  "expiresAt":     "2026-05-17T09:35:00.000Z",    // 2-hour TTL
  "merchant":      { "name":"FastFood KH","city":"Phnom Penh","bank":"ABA" }
}
```

**React** — render the QR code (the **image is already in the folder** — no second fetch):

```tsx
import { QRCodeSVG } from "qrcode.react";

<QRCodeSVG value={d.khqrMark} size={220} level="M" includeMargin />
{/* or use the PNG directly */}
<img src={d.qrImage} alt="KHQR" className="h-64 w-64 object-contain" />
```

---

### `GET /api/payments/status/:orderId` — Poll Payment Status

Called **every 3 seconds** by the frontend while the customer is on the QR page.

```bash
curl -H "X-API-Key: dev-api-key-change-me" \
  http://localhost:3001/api/payments/status/FF-20250501-001
```

```json
{ "success": false, "status": "PENDING",   "expiresAt": "2026-05-17T09:35:00.000Z" }
{ "success": true,  "status": "PAID",       "paidAt": "2026-05-17T09:02:11.000Z" }
{ "success": false, "status": "EXPIRED" }
```

When `status === "PAID"` the frontend clears the interval and redirects to the order-success page.

---

### `POST /api/payments/webhook/callback` — Bank IPN

Sent by **Bakong ABA** at the instant the customer completes payment.  
This is the authoritative source of truth — always update the DB and **ignore** the
polling result if the webhook already ran.

**Auth**: `X-SIGNATURE: <HMAC-SHA256(rawBody, WEBHOOK_SECRET)>`

```bash
curl -X POST http://localhost:3001/api/payments/webhook/callback \
  -H "Content-Type: application/json" \
  -H "X-SIGNATURE: <hmac-sha256-of-raw-body>" \
  -d '{"billNumber":"ABA-X7K9M2P4L","status":"SUCCESS","paymentIndex":"ABA-X7K9M2P4L"}'
```

```json
{ "acknowledged": true, "orderId": "FF-20250501-001", "status": "PAID" }
```

The module updates ` Payments` to `"PAID"`, sets `paidAt`, and writes a `PaymentLog` entry.

---

### `POST /api/admin/payments/:orderId/refund` — Admin Refund

```bash
curl -X POST http://localhost:3001/api/admin/payments/FF-20250501-001/refund \
  -H "X-API-Key: dev-api-key-change-me" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Duplicate charge"}'
```

---

## Response package.json (response-package.json)

The full runtime dependency list is included as `response-package.json` so you can
install it in a bare project in one step:

```bash
npm install --save "$(cat response-package.json | jq -r '.dependencies | to_entries[] | "\(.key)@\(.value)"' | paste -sd ' ')"
```

---

## Node.js — Cron Watchdog

`server.js` starts a `node-cron` job that runs every 5 minutes:

```
*/5 * * * *  →  Payments.updateMany({ status:PENDING, expiresAt:{$lt:now()} })
```

All expired payments are automatically marked `"EXPIRED"` — no manual cleanup needed.

---

## Running in Production

1. Set `NODE_ENV=production` and `BAKONG_API_URL=https://api.bakong.nbc.gov.kh` (production, not sandbox).
2. Add your real **merchant KHR / USD account numbers** from the Bakong / ABA PayWay dashboard.
3. Set a strong `WEBHOOK_SECRET` and configure the Bakong callback URL in your bank portal:

```
https://your-domain.com/api/payments/webhook/callback
```

4. Put a reverse proxy (Nginx/Cloudflare) in front with rate limiting.
5. Swap MongoDB to a managed cluster (MongoDB Atlas) for HA.

---

## Error Summary

| Status | Meaning |
|---|---|
| `201` | KHQR generated successfully — image is in the response |
| `400` | Missing / invalid fields in request body |
| `403` | Wrong or missing `X-API-Key` in production |
| `404` | `orderId` not found in Payments collection |
| `500` | Bakong gateway error or internal server error |

---

## Frontend Integration Example (React + qrcode.react)

```tsx
// ── KhqrPayment.jsx — trimmed
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

const API = "http://localhost:3001";
const KEY = "dev-api-key-change-me";

export default function KhqrPayment() {
  const { id } = useParams();
  const [mark,  setMark]  = useState("");
  const [qrImg, setQrImg] = useState("");
  const [status,setStatus]= useState("PENDING");

  // 1 · Initiate on mount
  useEffect(() => {
    (async () => {
      const res  = await fetch(`${API}/api/payments/initiate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": KEY },
        body: JSON.stringify({ orderId: id, amountKhr: 24500 }),
      });
      const d = await res.json();
      setMark(d.khqrMark);
      setQrImg(d.qrImage);           // "image in the folder" on first call
    })();
  }, [id]);

  // 2 · Poll every 3 s
  useEffect(() => {
    if (status === "PAID") return;
    const iv = setInterval(async () => {
      const { status: s } = await (await fetch(`${API}/api/payments/status/${id}`, {
        headers: { "X-API-Key": KEY },
      })).json();
      setStatus(s);
      if (s === "PAID") { clearInterval(iv); navigate(`/success/${id}`); }
    }, 3000);
    return () => clearInterval(iv);
  }, [id, status]);

  return (
    <div>
      {/* RAW MARK - WORKS EVEN IF CORS BLOCKS IMAGES */}
      <QRCodeSVG value={mark} size={220} level="M" includeMargin />

      {/* BAKONG KHR STANDARDS - image in the folder from initiate() */}
      {qrImg && <img src={qrImg} alt="KHQR" className="h-64" />}

      {status === "PAID" && <p>✅ Confirmed — redirecting…</p>}
    </div>
  );
}
```

---

## Security Checklist

| ✅ | Practice |
|---|---|
| ✅ | `X-API-Key` header required on all customer + admin routes in production |
| ✅ | HMAC-SHA256 webhook signature verification (`timingSafeEqual`) |
| ✅ | `helmet()` security headers on every response |
| ✅ | CORS whitelist — only `FRONTEND_URL` origins pass |
| ✅ | No real credentials in `.env.example` — all blank placeholders |
| ✅ | Idempotent webhook — safe to call multiple times without double-spend |
| ✅ | `NODE_ENV !== production` → auto-sandbox mode, no live account needed |
