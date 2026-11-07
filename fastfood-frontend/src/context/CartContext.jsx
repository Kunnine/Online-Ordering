import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { ToastProvider } from "./ToastContext";
import CartDrawer from "../components/cart/CartDrawer";

const CartContext = createContext();

const STORAGE_KEY = "fastfood_cart";

export function CartProvider({ children }) {
  // ── Cart state, hydrated from localStorage so it survives refresh ──────────
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // ── Drawer (Cart Sidebar) open/closed state ────────────────────────────────
  const [isCartOpen, setCartOpen] = useState(false);

  // Persist cart on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage full / unavailable — ignore */
    }
  }, [cart]);

  // ── Core cart operations ───────────────────────────────────────────────────

  /** Add a product. If it already exists, increase quantity instead of duplicating. */
  const addToCart = useCallback((product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + qty } : i,
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });
    // Open the drawer + fire a toast when something is added.
    setCartOpen(true);
  }, []);

  /** Remove a product entirely from the cart. */
  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  /** Set an absolute quantity. <1 removes the item. */
  const updateQuantity = useCallback(
    (productId, quantity) => {
      if (quantity < 1) {
        removeFromCart(productId);
        return;
      }
      setCart((prev) =>
        prev.map((i) => (i.id === productId ? { ...i, quantity } : i)),
      );
    },
    [removeFromCart],
  );

  /** Convenience wrappers for the +/- buttons. */
  const increaseQuantity = useCallback(
    (productId) => {
      setCart((prev) =>
        prev.map((i) =>
          i.id === productId ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    },
    [],
  );

  const decreaseQuantity = useCallback(
    (productId) => {
      setCart((prev) =>
        prev.map((i) => {
          if (i.id !== productId) return i;
          const next = i.quantity - 1;
          // drop the item entirely rather than showing 0
          return next < 1 ? null : { ...i, quantity: next };
        }).filter(Boolean),
      );
    },
    [],
  );

  /** Empty the cart. */
  const clearCart = useCallback(() => setCart([]), []);

  /** Drawer controls (also closeable from anywhere). */
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const toggleCart = useCallback(() => setCartOpen((o) => !o), []);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalItems = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity, 0),
    [cart],
  );
  const totalAmount = useMemo(
    () => cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0),
    [cart],
  );

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
      // Drawer state + controls
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      // Derived
      totalItems,
      totalAmount,
    }),
    [
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      totalItems,
      totalAmount,
    ],
  );

  // ToastProvider + CartDrawer are mounted here so the slide-in cart and
  // notifications are available on every page without per-page wiring.
  return (
    <CartContext.Provider value={value}>
      <ToastProvider>
        {children}
        <CartDrawer />
      </ToastProvider>
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
