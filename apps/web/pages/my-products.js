// pages/my-products.js
import { useEffect, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import PropTypes from "prop-types";
import { useRouter } from "next/router";
import useSWR from "swr";
import * as Sentry from "@sentry/nextjs";
import { ErrorBoundary } from "@sentry/nextjs";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import ListingSkeleton from "@/components/ListingSkeleton";
import ProductActions from "@/components/ProductActions";

const MAX_BULK_DELETE = 50;

const fetcher = (url, token, csrfToken) =>
  fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-CSRF-Token": csrfToken,
    },
  }).then((res) => res.json());

function MyProductsCore() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setUserId(localStorage.getItem("userId"));
  }, []);

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.token));
  }, []);

  const { data, error, isValidating, mutate } = useSWR(
    token && csrfToken && userId
      ? [`${process.env.NEXT_PUBLIC_API_URL}/products?sellerId=${userId}&page=${page}&limit=${pageSize}`, token, csrfToken]
      : null,
    fetcher,
    {
      keepPreviousData: true,
      onSuccess: (data) => setTotalPages(data.totalPages || 1),
      onError: (err) => Sentry.captureException(err),
    }
  );

  const handleBulkDelete = async () => {
    if (!navigator.onLine) {
      toast.error("You're offline");
      return;
    }

    if (selectedProducts.length > MAX_BULK_DELETE) {
      toast.error(`You can only delete up to ${MAX_BULK_DELETE} products`);
      return;
    }

    if (!window.confirm(`Delete ${selectedProducts.length} products?`)) return;

    const originalProducts = data.products;

    mutate(
      (prev) => ({
        ...prev,
        products: prev.products.filter((p) => !selectedProducts.includes(p.id)),
      }),
      false
    );

    setIsDeleting(true);
    try {
      await Promise.all(
        selectedProducts.map((id) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "X-CSRF-Token": csrfToken,
            },
          })
        )
      );
      setSelectedProducts([]);
      toast.success("Products deleted");
      mutate();
    } catch (err) {
      mutate({ ...data, products: originalProducts }, false);
      Sentry.captureException(err);
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!data || !Array.isArray(data.products)) return <ListingSkeleton />;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Toaster />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Products</h1>
        {selectedProducts.length > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            {isDeleting ? "Deleting..." : `Delete (${selectedProducts.length})`}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {data.products.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border p-4 rounded-lg shadow-sm dark:border-gray-700 flex justify-between items-center"
          >
            <div className="flex items-center gap-4">
              {product.images?.[0] && (
                <Image
                  src={product.images[0]}
                  alt="Product image"
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                  onError={(e) => (e.currentTarget.src = "/fallback.png")}
                />
              )}
              <div>
                <h2 className="font-semibold text-lg">{product.title}</h2>
                <p className="text-sm text-gray-600">${product.price.toFixed(2)}</p>
              </div>
            </div>
            <ProductActions
              product={product}
              onSelect={() => {
                setSelectedProducts((prev) =>
                  prev.includes(product.id)
                    ? prev.filter((id) => id !== product.id)
                    : [...prev, product.id]
                );
              }}
              selected={selectedProducts.includes(product.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex justify-between items-center text-sm text-gray-500">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function MyProductsPage() {
  return (
    <>
      <Head>
        <title>My Products | Our Arab Heritage</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <ErrorBoundary fallback={<div className="p-6 text-red-600 text-center">Something went wrong</div>}>
        <MyProductsCore />
      </ErrorBoundary>
    </>
  );
}
