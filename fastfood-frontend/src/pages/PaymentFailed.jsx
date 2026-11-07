import { useParams, Link } from "react-router-dom";
import { XCircle } from "lucide-react";

/**
 * PaymentFailed — shown when a payment is declined, expires, or errors out.
 * Offers a retry that returns the user to the order's payment page.
 */
export default function PaymentFailed() {
  const { id } = useParams();

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-16 text-center">
      <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-5">
        <XCircle className="text-red-500" size={48} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-gray-800">
        Payment Failed
      </h1>
      <p className="text-gray-500 mt-2 text-sm sm:text-base">
        We couldn't process your payment. Don't worry — your order is still
        saved. You can try paying again.
      </p>

      {id && (
        <p className="mt-4 inline-block bg-gray-100 rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700">
          Order #{id}
        </p>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        {id ? (
          <Link
            to={`/order-success/${id}`}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition shadow-md"
          >
            Try Again
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
