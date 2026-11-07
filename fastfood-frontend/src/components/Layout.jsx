import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold">
                FastFood Ordering
              </Link>
            </div>
            <div className="hidden md:flex md:items-center md:space-x-4">
              {!user ? (
                <>
                  <Link to="/login" className="hover:text-orange-300 transition-colors">
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="ml-4 hover:text-orange-300 transition-colors"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  <span className="mr-4">
                    Hello, {user?.email?.split("@")[0] || "User"}!
                  </span>
                  <button
                    onClick={logout}
                    className="hover:text-orange-300 transition-colors"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} FastFood Ordering. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;