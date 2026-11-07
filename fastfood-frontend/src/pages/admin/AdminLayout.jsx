import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package2,
  FolderKanban,
  ShoppingCart,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  {
    to: "/admin/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    to: "/admin/products",
    icon: Package2,
    label: "Products",
  },
  {
    to: "/admin/categories",
    icon: FolderKanban,
    label: "Categories",
  },
  {
    to: "/admin/orders",
    icon: ShoppingCart,
    label: "Orders",
  },
  {
    to: "/admin/customers",
    icon: Users,
    label: "Customers",
  },
  {
    to: "/admin/reports",
    icon: BarChart3,
    label: "Reports",
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
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
          ${sidebarOpen ? "w-[270px]" : "w-[90px]"}
          ${
            mobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        {/* LOGO */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-2xl">🍔</span>
            </div>

            {sidebarOpen && (
              <div>
                <h1 className="text-white font-black text-lg leading-tight">
                  FastFood
                </h1>

                <p className="text-gray-400 text-xs">Admin Dashboard</p>
              </div>
            )}
          </div>

          {/* DESKTOP TOGGLE */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 items-center justify-center text-gray-300 transition"
          >
            {sidebarOpen ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>

          {/* MOBILE CLOSE */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  `
                    group flex items-center gap-4
                    px-4 py-3 rounded-2xl
                    transition-all duration-200
                    ${
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }
                  `
                }
              >
                <div className="flex-shrink-0">
                  <Icon size={22} />
                </div>

                {sidebarOpen && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* USER CARD */}
        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-800 rounded-3xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {user?.name?.charAt(0)}
              </div>

              {sidebarOpen && (
                <div className="min-w-0">
                  <h3 className="text-white font-semibold truncate">
                    {user?.name}
                  </h3>

                  <p className="text-gray-400 text-sm truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="
                mt-4 w-full
                bg-red-500 hover:bg-red-600
                text-white
                py-3 rounded-2xl
                font-semibold
                transition
                flex items-center justify-center gap-2
              "
            >
              <LogOut size={18} />

              {sidebarOpen && "Logout"}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 md:px-6 h-20 flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-4">
            {/* MOBILE MENU */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden w-11 h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
            >
              <Menu size={22} className="text-gray-700" />
            </button>

            {/* SEARCH */}
            <div className="hidden md:flex items-center bg-[#f5f7fb] border border-gray-200 rounded-2xl px-4 h-12 min-w-[320px]">
              <Search size={18} className="text-gray-400" />

              <input
                type="text"
                placeholder="Search here..."
                className="bg-transparent flex-1 px-3 outline-none text-sm text-gray-700 placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            {/* NOTIFICATION */}
            <button className="relative w-12 h-12 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition">
              <Bell size={20} className="text-gray-600" />

              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
            </button>

            {/* PROFILE */}
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-3 py-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-gray-800 leading-tight">
                  {user?.name}
                </p>

                <p className="text-xs text-gray-400">Administrator</p>
              </div>

              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
