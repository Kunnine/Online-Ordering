import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  Check,
} from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [demoExpanded, setDemoExpanded] = useState(false);
  const [fillNotice, setFillNotice] = useState("");

  const handleFillDemo = (type) => {
    const creds =
      type === "admin"
        ? { email: "admin@fastfood.demo", password: "Admin123!" }
        : { email: "customer@fastfood.demo", password: "Customer123!" };

    setForm(creds);
    setError("");
    setFillNotice(
      `${type === "admin" ? "Admin" : "Customer"} credentials loaded. Click "Login" below to sign in.`
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFillNotice("");

    try {
      const user = await login(form.email.trim(), form.password);
      const redirect = searchParams.get("redirect");

      if (user.role === "admin") {
        const target =
          redirect && redirect.startsWith("/admin")
            ? redirect
            : "/admin/dashboard";
        navigate(target);
      } else {
        const target =
          redirect && !redirect.startsWith("/admin")
            ? redirect
            : "/dashboard";
        navigate(target);
      }
    } catch (err) {
      if (!err.response) {
        if (
          err.code === "ECONNABORTED" ||
          err.message?.toLowerCase().includes("timeout")
        ) {
          setError(
            "Connection timed out. The backend server might be starting up, please try again in a moment."
          );
        } else {
          setError(
            "Unable to connect to the backend server. Please verify your connection or try again."
          );
        }
      } else if (err.response.status === 429) {
        setError(
          "Too many login attempts. Please wait a minute before trying again."
        );
      } else if (err.response.status === 403) {
        setError(
          err.response.data?.message ||
            "This account has been blocked. Please contact support."
        );
      } else if (err.response.data?.errors?.email?.[0]) {
        setError(err.response.data.errors.email[0]);
      } else if (err.response.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50/60 px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-orange-100/60 w-full max-w-sm sm:max-w-md transition-all">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-2xl sm:text-3xl font-extrabold text-orange-500 hover:text-orange-600 transition"
          >
            <span>🍔</span>
            <span>FastFood</span>
          </Link>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Login to your account
          </p>
        </div>

        {/* Expandable Demo Accounts Panel */}
        <div className="mb-5 border border-orange-200/80 rounded-xl overflow-hidden bg-gradient-to-b from-orange-50/50 to-white">
          <button
            type="button"
            onClick={() => setDemoExpanded(!demoExpanded)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-orange-700 hover:bg-orange-100/60 transition"
            aria-expanded={demoExpanded}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={15} className="text-orange-500 flex-shrink-0" />
              <span>Try Demo Account</span>
              <span className="ml-1 text-[11px] bg-orange-200/70 text-orange-800 px-1.5 py-0.5 rounded-full font-medium">
                Admin & Customer
              </span>
            </span>
            <span className="text-orange-600">
              {demoExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {demoExpanded && (
            <div className="p-3 border-t border-orange-100 space-y-2.5 bg-orange-50/30">
              <p className="text-[11px] sm:text-xs text-gray-500">
                Click a demo button to autofill credentials, then sign in:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Customer Demo Card */}
                <div className="p-2.5 rounded-lg border border-gray-200 bg-white hover:border-orange-300 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                      <UserCheck size={14} className="text-emerald-600" />
                      <span>Customer</span>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500 space-y-0.5 font-mono">
                      <p className="truncate" title="customer@fastfood.demo">
                        customer@fastfood.demo
                      </p>
                      <p>Customer123!</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemo("customer")}
                    className="mt-2.5 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1 touch-manipulation"
                  >
                    Login as Customer
                  </button>
                </div>

                {/* Admin Demo Card */}
                <div className="p-2.5 rounded-lg border border-gray-200 bg-white hover:border-orange-300 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                      <ShieldCheck size={14} className="text-purple-600" />
                      <span>Admin</span>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500 space-y-0.5 font-mono">
                      <p className="truncate" title="admin@fastfood.demo">
                        admin@fastfood.demo
                      </p>
                      <p>Admin123!</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemo("admin")}
                    className="mt-2.5 w-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold py-1.5 px-2 rounded-md transition flex items-center justify-center gap-1 touch-manipulation"
                  >
                    Login as Admin
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feedback / Error Alerts */}
        {fillNotice && !error && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-lg mb-3 text-xs sm:text-sm flex items-center gap-2">
            <Check size={15} className="text-emerald-600 flex-shrink-0" />
            <span>{fillNotice}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-3 text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="e.g. customer@fastfood.demo"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:px-4 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (fillNotice) setFillNotice("");
                if (error) setError("");
              }}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 sm:px-4 sm:py-2.5 text-sm sm:text-base pr-10 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (fillNotice) setFillNotice("");
                  if (error) setError("");
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-2.5 sm:py-3 rounded-lg transition text-sm sm:text-base touch-manipulation shadow-sm hover:shadow"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-xs sm:text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-orange-500 font-medium hover:underline"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
