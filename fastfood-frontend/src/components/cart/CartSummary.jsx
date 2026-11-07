import { ShoppingBag, CreditCard, ArrowRight } from "lucide-react";

/**
 * CartSummary — sticky footer of the drawer.
 * Displays totals + the three primary actions.
 */
export default function CartSummary({
  totalItems,
  totalAmount,
  onContinueShopping,
  onViewCart,
  onCheckout,
}) {
  return (
    <div className="border-t border-gray-100 bg-white p-4 sm:p-5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      {/* Totals */}
      <div className="space-y-1.5 text-sm mb-4">
        <div className="flex justify-between text-gray-600">
          <span>Items</span>
          <span className="font-medium text-gray-800">{totalItems}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Delivery</span>
          <span className="text-green-500 font-medium">Free</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="font-bold text-gray-800">Total</span>
          <span className="font-black text-lg text-orange-500">
            ${totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2.5">
        <button
          onClick={onCheckout}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
        >
          <CreditCard size={18} />
          Checkout
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={onViewCart}
            className="bg-white border border-orange-200 text-orange-500 hover:bg-orange-50 font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-sm"
          >
            <ShoppingBag size={16} />
            View Cart
          </button>

          <button
            onClick={onContinueShopping}
            className="bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-sm"
          >
            Continue
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
