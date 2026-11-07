import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { CheckCircle } from "lucide-react";

/**
 * PaymentSuccess — shown after a successful payment / after the order is placed.
 * We also clear the cart here as a safety net (Checkout already clears it,
 * but this guarantees the cart is empty on the success screen).
 */
export default function PaymentSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-16 text-center">
      <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-5">
        <CheckCircle className="text-green-500" size={48} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-gray-800">
        Payment Successful!
      </h1>
      <p className="text-gray-500 mt-2 text-sm sm:text-base">
        Thank you for your order. We've received your payment and your food is
        being prepared.
      </p>

      {id && (
        <p className="mt-4 inline-block bg-gray-100 rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700">
          Order #{id}
        </p>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        {id ? (
          <Link
            to={`/orders/${id}`}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition shadow-md"
          >
            View Order
          </Link>
        ) : null}
        <Link
          to="/menu"
          className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-3 rounded-xl font-semibold transition"
        >
          Back to Menu
        </Link>
      </div>
    </div>
  );
}
