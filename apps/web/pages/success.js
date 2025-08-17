import { useEffect, useCallback } from "react";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/router";

export default function SuccessPage() {
  const { setCart } = useCart();
  const router = useRouter();

  useEffect(() => {
    setCart([]);
    localStorage.removeItem("cart");

    if (typeof window !== "undefined" && window.plausible) {
      window.plausible("CheckoutSuccess");
    }
  }, [setCart]);

  const handleContinueShopping = useCallback(() => {
    router.push("/products");
  }, [router]);

  return (
    <>
      <Head>
        <title>🎉 Order Confirmed – Our Arab Heritage</title>
        <meta name="robots" content="noindex" />
        <meta name="description" content="Thank you for your purchase. Your order has been successfully processed." />
        <link rel="canonical" href="https://ourarabheritage.com/success" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Order",
            "orderStatus": "https://schema.org/OrderProcessing",
            "seller": {
              "@type": "Organization",
              "name": "Our Arab Heritage"
            }
          })}
        </script>
      </Head>

      <div
        className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg text-center"
        role="status"
        aria-live="polite"
      >
        <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">
          Payment Successful! 🎉
        </h1>

        <p className="text-lg text-gray-700 dark:text-gray-300 mt-4">
          Thank you for your purchase! Your order is being processed.
        </p>

        <button
          onClick={handleContinueShopping}
          className="mt-6 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Continue shopping"
        >
          Continue Shopping
        </button>
      </div>
    </>
  );
}
