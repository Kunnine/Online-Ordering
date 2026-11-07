import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [stockModal, setStockModal] = useState(null);
  const [newStock, setNewStock] = useState(0);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    stock: 0,
    track_stock: true,
    is_available: true,
    image: null,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        api.get("/admin/products"),
        api.get("/admin/categories"),
      ]);
      setProducts(p.data);
      setCategories(c.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: "",
      category_id: "",
      stock: 0,
      track_stock: true,
      is_available: true,
      image: null,
    });
    setPreview(null);
    setError("");
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      category_id: product.category_id,
      stock: product.stock,
      track_stock: product.track_stock,
      is_available: product.is_available,
      image: null,
    });
    setPreview(product.image_url || null);
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("price", form.price);
    fd.append("category_id", form.category_id);
    fd.append("stock", form.stock);
    fd.append("track_stock", form.track_stock ? 1 : 0);
    fd.append("is_available", form.is_available ? 1 : 0);
    if (form.image) fd.append("image", form.image);

    try {
      if (editing) {
        fd.append("_method", "PUT");
        await api.post("/admin/products/" + editing.id, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/admin/products", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(", ")
        : err.response?.data?.message || "Failed to save product";
      setError(msg);
    }
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    await api.delete("/admin/products/" + id);
    fetchData();
  };

  const toggleAvailable = async (product) => {
    const fd = new FormData();
    fd.append("name", product.name);
    fd.append("description", product.description || "");
    fd.append("price", product.price);
    fd.append("category_id", product.category_id);
    fd.append("stock", product.stock);
    fd.append("track_stock", product.track_stock ? 1 : 0);
    fd.append("is_available", product.is_available ? 0 : 1);
    fd.append("_method", "PUT");
    await api.post("/admin/products/" + product.id, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    fetchData();
  };

  const openStockModal = (product) => {
    setStockModal(product);
    setNewStock(product.stock);
  };

  const updateStock = async () => {
    await api.put("/admin/products/" + stockModal.id + "/stock", {
      stock: newStock,
    });
    setStockModal(null);
    fetchData();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const StockBadge = ({ product }) => {
    if (!product.track_stock)
      return (
        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
          Unlimited
        </span>
      );
    if (product.stock <= 0)
      return (
        <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
          Out of stock
        </span>
      );
    if (product.stock <= 5)
      return (
        <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
          Low: {product.stock} left
        </span>
      );
    return (
      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
        {product.stock} in stock
      </span>
    );
  };

  if (loading)
    return (
      <div className="text-center text-orange-500 py-20 text-xl animate-pulse">
        Loading...
      </div>
    );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <button
          onClick={openAdd}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium transition"
        >
          + Add Product
        </button>
      </div>

      {/* Stock summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-2xl shadow mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {
              products.filter(
                (p) =>
                  p.stock_status === "in_stock" ||
                  p.stock_status === "unlimited",
              ).length
            }
          </p>
          <p className="text-xs text-gray-500">In Stock</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {products.filter((p) => p.stock_status === "low_stock").length}
          </p>
          <p className="text-xs text-gray-500">Low Stock</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">
            {products.filter((p) => p.stock_status === "out_of_stock").length}
          </p>
          <p className="text-xs text-gray-500">Out of Stock</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Product
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Category
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Price
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Stock
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Status
              </th>
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((product) => (
              <tr
                key={product.id}
                className={
                  "hover:bg-gray-50 transition " +
                  (product.stock_status === "out_of_stock"
                    ? "bg-red-50"
                    : product.stock_status === "low_stock"
                      ? "bg-yellow-50"
                      : "")
                }
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl">
                        🍔
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {product.description}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                    {product.category?.name}
                  </span>
                </td>
                <td className="px-6 py-4 font-semibold text-gray-800">
                  ${parseFloat(product.price).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <StockBadge product={product} />
                    {product.track_stock && (
                      <button
                        onClick={() => openStockModal(product)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition"
                      >
                        Update
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleAvailable(product)}
                    className={
                      "px-3 py-1 rounded-full text-xs font-medium transition " +
                      (product.is_available
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200")
                    }
                  >
                    {product.is_available ? "Available" : "Unavailable"}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(product)}
                      className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg text-sm transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg text-sm transition"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Stock Update Modal ── */}
      {stockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold mb-2">Update Stock</h2>
            <p className="text-gray-500 text-sm mb-4">{stockModal.name}</p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-sm text-gray-500">Current stock</p>
              <p className="text-2xl font-bold text-gray-800">
                {stockModal.stock} units
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Stock Amount
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNewStock(Math.max(0, newStock - 1))}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-lg transition"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={() => setNewStock(newStock + 1)}
                  className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-lg transition"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStockModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={updateStock}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-medium transition"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editing ? "Edit Product" : "Add Product"}
            </h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Image */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-orange-400 transition">
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null);
                        setForm({ ...form, image: null });
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <div className="text-3xl mb-1">📷</div>
                    <p className="text-xs text-gray-500">Click to upload</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({ ...form, stock: parseInt(e.target.value) || 0 })
                  }
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.track_stock}
                  onChange={(e) =>
                    setForm({ ...form, track_stock: e.target.checked })
                  }
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-sm text-gray-700">Track stock</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) =>
                    setForm({ ...form, is_available: e.target.checked })
                  }
                  className="accent-orange-500 w-4 h-4"
                />
                <span className="text-sm text-gray-700">Available</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-medium transition"
              >
                {editing ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
