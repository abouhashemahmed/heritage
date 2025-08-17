how is my checkout.js? // pages/checkout.js
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import Sentry from "@/lib/sentry";

const getCSRFToken = async () => {
  try {
    const res = await fetch("/api/auth/csrf");
    const data = await res.json();
    return data.csrfToken || "";
  } catch {
    return "";
  }
};

export default function Checkout() {
  const router = useRouter();
  const { cart, cartTotal = 0 } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cart.length === 0) {
      router.replace("/cart");
    }
  }, [cart, router]);

  const handleCheckout = async () => {
    if (!isAuthenticated || cart.length === 0) return;

    setStatus("loading");
    setError(null);

    try {
      const csrfToken = await getCSRFToken();

      const validation = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      });

      if (!validation.ok) {
        const { errors } = await validation.json();
        throw new Error(errors.join(", "));
      }

      const response = await fetch("/api/checkout/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          mode: "payment",
          line_items: cart.map((item) => ({
            price_data: {
              currency: "usd",
              product_data: { name: item.title },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
          })),
          metadata: { userId: user.id },
        }),
      });

      const session = await response.json();

      if (session.error) throw session.error;

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY);
      if (!stripe) throw new Error("Stripe failed to load");

      await stripe.redirectToCheckout({ sessionId: session.id });

      setStatus("success");
      Sentry.captureMessage("Checkout initiated", { user: user.id });

    } catch (err) {
      setStatus("error");
      setError(err.message || "An unknown error occurred.");
      Sentry.captureException(err);
      console.error("Checkout Error:", err);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-900 rounded shadow text-center mt-10">
        <h1 className="text-2xl font-semibold text-red-600">⚠️ Access Denied</h1>
        <p className="text-gray-700 dark:text-gray-300 mt-2">
          Please log in to proceed to checkout.
        </p>
        <Link href="/login">
          <button className="mt-4 px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 transition">
            Go to Login
          </button>
        </Link>
      </section>
    );
  }

  if (cart.length === 0) {
    return (
      <section className="max-w-xl mx-auto p-6 text-center">
        <p className="text-gray-600 dark:text-gray-300">🛒 Your cart is empty.</p>
        <Link href="/">
          <button className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Continue Shopping
          </button>
        </Link>
      </section>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 mt-10 bg-white dark:bg-gray-900 rounded shadow">
      <h1 className="text-3xl font-bold text-center mb-4">Secure Checkout</h1>

      {status === "error" && (
        <div role="alert" aria-live="assertive" className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      <section aria-labelledby="order-summary-heading">
        <h2 id="order-summary-heading" className="text-xl font-semibold mb-3">
          Order Summary
        </h2>

        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {cart.map((item) => (
            <li key={item.id} className="flex justify-between py-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Qty: {item.quantity}
                </p>
              </div>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>

        <div className="flex justify-between font-bold text-lg mt-4">
          <span>Total:</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
      </section>

      <button
        onClick={handleCheckout}
        disabled={status === "loading"}
        className={`w-full mt-6 py-3 px-6 rounded-lg text-white transition ${
          status === "loading"
            ? "bg-blue-300 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
        aria-busy={status === "loading"}
      >
        {status === "loading" ? "Processing..." : "Pay Securely"}
      </button>

      <p className="mt-6 text-sm text-center text-gray-400">
        🔒 SSL secured & encrypted
      </p>
    </main>
  );
}




