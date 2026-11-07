import { useState } from "react";
import { Link, useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  UtensilsCrossed,
  ShoppingCart,
  ClipboardList,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/menu", label: "Menu", icon: UtensilsCrossed },
    { to: "/orders", label: "My Orders", icon: ClipboardList },
    { to: "/cart", label: "Cart", icon: ShoppingCart },
  ];

  return (
    <nav className="bg-orange-500 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="flex items-center justify-between h-16">
          <Link
            to="/menu"
            className="text-xl sm:text-2xl font-bold flex items-center gap-2"
          >
            <UtensilsCrossed size={20} />
            FastFood
          </Link>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `hover:text-orange-200 transition flex items-center gap-1 ${
                    isActive ? "text-orange-200" : ""
                  }`
                }
              >
                <item.icon size={16} />

                {item.label}

                {item.to === "/cart" && totalItems > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </NavLink>
            ))}

            <div className="flex items-center gap-3">
              <span className="text-orange-100 text-sm hidden sm:inline">
                Hi, {user?.name}
              </span>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 bg-white text-orange-500 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-50 transition"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>

          {/* MOBILE BUTTONS */}
          <div className="md:hidden flex items-center gap-3">
            <Link to="/cart" className="relative p-2">
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-orange-600 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-orange-400">
            <div className="flex flex-col space-y-2 pt-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg hover:bg-orange-600 transition flex items-center gap-2 ${
                      isActive ? "bg-orange-600" : ""
                    }`
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}

              <button
                onClick={handleLogout}
                className="px-3 py-2 text-left rounded-lg hover:bg-orange-600 transition flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
