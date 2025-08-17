import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function Cart() {
  const { cart, removeFromCart, clearCart } = useCart();
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 bg-white dark:bg-gray-900 rounded-lg shadow-md text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">🛒 Shopping Cart</h1>

      {cart.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 space-y-4">
          <p>Your cart is currently empty.</p>
          <Link href="/" className="inline-block mt-2 bg-ourArabGreen-500 text-white px-6 py-2 rounded hover:bg-ourArabGreen-600 transition">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {cart.map((item, index) => (
            <article
              key={index}
              className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4"
            >
              <div className="flex items-start gap-4">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    ${item.price.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="mt-2 sm:mt-0 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                aria-label={`Remove ${item.title}`}
              >
                Remove
              </button>
            </article>
          ))}

          <div className="text-right text-lg font-medium mt-6">
            Subtotal: <span className="text-green-600 dark:text-green-400">${subtotal}</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between mt-8 gap-4">
            <Link href="/checkout">
              <button
                disabled={cart.length === 0}
                className={`w-full sm:w-auto px-6 py-3 rounded transition text-white ${
                  cart.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Proceed to Checkout
              </button>
            </Link>

            <Link href="/">
              <button className="w-full sm:w-auto bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 transition">
                Continue Shopping
              </button>
            </Link>
          </div>

          <div className="text-center mt-4">
            <button
              onClick={clearCart}
              className="text-sm text-red-600 dark:text-red-400 underline hover:text-red-800"
            >
              Clear Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
