import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, ShoppingBag } from "lucide-react";

import Overlay from "./Overlay";
import CartItem from "./CartItem";
import CartSummary from "./CartSummary";
import { useCart } from "../../context/CartContext";

/**
 * CartDrawer — right-side sliding cart sidebar.
 *
 *  - Slides in from the right (translate-x) with a smooth transition.
 *  - Background overlay fades in and closes on click / ESC.
 *  - Scrollable product list; sticky footer summary.
 *  - Friendly empty state when there are no items.
 *  - Basic focus management: focus moves into the drawer on open and
 *    returns to the trigger on close.
 */
export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    closeCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    totalItems,
    totalAmount,
  } = useCart();

  const navigate = useNavigate();
  const panelRef = useRef(null);
  const lastFocused = useRef(null);

  // Focus management + scroll lock while open.
  useEffect(() => {
    if (isCartOpen) {
      lastFocused.current = document.activeElement;
      // lock background scroll
      document.body.style.overflow = "hidden";
      // move focus into the drawer
      const t = setTimeout(() => panelRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    document.body.style.overflow = "";
    // restore focus to the element that opened the drawer
    lastFocused.current?.focus?.();
  }, [isCartOpen]);

  const goTo = (path) => {
    closeCart();
    navigate(path);
  };

  return (
    <>
      <Overlay show={isCartOpen} onClose={closeCart} />

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-orange-500" size={22} />
            <h2 className="text-lg font-bold text-gray-800">
              Your Cart
              {totalItems > 0 && (
                <span className="ml-2 text-sm font-medium text-gray-400">
                  ({totalItems})
                </span>
              )}
            </h2>
          </div>

          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
          >
            <X size={22} />
          </button>
        </div>

        {/* Body: scrollable list OR empty state */}
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-28 h-28 rounded-full bg-orange-50 flex items-center justify-center text-5xl mb-4">
              🛒
            </div>
            <h3 className="text-lg font-semibold text-gray-700">
              Your cart is empty
            </h3>
            <p className="text-gray-400 text-sm mt-1 max-w-[220px]">
              Add some delicious food and it will show up here.
            </p>
            <button
              onClick={() => goTo("/menu")}
              className="mt-5 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium transition shadow-md"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {cart.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onIncrease={increaseQuantity}
                onDecrease={decreaseQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </div>
        )}

        {/* Sticky footer (only when there are items) */}
        {cart.length > 0 && (
          <CartSummary
            totalItems={totalItems}
            totalAmount={totalAmount}
            onContinueShopping={closeCart}
            onViewCart={() => goTo("/cart")}
            onCheckout={() => goTo("/checkout")}
          />
        )}
      </aside>
    </>
  );
}
