// pages/product.js
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import * as Sentry from "@sentry/nextjs";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

const ProductCard = dynamic(() => import("@/components/ProductCard"), {
  loading: () => <ProductCardSkeleton />
});

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [country, setCountry] = useState(router.query.country || "");
  const [status, setStatus] = useState("idle");

  const countries = [
    "Algeria", "Bahrain", "Comoros", "Djibouti", "Egypt", "Iraq", "Jordan",
    "Kuwait", "Lebanon", "Libya", "Mauritania", "Morocco", "Oman", "Palestine",
    "Qatar", "Saudi Arabia", "Somalia", "Sudan", "Syria", "Tunisia", "UAE", "Yemen"
  ];

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchProducts() {
      setStatus("loading");
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/products`);
        if (country) url.searchParams.set("country", country);

        const res = await fetch(url, {
          signal: abortController.signal,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300, stale-while-revalidate=60"
          }
        });

        if (res.status === 404) throw new Error("Products not found");
        if (res.status >= 500) throw new Error("Server error occurred");

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (!Array.isArray(data)) {
          Sentry.captureMessage("Invalid products API response format");
          throw new Error("Invalid API response structure");
        }

        const sanitized = data.map(sanitizeProduct);
        setProducts(sanitized);
        setStatus("success");
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Fetch error:", err);
          Sentry.captureException(err);
          setStatus("error");
        }
      }
    }

    fetchProducts();
    return () => abortController.abort();
  }, [country]);

  useEffect(() => {
    const query = country ? { country } : {};
    router.replace({ pathname: "/product", query }, undefined, { shallow: true });
  }, [country]);

  const sanitizeProduct = (product) => ({
    id: product.id || `missing-${Math.random().toString(36).slice(2, 10)}`,
    title: product.title?.trim() || "Untitled Product",
    description: product.description?.trim() || "Description not available",
    price: validatePrice(product.price),
    images: Array.isArray(product.images) ? product.images : [],
    country: product.country || "Unknown Origin"
  });

  const validatePrice = (price) => {
    const parsed = parseFloat(price);
    return !isNaN(parsed) && parsed >= 0 ? parsed : 0;
  };

  return (
    <>
      <Head>
        <title>All Products – Our Arab Heritage</title>
        <meta name="description" content="Browse authentic handmade products from 22 Arab countries. Filter by region and support local artisans." />
        <meta property="og:image" content="/og-products.jpg" />
        <link rel="canonical" href="https://ourarabheritage.com/products" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "All Products – Our Arab Heritage",
            description: "Browse authentic handmade products from 22 Arab countries",
            url: "https://ourarabheritage.com/products"
          })}
        </script>
      </Head>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          Explore Arab Artistry
        </h1>

        <div className="mb-8 max-w-xs">
          <label htmlFor="country-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Country:
          </label>
          <select
            id="country-filter"
            className="w-full p-3 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              Sentry.addBreadcrumb({
                category: "filter",
                message: `Filtered by ${e.target.value}`,
                level: "info"
              });
            }}
            aria-label="Filter products by country"
          >
            <option value="">All Arab Nations</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {status === 'error' && (
          <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg mb-8 text-center">
            Failed to load products. Please try refreshing the page.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {status === 'loading' ? (
            Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={`skeleton-${i}`} />
            ))
          ) : products.length > 0 ? (
            products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={index < 4}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                No products found{country && ` from ${country}`}
              </p>
              {country && (
                <button
                  onClick={() => setCountry("")}
                  className="mt-4 text-heritageGold hover:underline"
                >
                  Clear country filter
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

