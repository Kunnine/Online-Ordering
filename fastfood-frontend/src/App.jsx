import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./components/PublicLayout";
import Spinner from "./components/ui/Spinner";

// Auth Pages
import Login from "./pages/Login";
import Register from "./pages/Register";

// Customer Core Pages
import CustomerLayout from "./pages/CustomerLayout";
import CustomerDashboard from "./pages/CustomerDashboard";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import KhqrPayment from "./pages/KhqrPayment";
import OrderSuccess from "./pages/OrderSuccess";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import PaymentPending from "./pages/PaymentPending";
import MyOrders from "./pages/MyOrders";
import OrderDetail from "./pages/OrderDetail";

// Lazy Loaded Admin Pages (Code Splitting)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ManageProducts = lazy(() => import("./pages/admin/ManageProducts"));
const ManageCategories = lazy(() => import("./pages/admin/ManageCategories"));
const ManageOrders = lazy(() => import("./pages/admin/ManageOrders"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const ManageCustomers = lazy(() => import("./pages/admin/ManageCustomers"));

function LoadingFallback() {
  return (
    <div className="flex h-96 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* =========================
                Default Route
             ========================== */}
            <Route path="/" element={<Navigate to="/menu" />} />

            {/* =========================
                Authentication
             ========================== */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* =========================
                 Public Customer Routes
              ========================== */}
            <Route element={<PublicLayout />}>
              <Route path="/menu" element={<Menu />} />
              <Route path="/cart" element={<Cart />} />
            </Route>

            {/* =========================
                Protected Customer Routes
             ========================== */}
            <Route
              element={
                <ProtectedRoute>
                  <CustomerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<CustomerDashboard />} />
              <Route path="/checkout" element={<Checkout />} />
              
              {/* Order completion & Payment routes */}
              <Route path="/order-success/:id" element={<OrderSuccess />} />
              <Route path="/payment/:id" element={<KhqrPayment />} />
              <Route path="/orders" element={<MyOrders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />

              {/* Payment result pages */}
              <Route path="/payment/success/:id" element={<PaymentSuccess />} />
              <Route path="/payment/failed/:id" element={<PaymentFailed />} />
              <Route path="/payment/pending/:id" element={<PaymentPending />} />
            </Route>

            {/* =========================
                Admin Routes (Lazy Loaded)
             ========================== */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminLayout />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<ManageProducts />} />
              <Route path="categories" element={<ManageCategories />} />
              <Route path="menu" element={<Navigate to="/admin/products" replace />} />
              <Route path="orders" element={<ManageOrders />} />
              <Route path="customers" element={<ManageCustomers />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* =========================
                404 Page
             ========================== */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <h1 className="text-6xl font-black text-orange-500 mb-4">
                      404
                    </h1>
                    <p className="text-gray-600 text-xl mb-5">Page Not Found</p>
                    <a
                      href="/menu"
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition"
                    >
                      Browse Menu
                    </a>
                  </div>
                </div>
              }
            />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
