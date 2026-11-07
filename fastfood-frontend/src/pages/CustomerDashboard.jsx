import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  waiting_verification: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-purple-100 text-purple-700",
  delivered: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function CustomerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/customer/stats");
      setStats(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load dashboard statistics",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-orange-500 text-xl animate-pulse">
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <XCircle size={50} className="text-red-500" />
        <p className="text-red-500 font-medium">{error}</p>
        <button
          onClick={fetchStats}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! 👋</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Orders",
            value: stats.total_orders,
            icon: ShoppingBag,
            bg: "bg-blue-500",
          },
          {
            label: "Total Spent",
            value: "$" + parseFloat(stats.total_spent || 0).toFixed(2),
            icon: DollarSign,
            bg: "bg-green-500",
          },
          {
            label: "Delivered",
            value: stats.delivered_orders,
            icon: CheckCircle,
            bg: "bg-teal-500",
          },
          {
            label: "Pending",
            value: stats.pending_orders,
            icon: Clock,
            bg: "bg-orange-500",
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
            >
              <div
                className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center text-white shadow-lg mb-4`}
              >
                <Icon size={24} />
              </div>

              <p className="text-gray-500 text-sm mb-1">{card.label}</p>
              <h2 className="text-2xl font-bold text-gray-800">{card.value}</h2>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => navigate("/menu")}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500">
            <Package size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-800">Browse Menu</h3>
            <p className="text-sm text-gray-500">Order your favorite food</p>
          </div>
        </button>

        <button
          onClick={() => navigate("/orders")}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500">
            <ShoppingBag size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-800">My Orders</h3>
            <p className="text-sm text-gray-500">View order history</p>
          </div>
        </button>
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Orders</h2>

        {stats.recent_orders?.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-gray-500 mb-4">No orders yet</p>
            <button
              onClick={() => navigate("/menu")}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-medium transition"
            >
              Order Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recent_orders?.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate("/orders/" + order.id)}
                className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">#{order.id}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-500">
                      $ {parseFloat(order.total_amount).toFixed(2)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        STATUS_COLORS[order.order_status] ||
                        "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {order.order_status?.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}