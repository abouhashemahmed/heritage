import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PropTypes from "prop-types";
import withAuth from "@/hoc/withAuth";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const logErrorToService = (error) => {
  console.error("Error logged:", error);
};

function Dashboard() {
  const router = useRouter();
  const { user, logout, loading, refreshToken } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshToken?.().catch((err) => {
        console.error("Token refresh failed:", err);
        logErrorToService(err);
      });
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  const handleNavigation = (path) => {
    setIsNavigating(true);
    router.push(path);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError(null);
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
      logErrorToService(error);
      setError("Failed to logout. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      {isNavigating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ArrowPathIcon className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      <div className="w-full max-w-2xl bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Dashboard
        </h1>

        {error && (
          <div
            className="mb-4 p-3 bg-red-100 text-red-700 rounded flex items-center"
            aria-live="polite"
          >
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center">
            <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : user ? (
          <div className="text-center space-y-6">
            <div className="mb-6">
              <p className="text-lg font-semibold text-gray-700">
                Welcome back, <span className="text-blue-600 font-mono">{user.email}</span>
              </p>
              {user.role && (
                <p className="text-sm text-gray-500 mt-1">
                  (<span className="font-mono">{user.role.toUpperCase()}</span>)
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                <h2 className="text-xl font-semibold">Account Details</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleNavigation("/reset-password")}
                    className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 text-left sm:text-center"
                  >
                    Change Password
                  </button>
                  <button
                    onClick={() => handleNavigation("/profile")}
                    className="flex items-center text-blue-600 hover:text-blue-800 transition-colors px-2 py-1"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit Profile
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p><span className="font-medium">Email:</span> <span className="font-mono">{user.email}</span></p>
                {user.role && (
                  <p><span className="font-medium">Role:</span> <span className="font-mono">{user.role.toUpperCase()}</span></p>
                )}
                {user.createdAt && (
                  <p>
                    <span className="font-medium">Member Since:</span>{" "}
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
                <p>
                  <span className="font-medium">Last Active:</span>{" "}
                  {user.lastLogin ? (
                    <span title={new Date(user.lastLogin).toLocaleString()} className="cursor-help">
                      {new Date(user.lastLogin).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">unknown</span>
                  )}
                </p>
              </div>
            </div>

            {user.role === "SELLER" && (
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-center mb-3">
                  <Cog6ToothIcon className="h-6 w-6 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold">Seller Tools</h3>
                </div>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={() => handleNavigation("/seller/products")}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                  >
                    Manage Products
                  </button>
                  <button
                    onClick={() => handleNavigation("/seller/analytics")}
                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
                  >
                    View Analytics
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`w-full bg-red-500 text-white px-4 py-2 rounded font-semibold transition ${
                isLoggingOut ? "opacity-75 cursor-not-allowed" : "hover:bg-red-600"
              }`}
            >
              {isLoggingOut ? (
                <div className="flex items-center justify-center">
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  Logging out...
                </div>
              ) : (
                "Logout"
              )}
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-500">No user data found.</p>
        )}
      </div>
    </div>
  );
}

Dashboard.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string.isRequired,
    role: PropTypes.oneOf(["BUYER", "SELLER", "ADMIN"]),
    createdAt: PropTypes.string,
    lastLogin: PropTypes.string,
  }),
  logout: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default withAuth(Dashboard);
