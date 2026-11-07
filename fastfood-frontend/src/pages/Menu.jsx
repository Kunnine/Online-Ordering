import { useState, useEffect } from "react";
import api from "../api/axios";
import ProductCard from "../components/ProductCard";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

const PAGE_SIZE = 8;

/**
 * Menu — customer-facing food catalogue.
 *
 * Improvements over the previous version:
 *  - Debounced search (350ms) to avoid spamming the API on every keystroke.
 *  - Single source of truth for filtering: the server already supports
 *    category_id / search / min_price / max_price / sort, so we pass those as
 *    query params and stop double-filtering the result client-side.
 *  - Client-side pagination over the returned page (no backend change needed).
 *  - Loading skeletons + friendly empty state.
 *  - Fully responsive grid (2 / 3 / 4 columns) with premium spacing/type.
 */
export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  // `searchInput` updates instantly for the input; `search` is debounced.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Fetch categories once.
  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data));
  }, []);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch products whenever a filter changes. Server does the filtering/sorting.
  useEffect(() => {
    const params = { sort: sortBy };
    if (activeCategory) params.category_id = activeCategory;
    if (search) params.search = search;
    if (priceRange.min) params.min_price = priceRange.min;
    if (priceRange.max) params.max_price = priceRange.max;

    api
      .get("/products", { params })
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [sortBy, activeCategory, search, priceRange.min, priceRange.max]);

  // Reset to first page whenever the result set changes (intentional).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [sortBy, activeCategory, search, priceRange.min, priceRange.max]);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const visible = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HERO */}
        <header className="mb-8 animate-fade-in">
          <p className="text-orange-500 font-semibold tracking-wide uppercase text-sm">
            FastFood
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">
            Order your favorite food
          </h1>
          <p className="text-gray-500 mt-2 text-base md:text-lg">
            Fresh meals from the best local kitchens, delivered fast.
          </p>
        </header>

        {/* TOOLBAR: search + sort */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5 flex flex-col md:flex-row gap-3 md:items-center sticky top-2 z-20">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search food, e.g. Burger, Pizza…"
              className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          >
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        {/* PRICE FILTER */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-gray-600">Price:</span>
          <input
            type="number"
            min="0"
            placeholder="Min"
            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
            value={priceRange.min}
            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none"
            value={priceRange.max}
            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
          />
        </div>

        {/* CATEGORY CHIPS */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          <CategoryChip
            label="All"
            active={!activeCategory}
            onClick={() => setActiveCategory(null)}
          />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.name}
              active={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            />
          ))}
        </div>

        {/* RESULTS HEADER */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-4">
            {products.length} {products.length === 1 ? "item" : "items"} found
          </p>
        )}

        {/* PRODUCT GRID / SKELETON / EMPTY */}
        {loading ? (
          <ProductGridSkeleton count={PAGE_SIZE} />
        ) : products.length === 0 ? (
          <EmptyState
            icon="🍽️"
            title="No food found"
            message="Try a different search, category, or price range."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <PagerButton
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </PagerButton>
            <span className="text-sm text-gray-600">
              Page {page} / {totalPages}
            </span>
            <PagerButton
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </PagerButton>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small presentational helpers ---------- */

function CategoryChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition ${
        active
          ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
          : "bg-white text-gray-600 border border-gray-200 hover:bg-orange-50"
      }`}
    >
      {label}
    </button>
  );
}

function PagerButton({ children, disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      {children}
    </button>
  );
}

function ProductGridSkeleton({ count }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col"
        >
          <Skeleton className="w-full h-40 sm:h-48 rounded-xl mb-3" />
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-1/2 mb-4" />
          <div className="flex items-center justify-between mt-auto">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
