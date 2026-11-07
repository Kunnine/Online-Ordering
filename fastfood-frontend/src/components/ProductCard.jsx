import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function ProductCard({ product }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const { showToast } = useToast();
  const cartItem = cart.find((i) => i.id === product.id);

  const isOutOfStock = Boolean(
    !product.is_available || (product.track_stock && product.stock <= 0)
  );

  const handleAdd = () => {
    if (isOutOfStock) {
      showToast(`${product.name} is currently out of stock`, "error");
      return;
    }
    addToCart(product);
    showToast(`${product.name} added to cart`, "success");
  };

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-lg transition transform hover:-translate-y-1 p-4 flex flex-col h-full relative">
      {isOutOfStock && (
        <span className="absolute top-6 right-6 z-10 bg-red-600 text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-full shadow-md">
          Out of Stock
        </span>
      )}

      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className={`w-full h-40 sm:h-48 object-cover rounded-xl mb-3 sm:mb-4 ${
            isOutOfStock ? "opacity-50 grayscale" : ""
          }`}
          loading="lazy"
        />
      ) : (
        <div
          className={`bg-orange-100 rounded-xl h-40 sm:h-48 flex items-center justify-center text-5xl sm:text-6xl mb-3 sm:mb-4 ${
            isOutOfStock ? "opacity-50" : ""
          }`}
        >
          🍔
        </div>
      )}

      <h3 className="font-semibold text-gray-800 text-base sm:text-lg line-clamp-1">
        {product.name}
      </h3>
      <p className="text-gray-500 text-xs sm:text-sm mt-1 flex-1 line-clamp-2">
        {product.description}
      </p>

      <div className="flex items-center justify-between mt-3 sm:mt-4">
        <span className="text-orange-500 font-bold text-lg sm:text-xl">
          ${parseFloat(product.price).toFixed(2)}
        </span>

        {isOutOfStock ? (
          <span className="bg-gray-100 text-gray-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold cursor-not-allowed">
            Unavailable
          </span>
        ) : cartItem ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-100 text-orange-500 font-bold hover:bg-orange-200 transition text-sm sm:text-base flex items-center justify-center"
            >
              −
            </button>
            <span className="font-semibold w-5 sm:w-6 text-center text-sm sm:text-base">
              {cartItem.quantity}
            </span>
            <button
              onClick={() => {
                if (
                  product.track_stock &&
                  cartItem.quantity >= product.stock
                ) {
                  showToast(`Only ${product.stock} available in stock`, "warning");
                  return;
                }
                updateQuantity(product.id, cartItem.quantity + 1);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-500 text-white font-bold hover:bg-orange-600 transition text-sm sm:text-base flex items-center justify-center"
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition touch-manipulation shadow-sm"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
