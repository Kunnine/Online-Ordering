import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import api from "../api/axios";
import { CheckCircle2, Clock, MapPin, Phone, DollarSign, ArrowRight, UtensilsCrossed } from "lucide-react";

export default function OrderSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => {
        console.error("Failed to load order:", err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden text-center p-6 sm:p-10">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
          <CheckCircle2 size={48} className="animate-bounce" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
          Order Confirmed!
        </h1>
        <p className="text-gray-500 text-sm sm:text-base mb-6">
          Thank you for ordering with FastFood. We've received your order and the kitchen is getting ready.
        </p>

        {id && (
          <div className="inline-block bg-orange-50 border border-orange-200 text-orange-700 px-4 py-1.5 rounded-full text-sm font-bold mb-6">
            Order #{id}
          </div>
        )}

        {loading ? (
          <div className="py-6 text-gray-400 text-sm flex items-center justify-center gap-2">
            <Clock size={16} className="animate-spin text-orange-500" />
            Loading order details...
          </div>
        ) : order ? (
          <div className="space-y-4 text-left">
            {order.payment_method === "cash" ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900">
                <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-amber-800 mb-1">
                  <DollarSign size={18} className="text-amber-600" />
                  Cash on Delivery
                </div>
                <p className="text-xs sm:text-sm text-amber-700">
                  Please prepare exact cash of{" "}
                  <strong>${parseFloat(order.total_amount).toFixed(2)}</strong> for the driver when your food arrives.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-blue-900">
                <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-blue-800 mb-1">
                  <CheckCircle2 size={18} className="text-blue-600" />
                  Payment Status: {order.payment_status?.toUpperCase()}
                </div>
                <p className="text-xs sm:text-sm text-blue-700">
                  Total Paid: <strong>${parseFloat(order.total_amount).toFixed(2)}</strong> via KHQR.
                </p>
              </div>
            )}

            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs sm:text-sm border border-gray-100">
              <div className="flex justify-between items-center text-gray-600">
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-gray-400" /> Delivery Address
                </span>
                <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">
                  {order.delivery_address || "Provided at checkout"}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Phone size={15} className="text-gray-400" /> Phone Number
                </span>
                <span className="font-medium text-gray-800">{order.phone_number || "—"}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Clock size={15} className="text-gray-400" /> Estimated Delivery
                </span>
                <span className="font-semibold text-orange-600">25 – 40 mins</span>
              </div>
            </div>

            {order.items?.length > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Items Ordered ({order.items.length})
                </p>
                <div className="space-y-1.5">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs sm:text-sm text-gray-700">
                      <span>
                        {item.product?.name || "Item"} <span className="text-gray-400">×{item.quantity}</span>
                      </span>
                      <span className="font-medium">${parseFloat(item.subtotal).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {id && (
            <Link
              to={`/orders/${id}`}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              Track Order Status
              <ArrowRight size={18} />
            </Link>
          )}
          <Link
            to="/menu"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-semibold transition flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <UtensilsCrossed size={18} />
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
