import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios";

const PAYMENT_STATUS_COLORS = {
  unpaid: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const ORDER_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  waiting_verification: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-purple-100 text-purple-700",
  delivered: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-700",
};

const ORDER_STATUSES = [
  "pending",
  "waiting_verification",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
];

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterPayment, setFilterPayment] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterPayment) params.append("payment_method", filterPayment);
      if (filterStatus) params.append("order_status", filterStatus);

      setSearchParams(
        { order_status: filterStatus, payment_method: filterPayment },
        { replace: true },
      );

      const res = await api.get(`/admin/orders?${params.toString()}`);
      setOrders(res.data.data ?? res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filterPayment, filterStatus, setSearchParams]);

  useEffect(() => {
    const urlStatus = searchParams.get("order_status");
    if (urlStatus && urlStatus !== filterStatus) {
      setFilterStatus(urlStatus);
    }
  }, [searchParams, filterStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId, status) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/admin/orders/${orderId}/status`, { order_status: status });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, order_status: status }));
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const updatePaymentStatus = async (orderId, paymentStatus) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/admin/orders/${orderId}/payment-status`, { payment_status: paymentStatus });
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, payment_status: paymentStatus }));
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update payment status");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingPayment = orders.filter(
    (o) => o.order_status === "waiting_verification" && o.payment_status === "pending",
  ).length;

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-600 p-3 sm:p-4 rounded-xl mb-3 sm:mb-4 text-sm sm:text-base">
          {error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Order Management
          </h1>
          {pendingPayment > 0 && (
            <p className="text-xs sm:text-sm text-blue-600 mt-1">
              ℹ️ {pendingPayment} order(s) awaiting automatic payment confirmation
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
        <select
          value={filterPayment}
          onChange={(e) => setFilterPayment(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 flex-1 sm:flex-none"
        >
          <option value="">All Payment Methods</option>
          <option value="cash">💵 Cash on Delivery</option>
          <option value="qr_payment">📱 QR Payment</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 flex-1 sm:flex-none"
        >
          <option value="">All Order Statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-3 max-h-[500px] lg:max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="text-center text-orange-500 py-12 sm:py-20 text-base sm:text-xl">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-8 sm:p-12 text-center text-gray-400">
              <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">📋</div>
              <p className="text-sm sm:text-base">No orders found</p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`bg-white rounded-xl sm:rounded-2xl shadow p-4 sm:p-5 cursor-pointer hover:shadow-md transition ${
                  selectedOrder?.id === order.id ? "ring-2 ring-orange-500" : ""
                } ${order.order_status === "waiting_verification" ? "border-l-4 border-blue-400" : ""}`}
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <p className="font-bold text-gray-800 text-sm sm:text-base">
                        Order #{order.id}
                      </p>
                      {order.order_status === "waiting_verification" && order.payment_status === "pending" && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full font-medium animate-pulse">
                          Awaiting Payment
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-1">
                      {order.user?.name} • {order.user?.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-bold text-orange-500 text-sm sm:text-lg">
                    ${parseFloat(order.total_amount).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                    {order.payment_method === "cash" ? "💵 Cash" : "📱 QR"}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${PAYMENT_STATUS_COLORS[order.payment_status]}`}
                  >
                    Payment: {order.payment_status}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${ORDER_STATUS_COLORS[order.order_status]}`}
                  >
                    {order.order_status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          {selectedOrder ? (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow p-4 sm:p-6 sticky top-4 max-h-[500px] lg:max-h-[600px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="font-bold text-base sm:text-lg text-gray-800">
                  Order #{selectedOrder.id}
                </h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4">
                <p className="text-xs font-medium text-gray-500 mb-0.5 sm:mb-1">
                  Customer
                </p>
                <p className="font-medium text-xs sm:text-sm text-gray-800">
                  {selectedOrder.user?.name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedOrder.user?.email}
                </p>
              </div>

              <div className="mb-3 sm:mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1.5 sm:mb-2">
                  Update Order Status
                </p>
                <select
                  value={selectedOrder.order_status}
                  onChange={(e) =>
                    updateStatus(selectedOrder.id, e.target.value)
                  }
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status} value={status} className="capitalize">
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3 sm:mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1.5 sm:mb-2">
                  Update Payment Status
                </p>
                <select
                  value={selectedOrder.payment_status}
                  onChange={(e) =>
                    updatePaymentStatus(selectedOrder.id, e.target.value)
                  }
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                >
                  <option value="unpaid">Unpaid (Cash)</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="border-t pt-2.5 sm:pt-4 mb-3 sm:mb-4">
                <p className="text-xs font-medium text-gray-500 mb-1.5 sm:mb-2">
                  Items
                </p>
                <div className="space-y-1.5 sm:space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-xs sm:text-sm"
                    >
                      <span className="text-gray-600 truncate mr-2">
                        {item.product?.name} x{item.quantity}
                      </span>
                      <span className="font-medium flex-shrink-0">
                        ${parseFloat(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-2.5 sm:pt-4 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between font-bold text-sm sm:text-base">
                  <span>Total</span>
                  <span className="text-orange-500">
                    ${parseFloat(selectedOrder.total_amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Payment</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${PAYMENT_STATUS_COLORS[selectedOrder.payment_status]}`}
                  >
                    {selectedOrder.payment_status}
                  </span>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 bg-gray-50 rounded-lg sm:rounded-xl p-2.5 sm:p-3">
                <p className="text-xs font-medium text-gray-500 mb-0.5 sm:mb-1">
                  Delivery Address
                </p>
                <p className="text-xs sm:text-sm text-gray-700">
                  {selectedOrder.delivery_address}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow p-8 sm:p-12 text-center text-gray-400">
              <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">📋</div>
              <p className="text-sm sm:text-base">
                Click an order to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
