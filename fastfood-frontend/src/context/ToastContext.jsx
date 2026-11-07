import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

const ToastContext = createContext();

/**
 * Lightweight toast manager. Renders a stacked list of transient
 * notifications (top-right on desktop, bottom-center on mobile).
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "success", duration = 3000) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ showToast, remove }}>
      {children}

      {/* ── Toast viewport ── */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed z-[100] top-4 right-4 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm sm:w-80 pointer-events-none"
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const accent =
    toast.type === "success"
      ? "border-l-green-500"
      : toast.type === "error"
        ? "border-l-red-500"
        : "border-l-orange-500";

  const icon =
    toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "ℹ️";

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center gap-3 bg-white border-l-4 ${accent} shadow-lg rounded-xl px-4 py-3 text-sm text-gray-700 animate-toast-in`}
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="text-gray-400 hover:text-gray-600 transition"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
