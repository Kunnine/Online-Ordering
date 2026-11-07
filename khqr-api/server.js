/**
 * ══════════════════════════════════════════════════════════════════════════════
 * KHQR Express Microservice — Bakong KHQR Payment Gateway
 *
 * Purpose
 *   Standalone Node.js service that owns all KHQR payment logic. The React
 *   SPA (fastfood-frontend) calls this service directly — the Laravel app is
 *   untouched for checkout / payment flows.
 *
 * Flow
 *   1. POST   /api/payments/initiate   → generate EMVCo KHQR mark + QR image
 *   2. GET    /api/payments/status/:id → poll order status (frontend calls every 3 s)
 *   3. POST   /api/payments/webhook/callback → bank pushes IPN here when customer pays
 *   4. GET    /health                  → liveness check
 *
 * Sandbox credentials
 *   Set ENV=development to run in Bakong Sandbox — no real merchant account
 *   or API key is needed.  Set ENV=production for live Bakong endpoints.
 *
 * Required env vars — see khqr-api/.env.example
 * ══════════════════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import express   from "express";
import cors      from "cors";
import helmet    from "helmet";
import mongoose  from "mongoose";
import cron      from "node-cron";
import { v4    as uuidv4 }  from "uuid";
import crypto    from "crypto";
import z         from "zod";
import { KHQR, CreditEndpoint, DebitEndpoint } from "bakong-khqr";
import QRCode from "qrcode";          // v1.x — ESM default export

/* ══════════════════════════════════════════════════════════════════════════════
 * 1 · ENVIRONMENT
 ══════════════════════════════════════════════════════════════════════════════ */
const {
  PORT              = 3001,
  NODE_ENV          = "development",
  MONGODB_URI       = "mongodb://127.0.0.1:27017/fastfood_khqr",

  // Bakong sandbox uses these hard-coded values (no real account needed)
  BAKONG_API_URL    = "https://api-bakong.nbc.gov.kh",
  BAKONG_BANK_CODE  = "002",               // 002 = ABA, 001 = ACLEDA, 009 = Wing

  // Live credentials (only needed in production)
  MERCHANT_NAME     = "FastFood KH",
  MERCHANT_CITY     = "Phnom Penh",
  MERCHANT_KHR_ACCOUNT = "010161254",
  MERCHANT_USD_ACCOUNT = "010161254",

  // Security
  WEBHOOK_SECRET    = "dev-webhook-secret-change-me",
  API_KEY           = "dev-api-key-change-me",
  FRONTEND_URL      = "http://localhost:5173",
} = process.env;

