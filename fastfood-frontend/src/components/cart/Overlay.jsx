import { useEffect } from "react";

/**
 * Overlay — semi-transparent backdrop behind the drawer.
 *  - Fades in/out via CSS transition.
 *  - Clicking it calls onClose().
 *  - ESC key also closes (global listener).
 */
export default function Overlay({ show, onClose }) {
  // Close on ESC.
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  return (
    <div
      onClick={onClose}
      aria-hidden="true"
      className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    />
  );
}
