import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  ShoppingCart,
  X,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const navItems = [
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    to: "/menu",
    icon: UtensilsCrossed,
    label: "Menu",
  },
  {
    to: "/orders",
    icon: ClipboardList,
    label: "My Orders",
  },
  {
    to: "/cart",
    icon: ShoppingCart,
    label: "Cart",
  },
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen bg-[#f5f7fb] overflow-hidden">
      {/* MOBILE OVERLAY */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:relative z-50 h-full
          bg-[#111827]
          border-r border-gray-800
          transition-all duration-300 ease-in-out
          flex flex-col
          ${sidebarOpen ? "w-[240px]" : "w-[80px]"}
          ${
            mobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* LOGO */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <UtensilsCrossed size={20} className="text-white" />
            </div>

            {sidebarOpen && (
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">
                  FastFood
                </h1>
                <p className="text-gray-400 text-xs">Customer</p>
              </div>
            )}
          </div>

          {/* DESKTOP TOGGLE */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 items-center justify-center text-gray-300 transition"
          >
            {sidebarOpen ? (
              <ChevronLeft size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {/* MOBILE CLOSE */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-gray-300"
          >
            <X size={22} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  `
                    group flex items-center gap-3
                    px-3 py-2.5 rounded-xl
                    transition-all duration-200
                    ${
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }
                  `
                }
              >
                <div className="flex-shrink-0 relative">
                  <Icon size={20} />
                  {item.to === "/cart" && totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 inline-flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </div>

                {sidebarOpen && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* USER CARD */}
        <div className="p-3 border-t border-gray-800">
          <div className="bg-gray-800 rounded-2xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {user?.name?.charAt(0)}
              </div>

              {sidebarOpen && (
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">
                    {user?.name}
                  </h3>

                  <p className="text-gray-400 text-xs truncate">
                    Customer
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="
                mt-3 w-full
                bg-red-500 hover:bg-red-600
                text-white
                py-2 rounded-xl
                text-sm font-medium
                transition
                flex items-center justify-center gap-2
              "
            >
              <LogOut size={16} />

              {sidebarOpen && "Logout"}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 md:px-6 h-16 flex items-center justify-between lg:hidden">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
          >
            <Menu size={20} className="text-gray-700" />
          </button>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}