// pages/products/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import * as Sentry from "@sentry/nextjs";
import ReactMarkdown from "react-markdown";

const ProductSkeleton = () => (
  <div className="max-w-3xl mx-auto p-6 animate-pulse">
    <div className="h-64 bg-gray-200 rounded-lg mb-4" />
    <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4" />
    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-4" />
    <div className="h-12 bg-gray-200 rounded w-1/3 mx-auto" />
  </div>
);

export default function ProductDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Product fetch failed: ${res.status}`);
        const data = await res.json();

        if (!data?.id) throw new Error("Product not found");

        const validatedProduct = {
          id: data.id,
          title: data.title?.trim() || "Untitled Product",
          description: data.description?.trim() || "No description available",
          price: Math.max(0, parseFloat(data.price) || 0),
          images: Array.isArray(data.images) ? data.images.filter(Boolean) : ["/no-image.png"],
          sku: data.sku || "N/A",
          stock: Math.max(0, parseInt(data.stock) || 0),
        };

        setProduct(validatedProduct);
        setLoading(false);

        if (typeof window !== "undefined" && window.plausible) {
          window.plausible("ProductViewed", {
            props: { productId: validatedProduct.id, title: validatedProduct.title },
          });
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Product fetch error:", err);
          Sentry.captureException(err);
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchProduct();
    router.prefetch("/cart");
    return () => controller.abort();
  }, [id]);

  const handleAddToCart = () => {
    addToCart({ ...product, quantity });
    router.push("/cart");
  };

  if (loading) return <ProductSkeleton />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p>{error}</p>
          <button
            onClick={() => router.reload()}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
        <Link href="/products" className="mt-4 inline-block text-blue-600 hover:underline">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{`${product.title} | Our Arab Heritage`}</title>
        <meta name="description" content={product.description} />
        <meta property="og:image" content={product.images[0]} />
        <link rel="canonical" href={`https://ourarabheritage.com/products/${id}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            image: product.images,
            description: product.description,
            sku: product.sku,
            offers: {
              "@type": "Offer",
              price: product.price,
              priceCurrency: "USD",
              availability: product.stock > 0 ? "InStock" : "OutOfStock",
            },
          })}
        </script>
      </Head>

      <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow">
        {/* Image Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {product.images.map((img, index) => (
            <div key={index} className="relative h-64 sm:h-96">
              <Image
                src={img}
                alt={`${product.title} - Image ${index + 1}`}
                layout="fill"
                objectFit="cover"
                className="rounded-lg"
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {product.title}
        </h1>

        <div className="prose dark:prose-invert max-w-none mb-4">
          <ReactMarkdown>{product.description}</ReactMarkdown>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${product.price.toFixed(2)}
            </span>
            <div className="flex items-center gap-2">
              <label htmlFor="quantity" className="text-gray-700 dark:text-gray-300">
                Qty:
              </label>
              <select
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
                className="border rounded px-2 py-1 dark:bg-gray-700"
              >
                {[...Array(Math.min(10, product.stock)).keys()].map((n) => (
                  <option key={n + 1} value={n + 1}>
                    {n + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className={`w-full py-3 rounded-lg font-medium transition ${
              product.stock > 0
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-300 cursor-not-allowed text-gray-500"
            }`}
          >
            {product.stock > 0 ? "Add to Cart 🛒" : "Out of Stock"}
          </button>

          {product.stock > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
              {product.stock} items left in stock
            </p>
          )}
        </div>

        <div className="text-center">
          <Link href="/products">
            <a className="text-blue-600 hover:underline dark:text-blue-400">
              ← Back to Products
            </a>
          </Link>
        </div>
      </div>
    </>
  );
}
