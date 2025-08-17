// pages/index.js
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Navbar from "@/components/Navbar";
import * as Sentry from "@sentry/nextjs";
import Image from "next/image";

// 🔸 Static import for ProductCard instead of dynamic import
import ProductCard from "@/components/product/ProductCard.js";

// Skeleton loader for loading placeholders
const ProductSkeleton = () => (
  <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
);

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [country, setCountry] = useState(router.query.country || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("idle");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const lastProductRef = useRef();

  const countries = useMemo(() => {
    return [...new Set(products.map((p) => p.country))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (country) {
      result = result.filter(
        (p) => p.country?.toLowerCase() === country.toLowerCase()
      );
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, country, searchQuery]);

  const fetchProducts = useCallback(async () => {
    setStatus("loading");
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/products`);
      if (country) url.searchParams.append("country", country);
      if (page > 1) url.searchParams.append("page", page);

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid response format");

      setProducts((prev) => (page === 1 ? data : [...prev, ...data]));
      setHasMore(data.length >= 20);
      setStatus("success");
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Fetch error:", err);
        Sentry.captureException(err);
        setStatus("error");
      }
    }
  }, [country, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const query = {};
    if (country) query.country = country;
    if (searchQuery) query.search = searchQuery;

    router.replace({ query }, undefined, {
      shallow: true,
      scroll: false,
    });
  }, [country, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && status === "success") {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );

    if (lastProductRef.current) {
      observer.observe(lastProductRef.current);
    }

    return () => {
      if (lastProductRef.current) {
        observer.unobserve(lastProductRef.current);
      }
    };
  }, [hasMore, status]);

  return (
    <>
      <Head>
        <title>Our Arab Heritage – Marketplace</title>
        <meta
          name="description"
          content="Explore authentic Arab crafts and heritage products from across 22 countries. Filter by region and support local artisans."
        />
        <meta property="og:image" content="/og-marketplace.jpg" />
        <link rel="canonical" href="https://ourarabheritage.com/marketplace" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: products.slice(0, 10).map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": "Product",
                  name: product.name,
                  description: product.description,
                  image: product.imageUrl,
                  offers: {
                    "@type": "Offer",
                    price: product.price,
                    priceCurrency: product.currency || "USD",
                  },
                },
              })),
            }),
          }}
        />
      </Head>

      <Navbar />

      <main className="bg-white dark:bg-gray-900">
        <section className="relative bg-gradient-to-r from-arabicBlue to-heritageGold py-16 text-center">
          <Image
            src="/images/arabic-pattern-bg.jpg"
            alt="Arabic pattern background"
            layout="fill"
            objectFit="cover"
            quality={80}
            className="opacity-20"
            priority
          />
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white px-4">
              Preserving Arab Heritage Through Craftsmanship
            </h1>
            <p className="text-gray-200 mt-4 max-w-2xl mx-auto">
              Discover authentic handmade products from 22 Arab nations
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div>
              <label
                htmlFor="country-filter"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Filter by Country:
              </label>
              <select
                id="country-filter"
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCountry("");
                }}
                aria-label="Filter products by country"
              >
                <option value="">Show All Countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="product-search"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Search Products:
              </label>
              <input
                id="product-search"
                type="text"
                placeholder="Search by name or description..."
                className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                aria-label="Search products"
              />
            </div>
          </div>
        </div>

        <section
          className="container mx-auto px-4 py-8"
          aria-labelledby="products-heading"
        >
          <h2 id="products-heading" className="sr-only">
            Products List
          </h2>

          {status === "error" && (
            <div
              className="bg-red-50 text-red-700 p-4 rounded-lg text-center mb-8"
              role="alert"
            >
              <p>Failed to load products.</p>
              <button
                onClick={fetchProducts}
                className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {status === "loading" && page === 1 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  ref={
                    index === filteredProducts.length - 1
                      ? lastProductRef
                      : null
                  }
                >
                  <ProductCard product={product} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No products found
                  {country && ` in ${country}`}
                  {searchQuery && ` matching "${searchQuery}"`}.
                </p>
                {(country || searchQuery) && (
                  <button
                    onClick={() => {
                      setCountry("");
                      setSearchQuery("");
                    }}
                    className="mt-4 text-heritageGold hover:underline"
                    aria-label="Clear filters"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {status === "loading" && page > 1 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl-grid-cols-4 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductSkeleton key={`more-${i}`} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
