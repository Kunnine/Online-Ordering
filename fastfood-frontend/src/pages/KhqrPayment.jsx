import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { Clock } from "lucide-react";

const STATIC_QR = "/image/qr.jpg";

export default function KhqrPayment() {
  const { id } = useParams();
  const orderId = parseInt(id ?? "0", 10);
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [qrData, setQrData] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [orderCreated, setOrderCreated] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [pollingId, setPollingId] = useState(orderId);

  const loadQr = useCallback(async (oid) => {
    if (!oid || oid < 1) return;
    setFetching(true);
    setError("");
    try {
      const response = await api.get("/payment/qr-code", {
        params: { order_id: oid },
      });
      setQrData(response.data);

      if (response.data.expires_at) {
        const expiresAt = new Date(response.data.expires_at).getTime();
        const tick = () => {
          const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
          setCountdown(diff);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || "";
      if (message.includes("Cash on Delivery") || message.includes("not applicable")) {
        navigate(`/order-success/${oid}`, { replace: true });
        return;
      }

      if (err.response?.data?.errors) {
        const messages = Object.values(err.response.data.errors)
          .flat()
          .join(" • ");
        setError(messages);
      } else {
        setError(message || "Failed to load payment QR");
      }
    } finally {
      setFetching(false);
    }
  }, [navigate]);

  const createOrder = useCallback(async () => {
    navigate("/checkout");
    return null;
  }, [navigate]);

  useEffect(() => {
    if (orderId > 0) {
      const initialize = async () => {
        await loadQr(orderId);
        setPollingId(orderId);
      };
      initialize();
      return;
    }

    const run = async () => {
      const freshId = await createOrder();
      if (freshId) {
        loadQr(freshId);
      }
    };
    run();
  }, [orderId, createOrder, loadQr]);

  useEffect(() => {
    if (!pollingId) return;

    let active = true;
    const poll = async () => {
      try {
        const res = await api.get(`/payment/status/${pollingId}`);
        if (!active) return;
        const status = res.data?.payment_status;

        if (status === "paid") {
          navigate(`/payment/success/${pollingId}`, { replace: true });
        } else if (status === "failed" || status === "rejected") {
          navigate(`/payment/failed/${pollingId}`, { replace: true });
        }
      } catch {
        /* keep polling */
      }
    };

    poll();
    const interval = setInterval(poll, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pollingId, navigate]);

  useEffect(() => {
    if (!orderId && cart.length === 0 && !orderCreated) {
      navigate("/menu", { replace: true });
    }
  }, [orderId, cart.length, orderCreated, navigate]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (creating) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-700 mx-auto mb-3"></div>
          <p className="text-blue-700 text-base font-semibold">
            Creating order…
          </p>
        </div>
      </div>
    );
  }

  if (fetching && !qrData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-700 mx-auto mb-3"></div>
          <p className="text-blue-700 text-base font-semibold">
            Loading payment…
          </p>
        </div>
      </div>
    );
  }

  const displayAmount = parseFloat(qrData?.amount ?? 0);

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-8">
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-600 p-3 sm:p-4 rounded-xl mb-4 sm:mb-5 text-sm sm:text-base">
          {error}
        </div>
      )}

      {orderCreated && (
        <div className="bg-green-100 border border-green-300 text-green-700 p-3 sm:p-4 rounded-xl mb-4 sm:mb-5 text-center text-sm sm:text-base">
          <strong>Order #{pollingId}</strong> created — scan the QR below to
          complete payment.
        </div>
      )}

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-blue-800 text-white p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1.5 sm:mb-2">
            <div className="bg-white text-blue-800 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg font-black text-sm sm:text-base">
              {qrData?.bank_code || "KHQR"}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">PAYMENT</h1>
          </div>
          <p className="text-blue-200 text-xs sm:text-sm">KHQR Payment</p>
        </div>

        <div className="p-4 sm:p-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-2">
            Scan To Pay
          </h2>
          <p className="text-gray-500 mb-4 sm:mb-5 text-xs sm:text-sm">
            Scan this KHQR using ABA, ACLEDA, Wing or any KHQR app
          </p>

          <div className="mb-4 sm:mb-5">
            <p className="text-gray-500 text-xs sm:text-sm">Total Amount</p>
            <h1 className="text-4xl sm:text-5xl font-black text-blue-700">
              ${Number(displayAmount || 0).toFixed(2)}
            </h1>
          </div>

          <div className="bg-white border-2 sm:border-4 border-blue-100 rounded-2xl sm:rounded-3xl p-3 sm:p-5 inline-block shadow-inner mb-4 sm:mb-5">
            <img
              src={qrData?.qr_code_url || qrData?.qrImage || STATIC_QR}
              alt="KHQR"
              className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain"
              onError={(e) => {
                e.target.src = STATIC_QR;
              }}
              loading="lazy"
            />

            <div className="mt-3 sm:mt-4 flex items-center justify-center">
              <div className="bg-red-600 text-white px-3 py-0.5 sm:px-4 sm:py-1 rounded-full font-bold flex items-center gap-1 text-xs sm:text-sm">
                <span>KH</span>
                <span className="text-yellow-300">QR</span>
              </div>
            </div>
          </div>

          {countdown !== null && countdown > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 flex items-center justify-center gap-2">
              <Clock className="text-yellow-600" size={20} />
              <span className="text-yellow-700 font-semibold text-sm sm:text-base">
                QR expires in {formatCountdown(countdown)}
              </span>
            </div>
          )}

          {countdown !== null && countdown === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5">
              <p className="text-red-700 font-semibold text-sm sm:text-base">
                This QR code has expired. Please go back to the menu and try again.
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-left space-y-2 sm:space-y-3">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-500">Merchant</span>
              <span className="font-bold">
                {qrData?.merchant_name || "FastFood KH"}
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-500">Order ID</span>
              <span className="font-bold text-blue-700">
                #{qrData?.order_id || pollingId}
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-500">Currency</span>
              <span className="font-bold">{qrData?.currency || "KHR"}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold">
                {displayAmount ? `${qrData?.currency === 'USD' ? '$' : ''}${displayAmount.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-left mb-5 sm:mb-6">
            <h3 className="font-bold text-blue-800 mb-2 sm:mb-3 text-sm sm:text-base">
              How To Pay
            </h3>
            <ol className="list-decimal list-inside text-blue-700 text-xs sm:text-sm space-y-1.5 sm:space-y-2">
              <li>Open ABA Mobile / ACLEDA / Wing app</li>
              <li>Tap Scan QR</li>
              <li>Scan this KHQR code</li>
              <li>Confirm payment</li>
              <li>Wait for automatic confirmation</li>
            </ol>
          </div>
        </div>
      </div>

      <p className="text-center text-xs sm:text-sm text-gray-400 mt-5 sm:mt-6">
        Changed your mind?{" "}
        <button
          onClick={() => navigate("/menu")}
          className="text-orange-500 hover:underline font-medium"
        >
          Go back to menu
        </button>
      </p>
    </div>
  );
}
