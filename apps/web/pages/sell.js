import { useState, useEffect, useRef } from "react";

export default function SellPage() {
  const [isClient, setIsClient] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [country, setCountry] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const messageRef = useRef(null);

  useEffect(() => setIsClient(true), []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file?.type.startsWith("image/")) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setMessage("");
    } else {
      setImage(null);
      setPreview(null);
      setMessage("❌ Please upload a valid image file");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!title || !description || !price || !country || !image) {
      setMessage("⚠️ Please fill out all fields and select an image.");
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setMessage("❌ Please enter a valid price");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("price", parsedPrice.toFixed(2));
      formData.append("country", country);
      formData.append("image", image);

      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("❌ Please login first");
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/add-product`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const text = await res.text();
      const data = JSON.parse(text);

      if (res.ok) {
        setMessage("✅ Product added successfully!");
        setTitle(""); setDescription(""); setPrice(""); setCountry("");
        setImage(null); setPreview(null);
      } else {
        setMessage(`❌ Error: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Submission error:", err);
      setMessage("❌ Failed to submit product. Please try again.");
    }

    setTimeout(() => {
      messageRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  if (!isClient) return null;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg mt-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Sell Your Product</h1>

      {message && (
        <div
          ref={messageRef}
          className={`mb-4 p-3 rounded text-sm ${
            message.startsWith("✅")
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Sell product form">
        <input
          type="text"
          placeholder="Product Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />

        <textarea
          placeholder="Product Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full p-3 border rounded-lg h-32 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />

        <input
          type="number"
          placeholder="Price (USD)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          min="0"
          step="0.01"
          className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          required
          className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        >
          <option value="">Select Country</option>
          {[
            "Palestine", "Morocco", "Egypt", "Syria", "Lebanon", "Saudi Arabia", "Jordan", "Iraq",
            "Algeria", "Tunisia", "Libya", "Yemen", "Kuwait", "Oman", "Bahrain", "Qatar",
            "United Arab Emirates", "Sudan", "Mauritania", "Somalia", "Djibouti", "Comoros"
          ].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Product Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            required
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg border mt-2"
            />
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          List Product
        </button>
      </form>
    </div>
  );
}
