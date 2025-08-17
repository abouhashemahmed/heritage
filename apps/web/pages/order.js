import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ShoppingBagIcon, ClipboardIcon } from "@heroicons/react/24/outline";

const OrderSkeleton = () => (
  <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-md animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
  </div>
);

const statusColors = {
  processing: "bg-yellow-100 text-yellow-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchOrders = async (controller) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/orders/${user.id}`,
        { signal: controller?.signal }
      );
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching orders:", err);
        setError("Unable to load orders. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetchOrders(controller);
    return () => controller.abort();
  }, [user]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        Please log in to view your orders.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Your Orders</h1>

      {loading ? (
        <div className="space-y-4">
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
        </div>
      ) : error ? (
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={() => fetchOrders()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
            No orders yet
          </h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Your order history will appear here
          </p>
          <div className="mt-6">
            <Link href="/products" className="text-blue-600 hover:text-blue-800">
              Browse products →
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="border border-gray-200 dark:border-gray-700 p-4 rounded-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                    Order #{order.id}
                    <button
                      onClick={() => navigator.clipboard.writeText(order.id)}
                      title="Copy Order ID"
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    >
                      <ClipboardIcon className="h-4 w-4" />
                    </button>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Total: ${order.total?.toFixed(2) ?? "0.00"}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    statusColors[order.status] || "bg-gray-100"
                  }`}
                >
                  {order.status || "unknown"}
                </span>
              </div>

              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {formatDate(order.createdAt)}
              </p>

              <button
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="text-blue-600 hover:text-blue-800 text-sm mt-2"
              >
                {expandedOrder === order.id ? "Hide details" : "View details"}
              </button>

              {expandedOrder === order.id && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {order.items?.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {order.items.map((item, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{item.name} x{item.quantity}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No items listed.</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
