import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const PAYMENT_STATUS_COLORS = {
  unpaid: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

const ORDER_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  waiting_verification: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders");
      setOrders(res.data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="text-center text-orange-500 text-base sm:text-xl py-12 sm:py-20">
        Loading orders...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 sm:p-12 text-center">
          <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">📋</div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
            No orders yet
          </h2>
          <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
            You haven't placed any orders yet.
          </p>
          <button
            onClick={() => navigate("/menu")}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-medium transition"
          >
            Browse Menu
          </button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="bg-white rounded-xl sm:rounded-2xl shadow p-4 sm:p-5 cursor-pointer hover:shadow-md transition touch-manipulation"
            >
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <div>
                  <p className="font-bold text-gray-800 text-sm sm:text-base">#{order.id}</p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()} •{" "}
                    {order.items?.length || 0} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-500 text-sm sm:text-base">
                    $ {parseFloat(order.total_amount).toFixed(0)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 capitalize">
                    {order.payment_method?.replace("_", " ")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${
                    PAYMENT_STATUS_COLORS[order.payment_status] ||
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {order.payment_status}
                </span>

                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${
                    ORDER_STATUS_COLORS[order.order_status] ||
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {order.order_status?.replace("_", " ")}
                </span>

                {order.order_status === "waiting_verification" && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full animate-pulse">
                    ⚠️ Needs verification
                  </span>
                )}

                {order.payment_status === "pending" && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                    ⏳ Awaiting payment
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}