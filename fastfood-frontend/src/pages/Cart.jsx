import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, totalAmount } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 px-4 text-center">
        <div className="text-7xl">🛒</div>
        <h2 className="text-xl font-semibold text-gray-700">
          Your cart feels empty
        </h2>
        <p className="text-gray-500 text-sm">
          Add some delicious food to continue
        </p>

        <button
          onClick={() => navigate("/menu")}
          className="mt-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition shadow-md"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT - CART ITEMS */}
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Your Cart</h1>

        {cart.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-4 flex items-center gap-4"
          >
            {/* IMAGE (UPDATED HERE) */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-orange-100 flex-shrink-0">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1606755962773-d324e4d7c2a1"
                  alt="food"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* INFO */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800 truncate">
                {item.name}
              </h3>
              <p className="text-orange-500 font-semibold text-sm">
                ${Number(item.price).toFixed(2)}
              </p>
            </div>

            {/* QUANTITY */}
            <div className="flex items-center bg-orange-50 rounded-full px-2 py-1 gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-7 h-7 rounded-full bg-white shadow text-orange-500 font-bold hover:bg-orange-100"
              >
                −
              </button>

              <span className="w-6 text-center font-semibold">
                {item.quantity}
              </span>

              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-7 h-7 rounded-full bg-orange-500 text-white font-bold hover:bg-orange-600"
              >
                +
              </button>
            </div>

            {/* PRICE + REMOVE */}
            <div className="text-right min-w-[80px]">
              <p className="font-bold text-gray-800">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
              <button
                onClick={() => removeFromCart(item.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT - SUMMARY */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-24 bg-white rounded-2xl shadow-md p-5">
          <h2 className="text-lg font-bold mb-4">Order Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Delivery</span>
              <span className="text-green-500 font-medium">Free</span>
            </div>

            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-orange-500">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="w-full mt-5 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl shadow-md transition"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}