// pages/profile.js
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import withAuth from "@/utils/withAuth";
import { useState } from "react";

function Profile() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <>
        <Head>
          <title>Unauthorized – Our Arab Heritage</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="text-center mt-10" role="alert">
          <h1 className="text-2xl font-bold text-red-600">You are not logged in</h1>
          <Link
            href="/login"
            className="mt-4 inline-block text-blue-600 underline hover:text-blue-800"
          >
            Go to Login
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>My Profile – Our Arab Heritage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg text-center mt-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Profile
        </h1>

        <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300">
          <span className="font-semibold">Email:</span>{" "}
          {user.email ?? "Not available"}
        </p>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Logout"
          className={`mt-6 px-6 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-400 transition ${
            isLoggingOut
              ? "bg-red-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </>
  );
}

export default withAuth(Profile);
