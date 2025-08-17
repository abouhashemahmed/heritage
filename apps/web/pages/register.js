// pages/register.js
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Head from "next/head";

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setStatus("loading");

    try {
      const result = await register(email, password, "SELLER");

      if (result.success) {
        setStatus("success");
        setMessage("✅ Registration successful! Redirecting...");
        setTimeout(() => (window.location.href = "/login"), 2000);
      } else {
        setStatus("error");
        setMessage(`❌ ${result.error || "Something went wrong"}`);
      }
    } catch (err) {
      setStatus("error");
      setMessage("❌ Server error. Please try again.");
    }
  };

  return (
    <>
      <Head>
        <title>Register | Our Arab Heritage</title>
      </Head>

      <div className="max-w-lg mx-auto p-6 mt-10 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Create an Account
        </h1>

        {message && (
          <div
            id="form-message"
            aria-live="polite"
            className={`mb-4 p-3 rounded text-center ${
              status === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              aria-describedby="form-message"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              aria-describedby="form-message"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Must be at least 6 characters
            </p>
          </div>

          <button
            type="submit"
            aria-label="Register for a new account"
            aria-busy={status === "loading"}
            disabled={status === "loading"}
            className={`w-full py-2 px-4 rounded-md transition-colors text-white ${
              status === "loading"
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {status === "loading" ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium underline">
            Login here
          </Link>
        </p>
      </div>
    </>
  );
}
