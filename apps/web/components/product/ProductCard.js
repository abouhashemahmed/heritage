// apps/web/components/product/ProductCard.js
import Link from "next/link";
import Image from "next/image";
import PropTypes from "prop-types";

const ProductCard = ({ product }) => {
  if (!product) return null;

  const imageSrc = product.images?.[0] || "/no-image.png";
  const imageAlt = product.title
    ? `${product.title} – Our Arab Heritage Product`
    : "Traditional Arab cultural product";

  const price = typeof product.price === "number"
    ? product.price.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : "Contact for Price";

  return (
    <article
      className="group relative border rounded-lg shadow-md bg-white hover:shadow-xl transition-all duration-300 overflow-hidden"
      role="article"
      aria-labelledby={`product-${product.id}-title`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover transition-opacity duration-300 group-hover:opacity-90"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          // placeholder="blur" // Consider removing unless using local image or real blurDataURL
          // blurDataURL="..." // replace with actual preview or remove for external images
        />
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h2
          id={`product-${product.id}-title`}
          className="text-lg font-semibold text-gray-800 group-hover:text-ourArabGreen transition-colors"
        >
          {product.title || "Untitled Product"}
        </h2>

        {product.description && (
          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        <p className="text-ourArabGreen font-bold text-lg mt-2">{price}</p>

        <Link
          href={`/products/${product.id}`}
          className="inline-block w-full mt-4 px-4 py-2 bg-ourArabGreen text-white text-center rounded-md hover:bg-ourArabGreen-600 transition-colors focus:outline-none focus:ring-2 focus:ring-ourArabGreen focus:ring-offset-2"
          aria-label={`Explore ${product.title || "this product"} details`}
        >
          View Details
        </Link>
      </div>
    </article>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    images: PropTypes.arrayOf(PropTypes.string),
  }),
};

export default ProductCard;

