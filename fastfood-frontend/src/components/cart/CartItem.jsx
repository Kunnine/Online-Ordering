import { Minus, Plus, Trash2 } from "lucide-react";

/**
 * CartItem — one row inside the cart drawer.
 * Shows image, name, category, unit price, quantity stepper, subtotal, remove.
 */
export default function CartItem({ item, onIncrease, onDecrease, onRemove }) {
  const subtotal = Number(item.price) * item.quantity;

  return (
    <div className="flex gap-3 p-4 border-b border-gray-100 last:border-0">
      {/* Image */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-orange-50 flex-shrink-0">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            🍔
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
              {item.name}
            </h3>
            {item.category?.name && (
              <p className="text-xs text-gray-400 mt-0.5">
                {item.category.name}
              </p>
            )}
            <p className="text-orange-500 font-semibold text-sm mt-0.5">
              ${Number(item.price).toFixed(2)}
            </p>
          </div>

          {/* Remove */}
          <button
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name} from cart`}
            className="text-gray-300 hover:text-red-500 transition p-1"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Quantity + subtotal */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center bg-orange-50 rounded-full px-1.5 py-1 gap-1">
            <button
              onClick={() => onDecrease(item.id)}
              aria-label={`Decrease quantity of ${item.name}`}
              className="w-7 h-7 rounded-full bg-white shadow text-orange-500 font-bold hover:bg-orange-100 flex items-center justify-center transition"
            >
              <Minus size={14} />
            </button>

            <span className="w-7 text-center font-semibold text-sm">
              {item.quantity}
            </span>

            <button
              onClick={() => onIncrease(item.id)}
              aria-label={`Increase quantity of ${item.name}`}
              className="w-7 h-7 rounded-full bg-orange-500 text-white font-bold hover:bg-orange-600 flex items-center justify-center transition"
            >
              <Plus size={14} />
            </button>
          </div>

          <p className="font-bold text-gray-800 text-sm sm:text-base">
            ${subtotal.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
