import { useState, useEffect, useCallback } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Checkout() {
  const { cart, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: user?.name || "",
    phone_number: user?.phone || "",
    delivery_address: user?.address || "",
    notes: "",
    payment_method: "qr_payment",
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        full_name: prev.full_name || user.name || "",
        phone_number: prev.phone_number || user.phone || "",
        delivery_address: prev.delivery_address || user.address || "",
      }));
    }
  }, [user]);

  // Redirects MUST happen in an effect, never during render.
  useEffect(() => {
    if (cart.length === 0) {
      navigate("/menu", { replace: true });
    } else if (!user) {
      navigate("/login?redirect=" + encodeURIComponent("/checkout"), {
        replace: true,
      });
    }
  }, [cart.length, user, navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (loading) return; // prevent double-submit

      if (!form.full_name.trim() || !form.phone_number.trim() || !form.delivery_address.trim()) {
        setError("Please enter your name, phone number, and delivery address.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await api.post("/orders", {
          full_name: form.full_name,
          phone_number: form.phone_number,
          items: cart.map((i) => ({
            product_id: i.id,
            quantity: i.quantity,
          })),
          delivery_address: form.delivery_address,
          payment_method: form.payment_method,
          notes: form.notes,
        });

        const orderId = res.data.order?.id;

        if (!orderId) {
          throw new Error("No order ID returned");
        }

        if (form.payment_method === "qr_payment") {
          try {
            await api.post("/payment/create", { order_id: orderId });
            clearCart();
            navigate(`/payment/${orderId}`);
            return;
          } catch (err) {
            console.error(err);
            const errData = err.response?.data;
            if (errData?.errors) {
              const messages = Object.values(errData.errors).flat().join(" • ");
              setError(messages);
            } else {
              setError(
                errData?.message || "Failed to initiate payment"
              );
            }
            setLoading(false);
            return;
          }
        } else {
          clearCart();
          navigate(`/order-success/${orderId}`);
        }
      } catch (err) {
        console.error("Order submission failed:", err.response?.data || err);
        const errData = err.response?.data;
        if (errData?.message) {
          setError(errData.message);
        } else if (errData?.errors) {
          const messages = Object.values(errData.errors).flat().join(" • ");
          setError(messages);
        } else {
          setError("Failed to place order. Please verify your delivery details.");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      } finally {
        setLoading(false);
      }
    },
    [loading, cart, form, clearCart, navigate],
  );

  // Keep ALL hooks above this point. We render null as a *view* decision only
  // after every hook has already been called in the same order every render.
  if (cart.length === 0 || !user) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-black text-gray-800 mb-4 sm:mb-8">
        Checkout
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">
            Delivery Information
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block mb-1.5 sm:mb-2 font-medium text-gray-700 text-sm sm:text-base">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full border border-gray-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 outline-none focus:ring-2 focus:ring-orange-400 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block mb-1.5 sm:mb-2 font-medium text-gray-700 text-sm sm:text-base">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
                placeholder="012 345 6789"
                className="w-full border border-gray-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 outline-none focus:ring-2 focus:ring-orange-400 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block mb-1.5 sm:mb-2 font-medium text-gray-700 text-sm sm:text-base">
                Delivery Address
              </label>

              <textarea
                name="delivery_address"
                value={form.delivery_address}
                onChange={handleChange}
                rows={3}
                placeholder="Enter your address..."
                className="w-full border border-gray-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 outline-none focus:ring-2 focus:ring-orange-400 text-sm sm:text-base resize-none"
                required
              />
            </div>

            <div>
              <label className="block mb-1.5 sm:mb-2 font-medium text-gray-700 text-sm sm:text-base">
                Notes
              </label>

              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Special instructions..."
                className="w-full border border-gray-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 outline-none focus:ring-2 focus:ring-orange-400 text-sm sm:text-base resize-none"
              />
            </div>

            <div>
              <label className="block mb-2 sm:mb-3 font-medium text-gray-700 text-sm sm:text-base">
                Payment Method
              </label>

              <div className="space-y-3 sm:space-y-4">
                <label
                  className={`flex items-start gap-3 border-2 rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition ${
                    form.payment_method === "qr_payment"
                      ? "border-orange-400 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="qr_payment"
                    checked={form.payment_method === "qr_payment"}
                    onChange={handleChange}
                    className="mt-1"
                  />

                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                      KHQR Payment
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Pay with ABA, ACLEDA, Wing, Bakong
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 border-2 rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition ${
                    form.payment_method === "cash"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={form.payment_method === "cash"}
                    onChange={handleChange}
                    className="mt-1"
                  />

                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                      Cash on Delivery
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Pay when your food arrives
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 sm:py-4 rounded-xl sm:rounded-2xl transition shadow-lg disabled:bg-gray-300 text-sm sm:text-base touch-manipulation"
            >
              {loading
                ? "Placing Order..."
                : `Place Order — $${totalAmount.toFixed(2)}`}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 lg:sticky lg:top-4">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">
              Order Summary
            </h2>

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 sm:gap-4 border-b pb-3 sm:pb-4 last:border-0"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-orange-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0">
                      🍔
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Quantity: {item.quantity}
                    </p>
                    <p className="text-orange-500 font-bold mt-1 text-sm sm:text-base">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 sm:pt-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm sm:text-base">
                  Subtotal
                </span>
                <span className="font-semibold text-sm sm:text-base">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm sm:text-base">
                  Delivery
                </span>
                <span className="text-green-500 font-semibold text-sm sm:text-base">
                  Free
                </span>
              </div>
              <div className="flex justify-between items-center text-lg sm:text-xl font-black border-t pt-2 sm:pt-3">
                <span>Total</span>
                <span className="text-orange-500">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
