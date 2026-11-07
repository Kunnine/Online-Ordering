import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Clock } from "lucide-react";

/**
 * PaymentPending — polling screen used while waiting for the gateway to
 * confirm a payment (e.g. customer scanned KHQR but bank hasn't called the
 * webhook yet). Polls GET /api/payment/status/{id} and routes to Success /
 * Failed when it resolves.
 */
export default function PaymentPending() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("pending");
  const [elapsed, setElapsed] = useState(0);

  // Poll the backend for payment status.
  useEffect(() => {
    if (!id) return;

    let active = true;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);

    const poll = async () => {
      try {
        const res = await api.get(`/payment/status/${id}`);
        const paymentStatus = res.data?.payment_status;

        if (!active) return;

        if (paymentStatus === "paid") {
          setStatus("paid");
          navigate(`/payment/success/${id}`, { replace: true });
        } else if (paymentStatus === "failed" || paymentStatus === "rejected") {
          setStatus("failed");
          navigate(`/payment/failed/${id}`, { replace: true });
        }
      } catch {
        /* keep polling; network blips are tolerated */
      }
    };

    poll();
    const interval = setInterval(poll, 4000);

    return () => {
      active = false;
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [id, navigate]);

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-16 text-center">
      <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-5">
        <Clock className="text-blue-500 animate-pulse" size={48} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-gray-800">
        Waiting for Payment
      </h1>
      <p className="text-gray-500 mt-2 text-sm sm:text-base">
        We're confirming your payment with the bank. This usually takes a few
        seconds — please don't close this page.
      </p>

      {id && (
        <p className="mt-4 inline-block bg-gray-100 rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700">
          Order #{id}
        </p>
      )}

      <p className="mt-4 text-xs text-gray-400">Elapsed: {elapsed}s</p>

      <div className="mt-8">
        <button
          onClick={() => navigate("/menu")}
          className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-3 rounded-xl font-semibold transition"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
