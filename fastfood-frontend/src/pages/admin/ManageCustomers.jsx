import { useState, useEffect } from "react";
import api from "../../api/axios";

const ORDER_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  waiting_verification: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-purple-100 text-purple-700",
  delivered: "bg-teal-100 text-teal-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function ManageCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (searchTerm = "") => {
    setLoading(true);
    try {
      const res = await api.get("/admin/customers?search=" + searchTerm);
      setCustomers(res.data);
    } catch (err) {
      console.error("Failed to load customers", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchCustomers(e.target.value);
  };

  const viewCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setDetailLoading(true);
    try {
      const res = await api.get("/admin/customers/" + customer.id);
      setCustomerDetail(res.data);
    } catch (err) {
      console.error("Failed to load customer detail", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleBlock = async (customerId) => {
    try {
      const res = await api.put("/admin/customers/" + customerId + "/block");
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? res.data.customer : c)),
      );
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(res.data.customer);
      }
    } catch (err) {
      console.error("Failed to toggle block", err);
    }
  };

  const deleteCustomer = async (customerId) => {
    if (
      !confirm("Delete this customer? This will also delete all their orders.")
    )
      return;
    try {
      await api.delete("/admin/customers/" + customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      setSelectedCustomer(null);
      setCustomerDetail(null);
    } catch (err) {
      console.error("Failed to delete customer", err);
    }
  };

  const totalRevenue = customers.reduce(
    (sum, c) => sum + parseFloat(c.orders_sum_total_amount || 0),
    0,
  );
  const totalOrders = customers.reduce(
    (sum, c) => sum + (c.orders_count || 0),
    0,
  );
  const blockedCount = customers.filter((c) => c.is_blocked).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Customer Management
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Customers",
            value: customers.length,
            icon: "👥",
            color: "bg-purple-500",
          },
          {
            label: "Total Orders",
            value: totalOrders,
            icon: "📋",
            color: "bg-blue-500",
          },
          {
            label: "Total Revenue",
            value: "$" + totalRevenue.toFixed(2),
            icon: "💰",
            color: "bg-green-500",
          },
          {
            label: "Blocked",
            value: blockedCount,
            icon: "🚫",
            color: "bg-red-500",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow p-5">
            <div
              className={
                "w-10 h-10 " +
                stat.color +
                " rounded-xl flex items-center justify-center text-xl mb-3"
              }
            >
              {stat.icon}
            </div>
            <p className="text-gray-500 text-xs">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer list */}
        <div className="lg:col-span-2">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={handleSearch}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            />
          </div>

          {loading ? (
            <div className="text-center text-orange-500 py-20 text-xl animate-pulse">
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">👥</div>
              <p>No customers found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => viewCustomer(customer)}
                  className={
                    "bg-white rounded-2xl shadow p-5 cursor-pointer hover:shadow-md transition " +
                    (selectedCustomer?.id === customer.id
                      ? "ring-2 ring-orange-500"
                      : "") +
                    (customer.is_blocked ? " opacity-60" : "")
                  }
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-xl flex-shrink-0">
                      {customer.name?.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 truncate">
                          {customer.name}
                        </p>
                        {customer.is_blocked && (
                          <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">
                            Blocked
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {customer.email}
                      </p>
                      {customer.phone && (
                        <p className="text-xs text-gray-400">
                          {customer.phone}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-orange-500">
                        $
                        {parseFloat(
                          customer.orders_sum_total_amount || 0,
                        ).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {customer.orders_count || 0} orders
                      </p>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div
                    className="flex gap-2 mt-3 pt-3 border-t border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => toggleBlock(customer.id)}
                      className={
                        "flex-1 text-xs font-medium py-1.5 rounded-lg transition " +
                        (customer.is_blocked
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200")
                      }
                    >
                      {customer.is_blocked ? "✓ Unblock" : "🚫 Block"}
                    </button>
                    <button
                      onClick={() => deleteCustomer(customer.id)}
                      className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer detail panel */}
        <div className="lg:col-span-1">
          {selectedCustomer ? (
            <div className="bg-white rounded-2xl shadow p-6 sticky top-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-gray-800">
                  Customer Details
                </h2>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerDetail(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Avatar & name */}
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-3xl mx-auto mb-3">
                  {selectedCustomer.name?.charAt(0).toUpperCase()}
                </div>
                <p className="font-bold text-gray-800 text-lg">
                  {selectedCustomer.name}
                </p>
                {selectedCustomer.is_blocked && (
                  <span className="bg-red-100 text-red-600 text-xs px-3 py-1 rounded-full font-medium">
                    🚫 Blocked
                  </span>
                )}
              </div>

              {/* Contact info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">📧</span>
                  <span className="text-gray-700 truncate">
                    {selectedCustomer.email}
                  </span>
                </div>
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">📱</span>
                    <span className="text-gray-700">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                )}
                {selectedCustomer.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400">📍</span>
                    <span className="text-gray-700">
                      {selectedCustomer.address}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">📅</span>
                  <span className="text-gray-700">
                    Joined{" "}
                    {new Date(selectedCustomer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Order stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-orange-500">
                    {selectedCustomer.orders_count || 0}
                  </p>
                  <p className="text-xs text-gray-500">Total Orders</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    $
                    {parseFloat(
                      selectedCustomer.orders_sum_total_amount || 0,
                    ).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Total Spent</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => toggleBlock(selectedCustomer.id)}
                  className={
                    "flex-1 py-2.5 rounded-xl text-sm font-medium transition " +
                    (selectedCustomer.is_blocked
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-yellow-500 hover:bg-yellow-600 text-white")
                  }
                >
                  {selectedCustomer.is_blocked
                    ? "✓ Unblock Customer"
                    : "🚫 Block Customer"}
                </button>
                <button
                  onClick={() => deleteCustomer(selectedCustomer.id)}
                  className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition"
                >
                  🗑
                </button>
              </div>

              {/* Recent orders */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm text-gray-700 mb-3">
                  Recent Orders
                </h3>
                {detailLoading ? (
                  <div className="text-center text-orange-400 py-4 animate-pulse">
                    Loading...
                  </div>
                ) : customerDetail?.orders?.length === 0 ? (
                  <div className="text-center text-gray-400 py-4 text-sm">
                    No orders yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customerDetail?.orders?.map((order) => (
                      <div key={order.id} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-800">
                            Order #{order.id}
                          </p>
                          <span
                            className={
                              "text-xs px-2 py-0.5 rounded-full font-medium capitalize " +
                              (ORDER_STATUS_COLORS[order.order_status] ||
                                "bg-gray-100 text-gray-600")
                            }
                          >
                            {order.order_status?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500">
                            {order.items?.length} item(s) •{" "}
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm font-bold text-orange-500">
                            ${parseFloat(order.total_amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">👤</div>
              <p>Click a customer to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
