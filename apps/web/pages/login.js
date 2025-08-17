import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState(
    process.env.NODE_ENV === "development" ? "test@test.com" : ""
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Optional: Remember last used email
  useEffect(() => {
    const savedEmail = localStorage.getItem("loginEmail");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  useEffect(() => {
    localStorage.setItem("loginEmail", email);
  }, [email]);

  const formatError = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setMessage("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("❌ Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        setMessage("✅ Login successful!");
        router.push("/");
      } else {
        if (result.error?.includes("Too many attempts")) {
          setMessage("❌ Too many attempts. Please try again later.");
        } else {
          setMessage(`❌ ${formatError(result.error)}`);
        }
      }
    } catch (error) {
      setMessage("❌ An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Login</h1>

      {message && (
        <div
          id="form-message"
          aria-live="polite"
          className={`mb-4 p-3 rounded text-center ${
            message.startsWith("✅")
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            id="email"
            aria-describedby="form-message"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              aria-describedby="form-message"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              minLength="6"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowPassword(!showPassword);
                }
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          aria-busy={loading}
          disabled={loading}
          className={`w-full py-2 px-4 rounded-md transition-colors ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="text-blue-600 hover:text-blue-700 font-medium underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