const CORS_ORIGINS = [FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"].filter(Boolean);
const BANK_NAME = { "001": "ACLEDA", "002": "ABA", "009": "WING" }[BAKONG_BANK_CODE] ?? "ABA";

/* ✅ Validate env at boot — fail fast on startup, not at runtime */
const ok = z.object({
  PORT:              z.coerce.number().positive().default(3001),
  MONGODB_URI:       z.string().min(1),
  MERCHANT_NAME:     z.string().min(1).default("FastFood KH"),
  MERCHANT_CITY:     z.string().min(1).default("Phnom Penh"),
  BAKONG_BANK_CODE:  z.string().regex(/^\d{3}$/).default("002"),
  BAKONG_API_URL:    z.string().url().default("https://api-bakong.nbc.gov.kh"),
  WEBHOOK_SECRET:    z.string().min(1).default("dev-webhook-secret-change-me"),
  API_KEY:           z.string().min(1).default("dev-api-key-change-me"),
  FRONTEND_URL:      z.string().url().default("http://localhost:5173"),
}).safeParse(process.env);
if (!ok.success) {
  for (const i of ok.error.issues) console.error("❌ ENV:", i.path.join("."), i.message);
  process.exit(1);
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 2 · MONGODB — Order + Payment Log schema
 ══════════════════════════════════════════════════════════════════════════════ */
const orderSchema = new mongoose.Schema(
  {
    orderId:          { type: String, unique: true, index: true, required: true },
    status:           { type: String, enum: ["PENDING","PAID","EXPIRED","FAILED","REFUNDED"], default: "PENDING", index: true },
    amountKhr:        { type: Number, required: true, min: 1 },
    amountUsd:        { type: Number, default: 0 },
    currency:         { type: String, default: "KHR" },
    bankCode:         { type: String, default: BAKONG_BANK_CODE },
    billNumber:       { type: String, required: true, unique: true, index: true },
    /** raw EMVCo OB1 mark string — frontend sends this to qrcode.react */
    khqrMark:         { type: String, required: true },
    khqrReference:    { type: String, required: true, index: true },
    md5Hash:          { type: String },
    qrImageDataUri:   { type: String },   // data:image/png;base64,… for the "image in folder" request
    paymentIndex:     { type: String },
    accountId:        { type: String },
    expiresAt:        { type: Date, required: true, index: true },
    paidAt:           { type: Date },
    items:            { type: [mongoose.Schema.Types.Mixed], default: [] },
    deliveryAddress:  { type: String, default: "" },
    notes:            { type: String, default: "" },
  },
  { timestamps: true,    // createdAt, updatedAt
    collection: "payments" }   // ← flat .env response collects schema here
);
const Payments = mongoose.model("Payments", orderSchema);

const logSchema = new mongoose.Schema(
  {
    orderId:      { type: String, required: true, index: true },
    billNumber:   { type: String },
    event:        { type: String, required: true },
    status:       { type: String },
    rawPayload:   { type: Object },
    createdAt:    { type: Date, default: Date.now },
  }
);
const PaymentLog = mongoose.model("PaymentLog", logSchema);

/* ══════════════════════════════════════════════════════════════════════════════
 * 3 · EXPRESS APP + MIDDLEWARE
 ══════════════════════════════════════════════════════════════════════════════ */
const app = express();
app.use(helmet());
app.use(cors({ origin: CORS_ORIGINS }));
app.use(express.json({ limit: "64kb" }));

/** 🔐 Bearer-token guard — skipped in sandbox/dev mode */
function bearerGuard(req, res, next) {
  if (NODE_ENV !== "production") return next();
  const key = req.headers["x-api-key"] ?? req.query.api_key;
  if (key === API_KEY) return next();
  return res.status(403).json({ error: "Forbidden — invalid or missing X-API-Key" });
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 4 · HEALTH
 ══════════════════════════════════════════════════════════════════════════════ */
app.get("/health", (_req, res) =>
  res.json({ service: "khqr-api", status: "ok", bank: BANK_NAME, env: NODE_ENV })
);

/* ══════════════════════════════════════════════════════════════════════════════
 * 5 · INITIATE — POST /api/payments/initiate
 *
 * Body  { orderId, amountKhr, currency?, items?, deliveryAddress? }
 * Returns the raw KHQR mark + a generated PNG data-URI so the frontend has
 * the "image in the folder" from day one without another request.
 ══════════════════════════════════════════════════════════════════════════════ */
app.post("/api/payments/initiate", bearerGuard, async (req, res) => {
  const { orderId, amountKhr, currency = "KHR", items = [], deliveryAddress = "" } = req.body;

  /* ── validate ─────────────────────────────────────────────────────────── */
  if (!orderId?.toString().trim()) return res.status(400).json({ error: "orderId is required" });
  const amt = Number(amountKhr);
  if (!Number.isFinite(amt) || amt < 1) return res.status(400).json({ error: "amountKhr must be >= 1" });

  try {
    /* ── reject if order already has a live, unexpired QR ────────────────── */
    const existing = await Payments.findOne({ orderId: String(orderId) });
    if (existing && existing.status === "PENDING" && existing.expiresAt > new Date()) {
      return res.json({
        success:      true,
        khqrMark:     existing.khqrMark,
        khqrReference: existing.khqrReference,
        md5Hash:      existing.md5Hash,
        qrImage:      existing.qrImageDataUri,
        expiresAt:    existing.expiresAt.toISOString(),
      });
    }

    /* ── build EMVCo mark via bakong-khqr CreditEndpoint ─────────────────── */
    const uid        = uuidv4().replace(/-/g, "").toUpperCase().slice(0, 16);
    const billNumber = `${BANK_NAME}-${uid}`;           // e.g. ABA-7F3A1C9DE8B20416

    /** In Sandbox (ENV !== production) we skip the live Bakong network call
     *  and build the OB1 mark string ourselves so QR generation works offline. */
    let markResult;
    if (NODE_ENV === "production") {
      const credit = new CreditEndpoint({
        acqId:        BAKONG_BANK_CODE,
        accountId:    currency === "USD" ? MERCHANT_USD_ACCOUNT : MERCHANT_KHR_ACCOUNT,
        merchantName: MERCHANT_NAME,
        merchantCity: MERCHANT_CITY,
        acquireName:  BANK_NAME,
        billNumber,
        currency,
      });
      markResult = await credit.billCreate(amt);
    } else {
      /* ── Sandbox: hand-craft a compliant OB1 mark string ──────────────────
       *  OB1 structure (Bakong KHQR v1 spec):
       *    Tag00  = "01"           ← Bakong KHQR tag
       *    Tag29  = "02"           ← Credit direction
       *    Tag30  = 32-char hex    ← Merchant Account (bankCode + accountId)
       *    Tag31  = "KH"           ← Country code
       *    Tag32  = merchantName
       *    Tag33  = merchantCity
       *    Tag52  = billNumber
       *    Tag53  = currency + amount  (e.g. "KHR12000")
       *    Tag54  = YYYYMMDD        ← expiry
       *    Tag59  = SHA256(…) 64-char hex  ← checksum ─┐
       *    Tag62  = merchant Address 2                │
       *    Tag63  = merchant Address 3                │
       *    Tag81  = billerFee                         │
       *    Tag91  = bilerlabel mer_name               │
       *    Tag98  = sha256(payload) 64-char hex      ─┤
       *    Tag99  = payload length                     │
       *    Tag80=merchantAddress1                      │
       *    Tag80,Tag62,Tag63 – merchant address lines
       */
      const expiryDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, "");
      const merchantAccHex = (BAKONG_BANK_CODE + MERCHANT_KHR_ACCOUNT).replace(/\D/g, "").padStart(32, "0");
      const payload =
        `000201` +                         // OB1 tag + version
        `0208${BAKONG_BANK_CODE}0100` +    // Tag02 Bank ID
        `0213Khqr By Aba` +               // Tag02 sub ID
        `0310${currency}${amt}` +          // Tag03 Transaction currency + amount
        `29${BANK_NAME}` +                 // Tag29 acquiring institution
        `30${merchantAccHex}` +            // Tag30 merchant account
        `3118${MERCHANT_NAME.padEnd(16).slice(0, 16)}` +  // Tag31 merchant name
        `3206${MERCHANT_CITY.padEnd(6).slice(0, 6)}` +    // Tag32 merchant city
        `52${billNumber}` +                // Tag52 bill number
        `53${expiryDate}` +                // Tag53 expiry YYYYMMDD
        `8003CRC` +                        // Tag80 CRC placeholder (replaced below)
        `${billNumber}`;                   // residual payload bytes
      /* compute CRC-16-CCITT over the payload (TLV excluding the CRC field itself) */
      const crc = crc16(payload.replace(/8003CRC.{4}/, "8003"));
      const mark = payload.replace(/8003CRC/, `8004${crc.toString(16).toUpperCase().padStart(4, "0")}`);
      markResult = { mark, md5: crypto.createHash("md5").update(mark).digest("hex"), paymentIndex: billNumber, accountId: MERCHANT_KHR_ACCOUNT };
    }

    const mark          = markResult.mark;
    const md5Hash       = markResult.md5 ?? crypto.createHash("md5").update(mark).digest("hex");
    const paymentIndex  = markResult.paymentIndex ?? billNumber;
    const accountId     = markResult.accountId  ?? MERCHANT_KHR_ACCOUNT;

    /* ── generate QR image from mark string ────────────────────────────────
     *  response-package.json: qrcode  →  PNG data-URI
     *  stored as "image in the folder" (base64-QR returns on same call)
     */
    const qrImage = await QRCode.toDataURL(mark, { width: 340, margin: 2 });

    /* ── persist ──────────────────────────────────────────────────────────── */
    const twoHours = 2 * 60 * 60 * 1000;
    const doc = await Payments.findOneAndUpdate(
      { orderId: String(orderId) },
      {
        orderId:        String(orderId),
        status:         "PENDING",
        amountKhr:      amt,
        amountUsd:      Math.round((amt / 4100) * 100) / 100,
        currency,
        bankCode:       BAKONG_BANK_CODE,
        billNumber,
        khqrMark:       mark,
        khqrReference:  billNumber,
        md5Hash,
        qrImageDataUri: qrImage,
        paymentIndex,
        accountId,
        expiresAt:      new Date(Date.now() + twoHours),
        deliveryAddress,
        items,
      },
      { upsert: true, new: true }
    );

    await PaymentLog.create({ orderId: doc.orderId, billNumber, event: "CREATED", status: "PENDING", rawPayload: markResult });

    console.log(`[INIT] order=${orderId} bill=${billNumber} amt=${amt}KHR`);

    return res.status(201).json({
      success:       true,
      khqrMark,                          // raw EMVCo mark string
      khqrReference: billNumber,         // QR reference
      md5Hash,
      qrImage,                           // "image in the folder" — data:image/png;base64,…
      qrImageDataUri: qrImage,           // alias for backwards compat
      paymentIndex,
      accountId,
      billNumber,
      expiresAt:     doc.expiresAt.toISOString(),
      merchant:      { name: MERCHANT_NAME, city: MERCHANT_CITY, bank: BANK_NAME },
    });

  } catch (err) {
    console.error("[INIT ERROR]", err.message);
    return res.status(500).json({ error: "KHQR generation failed", details: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
 * 6 · STATUS POLL — GET /api/payments/status/:orderId
 *    Frontend calls this every 3 s
 ══════════════════════════════════════════════════════════════════════════════ */
app.get("/api/payments/status/:orderId", bearerGuard, async (req, res) => {
  const { orderId } = req.params;
  try {
    const doc = await Payments.findOne({ orderId });
    if (!doc) return res.status(404).json({ error: "Order not found", status: "NOT_FOUND" });

    /* If already paid — return immediately */
    if (doc.status === "PAID")
      return res.json({ success: true, status: "PAID", paidAt: doc.paidAt?.toISOString() });

    /* If expired */
    if (doc.expiresAt < new Date())
      return res.json({ success: false, status: "EXPIRED" });

    /* ── peek at Bakong to see if payment arrived since our last poll ────── */
    try {
      const debit = new DebitEndpoint({
        acqId:     doc.bankCode    ?? BAKONG_BANK_CODE,
        accountId: doc.accountId   ?? MERCHANT_KHR_ACCOUNT,
      });
      // checkTransaction(paymentIndex) returns a boolean-ish truthy/falsy
      const paid = await debit.checkTransaction(doc.paymentIndex ?? doc.billNumber);
      if (paid) {
        await Payments.updateOne(
          { _id: doc._id },
          { status: "PAID", paidAt: new Date() }
        );
        await PaymentLog.create({ orderId: doc.orderId, billNumber: doc.billNumber, event: "STATUS_POLL", status: "PAID" });
        return res.json({ success: true, status: "PAID", paidAt: new Date().toISOString() });
      }
    } catch (gwErr) {
      /* Bakong sandbox may throw on checkTransaction — fall back to DB status */
      console.warn("[STATUS GW]", gwErr.message);
    }

    res.json({ success: false, status: doc.status, expiresAt: doc.expiresAt.toISOString() });
  } catch (e) {
    console.error("[STATUS ERROR]", e.message);
    res.status(500).json({ error: "Status check failed", details: e.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
 * 7 · WEBHOOK — POST /api/payments/webhook/callback
 *
 * Bakong pushes an IPN here the moment the customer completes payment.
 * Verified with HMAC-SHA256 using WEBHOOK_SECRET from .env.
 * Safe to call multiple times — idempotent DB update.
 ══════════════════════════════════════════════════════════════════════════════ */
app.post("/api/payments/webhook/callback", async (req, res) => {
  const rawBody   = JSON.stringify(req.body ?? {});
  const signature = req.header("X-SIGNATURE");
  const origin    = req.ip;

  /* ── HMAC verify ─────────────────────────────────────────────────────────── */
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""))) {
    console.warn("[WEBHOOK] Bad sig from", origin);
    return res.status(401).json({ error: "Invalid signature" });
  }

  const body       = req.body ?? {};
  const orderId    = String(body.billNumber ?? body.bill_number ?? body.orderId ?? "");
  const gwStatus   = String(body.status ?? body.paymentStatus ?? "").toUpperCase();
  const paymentIdx = body.paymentIndex ?? body.payment_index;

  if (!orderId) return res.status(400).json({ error: "billNumber required" });

  try {
    const isPaid = ["SUCCESS", "PAID", "SETTLED", "COMPLETED"].includes(gwStatus);
    const update = {
      status:       isPaid ? "PAID" : gwStatus === "FAILED" || gwStatus === "REJECTED" ? "FAILED" : "PENDING",
      paidAt:       isPaid ? new Date() : undefined,
      paymentIndex: paymentIdx,
    };
    const result = await Payments.findOneAndUpdate(
      { orderId }, { $set: update },
      { new: true }
    );
    if (!result) return res.status(404).json({ error: "Order not found" });

    await PaymentLog.create({
      orderId: result.orderId,
      billNumber: result.billNumber,
      event: "WEBHOOK",
      status: update.status,
      rawPayload: body,
    });
    res.json({ acknowledged: true, orderId, status: update.status });
  } catch (e) {
    console.error("[WEBHOOK ERR]", e.message);
    res.status(500).json({ error: "Webhook failed", details: e.message });
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
 * 8 · ADMIN
 ══════════════════════════════════════════════════════════════════════════════ */
app.get("/api/admin/payments", bearerGuard, async (req, res) => {
  const { status, dateFrom, dateTo, search } = req.query;
  const q = {};
  if (status) q.status = status.toUpperCase();
  if (dateFrom || dateTo) {
    q.createdAt = {};
    if (dateFrom) q.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   q.createdAt.$lte = new Date(dateTo);
  }
  if (search) q.orderId = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const list = await Payments.find(q).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ total: list.length, data: list });
});

app.get("/api/admin/payments/:orderId", bearerGuard, async (req, res) => {
  const pay = await Payments.findOne({ orderId: req.params.orderId }).lean();
  if (!pay) return res.status(404).json({ error: "Not found" });
  const logs = await PaymentLog.find({ orderId: pay.orderId }).sort({ createdAt: -1 }).lean();
  res.json({ order: pay, logs });
});

app.post("/api/admin/payments/:orderId/refund", bearerGuard, async (req, res) => {
  const { reason = "" } = req.body;
  const pay = await Payments.findOneAndUpdate(
    { orderId: req.params.orderId },
    { status: "REFUNDED", ...(reason ? { errorMessage: reason } : {}) },
    { new: true }
  );
  if (!pay) return res.status(404).json({ error: "Not found" });
  await PaymentLog.create({ orderId: pay.orderId, billNumber: pay.billNumber, event: "ADMIN_REFUND", status: "REFUNDED" });
  res.json({ success: true, order: pay });
});

/* ══════════════════════════════════════════════════════════════════════════════
 * 9 · ERROR HANDLER + BOOT
 ══════════════════════════════════════════════════════════════════════════════ */
app.use("*", (_, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error("[UNHANDLED]", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

/* CRC-16-CCITT for Sandbox OB1 mark */
function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return crc & 0xFFFF;
}

async function start() {
  await mongoose.connect(MONGODB_URI);
  console.log(`[MongoDB] ${mongoose.connection.name}  bank=${BANK_NAME}  env=${NODE_ENV}`);

  app.listen(PORT, () => {
    console.log(`\n[KHQR-API]  →  http://localhost:${PORT}`);
    console.log(`  POST  /api/payments/initiate         generate QR`);
    console.log(`  GET   /api/payments/status/:orderId   poll status`);
    console.log(`  POST  /api/payments/webhook/callback  bank IPN`);
    console.log(`  GET   /health                         liveness\n`);
  });

  /* ── expiry watchdog: mark expired PENDING rows every 5 min ─────────── */
  cron.schedule("*/5 * * * *", async () => {
    const { modifiedCount } = await Payments.updateMany(
      { status: "PENDING", expiresAt: { $lt: new Date() } },
      { $set: { status: "EXPIRED" } }
    );
    if (modifiedCount) console.log(`[CRON] expired ${modifiedCount} payment(s)`);
  });
}
start().catch((e) => { console.error("[BOOT]", e); process.exit(1); });
