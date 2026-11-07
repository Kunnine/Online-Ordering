import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  Activity,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import api from "../../api/axios";

const ORDER_COLORS = {
  pending: "#eab308",
  waiting_verification: "#3b82f6",
  confirmed: "#22c55e",
  preparing: "#f97316",
  ready: "#a855f7",
  delivered: "#06b6d4",
  cancelled: "#ef4444",
};

const PAYMENT_COLORS = {
  paid: "#22c55e",
  pending: "#eab308",
  rejected: "#ef4444",
  failed: "#ef4444",
};

const ORDER_STATUS_LABEL = {
  pending: "Pending",
  waiting_verification: "Verification",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABEL = {
  paid: "Paid",
  pending: "Pending",
  rejected: "Rejected",
  failed: "Failed",
};

export default function Reports() {
  const [overview, setOverview] = useState(null);
  const [salesDay, setSalesDay] = useState([]);
  const [salesMonth, setSalesMonth] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [paymentStatuses, setPaymentStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(7);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    try {
      const [ov, sd, sm, tp, tc, os] = await Promise.all([
        api.get("/admin/reports/overview"),
        api.get("/admin/reports/sales-by-day?days=" + dateRange),
        api.get("/admin/reports/sales-by-month"),
        api.get("/admin/reports/top-products?limit=5"),
        api.get("/admin/reports/top-customers?limit=5"),
        api.get("/admin/reports/orders-by-status"),
      ]);

      setOverview(ov.data);
      setSalesDay(sd.data);
      setSalesMonth(sm.data);
      setTopProducts(tp.data);
      setTopCustomers(tc.data);
      setOrderStatuses(os.data.order_statuses ?? []);
      setPaymentStatuses(os.data.payment_statuses ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>
          <p className="text-orange-500 text-lg font-semibold">
            Loading Reports...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-4 md:p-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-[30px] p-6 md:p-8 mb-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="uppercase tracking-[4px] text-orange-100 text-xs font-semibold mb-2">
              Analytics Dashboard
            </p>

            <h1 className="text-3xl md:text-5xl font-black mb-3">
              Reports & Analytics
            </h1>

            <p className="text-orange-100 max-w-xl">
              Monitor business performance, customer activity, revenue growth,
              and product sales in real time.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 min-w-[240px]">
            <p className="text-sm text-orange-100 mb-2">Select Time Range</p>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="w-full bg-white text-gray-800 rounded-2xl px-4 py-3 outline-none font-semibold"
            >
              <option value={1}>Last 1 day</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {[
          {
            title: "Total Revenue",
            value:
              "$" + parseFloat(overview?.total_revenue || 0).toLocaleString(),
            icon: DollarSign,
            bg: "bg-green-500",
          },
          {
            title: "Total Orders",
            value: overview?.total_orders || 0,
            icon: ShoppingBag,
            bg: "bg-blue-500",
          },
          {
            title: "Customers",
            value: overview?.total_customers || 0,
            icon: Users,
            bg: "bg-purple-500",
          },
          {
            title: "Products",
            value: overview?.total_products || 0,
            icon: Package,
            bg: "bg-orange-500",
          },
        ].map((card, i) => {
          const Icon = card.icon;

          return (
            <div
              key={i}
              className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-5">
                <div
                  className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center shadow-lg`}
                >
                  <Icon className="text-white" size={28} />
                </div>

                <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">
                  +12%
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-1">{card.title}</p>

              <h2 className="text-3xl font-black text-gray-800">
                {card.value}
              </h2>
            </div>
          );
        })}
      </div>

      {/* CHARTS */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* REVENUE */}
        <div className="lg:col-span-2 bg-white rounded-[30px] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800">
                Revenue Analytics
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Revenue performance overview
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
              <TrendingUp className="text-orange-500" />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={salesDay}>
              <defs>
                <linearGradient id="orangeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />

              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />

              <Tooltip />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f97316"
                fill="url(#orangeFill)"
                strokeWidth={4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ORDER STATUS */}
        <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800">
                Order Status
              </h2>
              <p className="text-gray-400 text-sm mt-1">Orders distribution</p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Activity className="text-blue-500" />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={orderStatuses}
                dataKey="count"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
              >
                {orderStatuses.map((item, index) => (
                  <Cell
                    key={index}
                    fill={ORDER_COLORS[item.status] || "#cbd5e1"}
                  />
                ))}
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3 mt-4">
            {orderStatuses.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: ORDER_COLORS[item.status] || "#cbd5e1",
                    }}
                  ></div>

                  <span className="text-sm font-medium text-gray-700">
                    {ORDER_STATUS_LABEL[item.status]}
                  </span>
                </div>

                <span className="text-sm font-bold text-gray-800">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECOND ROW */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* MONTHLY */}
        <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800">
                Monthly Revenue
              </h2>
              <p className="text-gray-400 text-sm">Sales growth by month</p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <DollarSign className="text-green-600" />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />

              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />

              <Tooltip />

              <Bar dataKey="revenue" fill="#f97316" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PAYMENTS */}
        <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800">
                Payment Status
              </h2>
              <p className="text-gray-400 text-sm">Payment overview</p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center">
              <Clock3 className="text-yellow-500" />
            </div>
          </div>

          <div className="space-y-5">
            {paymentStatuses.map((item) => (
              <div key={item.status}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {PAYMENT_STATUS_LABEL[item.status]}
                  </span>

                  <span className="text-sm font-bold text-gray-800">
                    {item.count}
                  </span>
                </div>

                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: PAYMENT_COLORS[item.status] || "#cbd5e1",
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-green-50 border border-green-100 rounded-3xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="text-green-600" />

              <h3 className="font-bold text-green-700">Successful Payments</h3>
            </div>

            <p className="text-3xl font-black text-green-600">
              {paymentStatuses.find((x) => x.status === "paid")?.count || 0}
            </p>
          </div>
        </div>
      </div>

      {/* TOPS */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* TOP PRODUCTS */}
        <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black text-gray-800 mb-6">
            Top Products
          </h2>

          <div className="space-y-5">
            {topProducts.map((item, index) => (
              <div key={item.product_id} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                  #{index + 1}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">
                      {item.product?.name}
                    </h3>

                    <span className="text-sm font-bold text-orange-500">
                      {item.total_sold} sold
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-orange-500 h-full rounded-full"
                      style={{
                        width:
                          topProducts[0]?.total_sold > 0
                            ? (item.total_sold / topProducts[0].total_sold) *
                                100 +
                              "%"
                            : "0%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP CUSTOMERS */}
        <div className="bg-white rounded-[30px] p-6 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black text-gray-800 mb-6">
            Top Customers
          </h2>

          <div className="space-y-5">
            {topCustomers.map((item) => (
              <div
                key={item.user_id}
                className="flex items-center justify-between bg-gray-50 rounded-2xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 font-black text-lg">
                    {item.user?.name?.charAt(0)}
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-800">
                      {item.user?.name}
                    </h3>

                    <p className="text-sm text-gray-500">
                      {item.total_orders} orders
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-green-600 font-black text-lg">
                    ${parseFloat(item.total_spent).toFixed(2)}
                  </p>

                  <p className="text-xs text-gray-400">Total spent</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
