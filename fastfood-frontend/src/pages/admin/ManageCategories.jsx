import { useState, useEffect } from "react";
import api from "../../api/axios";

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const [form, setForm] = useState({
    name: "",
    is_active: true,
    image: null,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = () => {
    setLoading(true);

    api
      .get("/admin/categories")
      .then((r) => setCategories(r.data))
      .catch(() => setError("Failed to load categories"))
      .finally(() => setLoading(false));
  };

  const openAdd = () => {
    setEditing(null);

    setForm({
      name: "",
      is_active: true,
      image: null,
    });

    setPreview(null);
    setError("");
    setShowModal(true);
  };

  const openEdit = (category) => {
    setEditing(category);

    setForm({
      name: category.name,
      is_active: category.is_active,
      image: null,
    });

    setPreview(category.image_url || null);
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const fd = new FormData();

    fd.append("name", form.name);
    fd.append("is_active", form.is_active ? 1 : 0);

    if (form.image) {
      fd.append("image", form.image);
    }

    try {
      if (editing) {
        fd.append("_method", "PUT");

        await api.post("/admin/categories/" + editing.id, fd, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        await api.post("/admin/categories", fd, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      setShowModal(false);
      fetchCategories();
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(", ")
        : err.response?.data?.message || "Failed to save category";

      setError(msg);
    }
  };

  const deleteCategory = async (id) => {
    if (
      !confirm(
        "Delete this category? All products inside it will also be deleted.",
      )
    )
      return;

    await api.delete("/admin/categories/" + id);

    fetchCategories();
  };

  const toggleCategory = async (id) => {
    await api.put("/admin/categories/" + id + "/toggle");

    fetchCategories();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      setForm({
        ...form,
        image: file,
      });

      setPreview(URL.createObjectURL(file));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-orange-500 text-2xl font-bold animate-pulse">
          Loading Categories...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-800">Categories</h1>

          <p className="text-gray-500 mt-2">
            Manage your restaurant categories
          </p>
        </div>

        <button
          onClick={openAdd}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          + Add Category
        </button>
      </div>

      {/* CATEGORY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
        {categories.map((category) => (
          <div
            key={category.id}
            className={
              "group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 " +
              (!category.is_active ? "opacity-70" : "")
            }
          >
            {/* IMAGE */}
            <div className="relative overflow-hidden">
              {category.image_url ? (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="w-full h-72 object-cover group-hover:scale-105 transition duration-500"
                />
              ) : (
                <div className="w-full h-72 bg-orange-100 flex items-center justify-center text-7xl">
                  📂
                </div>
              )}

              {/* STATUS */}
              <div className="absolute top-4 right-4">
                <span
                  className={
                    "px-3 py-1 rounded-full text-xs font-semibold shadow " +
                    (category.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700")
                  }
                >
                  {category.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* CONTENT */}
            <div className="p-5">
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  {category.name}
                </h3>

                <p className="text-gray-500 text-sm mt-1">
                  {category.products_count} Products
                </p>
              </div>

              {/* BUTTONS */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={
                    "flex-1 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 " +
                    (category.is_active
                      ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200")
                  }
                >
                  {category.is_active ? "Deactivate" : "Activate"}
                </button>

                <button
                  onClick={() => openEdit(category)}
                  className="px-4 py-3 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-2xl transition-all duration-300"
                >
                  ✏️
                </button>

                <button
                  onClick={() => deleteCategory(category.id)}
                  className="px-4 py-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-2xl transition-all duration-300"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* TOP */}
            <div className="bg-orange-500 p-6">
              <h2 className="text-2xl font-bold text-white">
                {editing ? "Edit Category" : "Add Category"}
              </h2>

              <p className="text-orange-100 text-sm mt-1">
                Manage category information
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl mb-5 text-sm">
                  {error}
                </div>
              )}

              {/* IMAGE */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category Image
                </label>

                <div className="border-2 border-dashed border-gray-300 rounded-3xl p-5 text-center hover:border-orange-400 transition-all duration-300">
                  {preview ? (
                    <div className="relative">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-64 object-cover rounded-2xl mb-3"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setPreview(null);

                          setForm({
                            ...form,
                            image: null,
                          });
                        }}
                        className="absolute top-3 right-3 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="text-6xl mb-3">📷</div>

                      <p className="font-semibold text-gray-700">
                        Upload Image
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        PNG, JPG or JPEG
                      </p>

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

              {/* NAME */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category Name
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3 focus:outline-none focus:ring-4 focus:ring-orange-200 focus:border-orange-400 transition-all"
                  placeholder="Enter category name"
                  required
                />
              </div>

              {/* ACTIVE */}
              <label className="flex items-center gap-3 cursor-pointer mb-6 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_active: e.target.checked,
                    })
                  }
                  className="accent-orange-500 w-5 h-5"
                />

                <span className="text-gray-700 font-medium">
                  Active (Visible to customers)
                </span>
              </label>

              {/* BUTTONS */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-2xl hover:bg-gray-100 transition-all duration-300 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {editing ? "Save Changes" : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
