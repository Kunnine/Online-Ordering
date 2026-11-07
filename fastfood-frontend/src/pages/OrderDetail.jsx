import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

const STEPS = [
  { key: "pending", label: "Order Placed", icon: "📋" },
  { key: "waiting_verification", label: "Verifying Payment", icon: "🔍" },
  { key: "confirmed", label: "Confirmed", icon: "✅" },
  { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
  { key: "ready", label: "Ready", icon: "📦" },
  { key: "delivered", label: "Delivered", icon: "🎉" },
];

const PAYMENT_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  unpaid: "bg-gray-100 text-gray-700",
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const echoRef = useRef(null);

  const formatKHR = (value) => {
    const num = Number(value);
    return isNaN(num) ? "0" : num.toFixed(0);
  };

  const fetchOrder = useCallback(async () => {
    try {
      const res = await api.get("/orders/" + id);
      setOrder(res.data);
    } catch {
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const setupEcho = useCallback(async () => {
    try {
      const echoModule = await import("../echo");
      const echo = echoModule.default;

      // Realtime is optional — skip silently if Echo is disabled / not running.
      if (!echo) return;

      echoRef.current = echo;

      echo
        .channel("orders." + id)
        .listen(".order.updated", (data) => {
          if (data?.order) {
            setOrder(data.order);
            setLive(true);
            setTimeout(() => setLive(false), 3000);
          }
        });
    } catch {
      console.log("Echo not running");
    }
  }, [id]);

  const cleanupEcho = useCallback(() => {
    if (echoRef.current) {
      try {
        echoRef.current.leave("orders." + id);
      } catch {
        // ignore
      }
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    setupEcho();
    return () => cleanupEcho();
  }, [fetchOrder, setupEcho, cleanupEcho]);

  const shouldPoll =
    order && !["delivered", "cancelled"].includes(order.order_status);

  useEffect(() => {
    if (!shouldPoll) return;

    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [shouldPoll, fetchOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-56 sm:h-64">
        <p className="text-orange-500 animate-pulse text-base sm:text-lg">Loading order...</p>
      </div>
    );
  }

  if (!order) return null;

  const currentStep = STEPS.findIndex((s) => s.key === order.order_status);

  const isCancelled = order.order_status === "cancelled";
  const isDelivered = order.order_status === "delivered";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-white shadow rounded-2xl p-5 sm:p-6 text-center mb-4 sm:mb-6">
        <div className="text-5xl sm:text-6xl mb-2">
          {isCancelled ? "❌" : isDelivered ? "🎉" : "🍔"}
        </div>

        <h1 className="text-lg sm:text-xl font-bold">Order #{order.id}</h1>

        <p className="text-gray-500 capitalize text-sm sm:text-base">{order.order_status?.replace("_", " ")}</p>

        <div className="mt-2.5 sm:mt-3">
          <span
            className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm ${PAYMENT_STATUS_COLORS[order.payment_status]}`}
          >
            Payment: {order.payment_status}
          </span>
        </div>

        {live && <p className="text-green-500 text-xs mt-1.5">● Live update</p>}
      </div>

      {order.payment_method === "qr_payment" &&
        order.payment_status === "pending" && (
          <div className="bg-white shadow rounded-2xl p-5 sm:p-6 mb-4 sm:mb-6 text-center">
            <h2 className="font-semibold mb-2.5 sm:mb-3 text-base sm:text-lg">Scan KHQR to Pay</h2>

            {order.payment?.qr_image_uri ? (
              <img
                src={order.payment.qr_image_uri}
                alt="KHQR"
                className="mx-auto w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain"
                loading="lazy"
              />
            ) : order.payment?.qr_image_base64 ? (
              <img
                src={'data:image/png;base64,' + order.payment.qr_image_base64}
                alt="KHQR"
                className="mx-auto w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain"
                loading="lazy"
              />
            ) : (
              <p className="text-sm sm:text-base">No QR available</p>
            )}

            <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
              Waiting for payment...
            </p>
          </div>
        )}

      {!isCancelled && (
        <div className="bg-white shadow rounded-2xl p-5 sm:p-6 mb-4 sm:mb-6">
          <h2 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">Order Progress</h2>

          <div className="flex justify-between">
            {STEPS.map((step, i) => (
              <div key={step.key} className="text-center flex-1">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full flex items-center justify-center text-xs sm:text-sm ${
                    i <= currentStep
                      ? "bg-orange-500 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  {step.icon}
                </div>
                <p className="text-[10px] sm:text-xs mt-1 leading-tight px-0.5">
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-2xl p-5 sm:p-6 mb-4 sm:mb-6">
        <h2 className="font-semibold mb-2.5 sm:mb-4 text-base sm:text-lg">Order Items</h2>

        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between mb-1.5 sm:mb-2">
            <div>
              <p className="font-medium text-sm sm:text-base">{item.product?.name || "Product"}</p>
              <p className="text-xs sm:text-sm text-gray-500">x{item.quantity}</p>
            </div>

            <p className="font-semibold text-sm sm:text-base">
              $ {formatKHR(item.subtotal ?? item.price * item.quantity ?? 0)}
            </p>
          </div>
        ))}

        <div className="border-t pt-2.5 sm:pt-3 flex justify-between font-bold text-sm sm:text-base">
          <span>Total</span>
          <span className="text-orange-500">
            $ {formatKHR(order.total_amount)}
          </span>
        </div>
      </div>

      <div className="bg-white shadow rounded-2xl p-5 sm:p-6 mb-4 sm:mb-6">
        <p className="text-xs sm:text-sm text-gray-500">Delivery Address</p>
        <p className="text-sm sm:text-base">{order.delivery_address}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={() => navigate("/menu")}
          className="flex-1 bg-orange-500 text-white py-2.5 sm:py-3 rounded-xl text-sm sm:text-base touch-manipulation"
        >
          Order More
        </button>

        <button
          onClick={() => navigate("/orders")}
          className="flex-1 border border-orange-500 text-orange-500 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base touch-manipulation"
        >
          My Orders
        </button>
      </div>
    </div>
  );
}