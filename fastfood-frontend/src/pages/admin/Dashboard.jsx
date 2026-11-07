import { useState, useEffect } from "react";
import api from "../../api/axios";

import {
  Users,
  ShoppingBag,
  DollarSign,
  Package,
  QrCode,
  Wallet,
  Clock3,
  XCircle,
  RefreshCcw,
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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/admin/stats");
      setData(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load dashboard statistics",
      );
    } finally {
      setLoading(false);
    }
  };

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

  const { stats } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

          <p className="text-gray-500 mt-1">Welcome back admin 👋</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          {
            label: "Total Orders",
            value: stats.total_orders,
            icon: ShoppingBag,
            bg: "bg-blue-500",
          },
          {
            label: "Revenue",
            value: "$" + parseFloat(stats.total_revenue || 0).toFixed(2),
            icon: DollarSign,
            bg: "bg-green-500",
          },
          {
            label: "Products",
            value: stats.total_products,
            icon: Package,
            bg: "bg-orange-500",
          },
          {
            label: "Customers",
            value: stats.total_customers,
            icon: Users,
            bg: "bg-purple-500",
          },
        ].map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center text-white shadow-lg mb-5`}
              >
                <Icon size={28} />
              </div>

              <p className="text-gray-500 text-sm mb-1">{card.label}</p>

              <h2 className="text-3xl font-bold text-gray-800">{card.value}</h2>
            </div>
          );
        })}
      </div>

      {/* QR Stats */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <QrCode className="text-orange-500" size={24} />
          <h2 className="text-xl font-bold text-gray-800">
            QR Payment Statistics
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              label: "QR Payments",
              value:
                (stats.qr_payments_paid || 0) +
                (stats.qr_payments_pending || 0) +
                (stats.qr_payments_failed || 0),
              icon: QrCode,
              bg: "bg-indigo-500",
            },
            {
              label: "QR Revenue",
              value: "$" + parseFloat(stats.qr_total_revenue || 0).toFixed(2),
              icon: Wallet,
              bg: "bg-green-500",
            },
            {
              label: "Awaiting Verification",
              value: stats.awaiting_verification,
              icon: Clock3,
              bg: "bg-yellow-500",
            },
            {
              label: "Failed Payments",
              value: stats.qr_payments_failed,
              icon: XCircle,
              bg: "bg-red-500",
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center text-white shadow-lg mb-5`}
                >
                  <Icon size={28} />
                </div>

                <p className="text-gray-500 text-sm mb-1">{card.label}</p>

                <h2 className="text-3xl font-bold text-gray-800">
                  {card.value}
                </h2>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
