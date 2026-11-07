<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class AdminMenuController extends Controller
{
    // ==================== CATEGORIES ====================

    public function categories()
    {
        return response()->json(
            Category::withCount('products')
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    public function storeCategory(Request $request)
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'is_active' => 'boolean',
            'image'     => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('categories', 'public');
        }

        $category = Category::create([
            'name'      => $request->name,
            'slug'      => Str::slug($request->name),
            'image'     => $imagePath,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json($category, 201);
    }

    public function updateCategory(Request $request, $id)
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'is_active' => 'boolean',
            'image'     => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $category  = Category::findOrFail($id);
        $imagePath = $category->image;

        if ($request->hasFile('image')) {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $imagePath = $request->file('image')->store('categories', 'public');
        }

        $category->update([
            'name'      => $request->name,
            'slug'      => Str::slug($request->name),
            'image'     => $imagePath,
            'is_active' => $request->is_active ?? $category->is_active,
        ]);

        return response()->json($category);
    }

    public function destroyCategory($id)
    {
        $category = Category::findOrFail($id);
        if ($category->image) {
            Storage::disk('public')->delete($category->image);
        }
        $category->delete();
        return response()->json(['message' => 'Category deleted']);
    }

    public function toggleCategory($id)
    {
        $category = Category::findOrFail($id);
        $category->update(['is_active' => !$category->is_active]);
        return response()->json([
            'message'  => $category->is_active ? 'Category activated.' : 'Category deactivated.',
            'category' => $category,
        ]);
    }

    // ==================== PRODUCTS ====================

    public function products()
    {
        return response()->json(
            Product::with('category')
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    public function storeProduct(Request $request)
    {
        $request->validate([
            'category_id'  => 'required|exists:categories,id',
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'price'        => 'required|numeric|min:0',
            'stock'        => 'required|integer|min:0',
            'track_stock'  => 'boolean',
            'is_available' => 'boolean',
            'image'        => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product = Product::create([
            'category_id'  => $request->category_id,
            'name'         => $request->name,
            'description'  => $request->description,
            'price'        => $request->price,
            'stock'        => $request->stock ?? 0,
            'track_stock'  => $request->track_stock ?? true,
            'image'        => $imagePath,
            'is_available' => $request->is_available ?? true,
        ]);

        return response()->json($product->load('category'), 201);
    }

    public function updateProduct(Request $request, $id)
    {
        $request->validate([
            'category_id'  => 'required|exists:categories,id',
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'price'        => 'required|numeric|min:0',
            'stock'        => 'required|integer|min:0',
            'track_stock'  => 'boolean',
            'is_available' => 'boolean',
            'image'        => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $product   = Product::findOrFail($id);
        $imagePath = $product->image;

        if ($request->hasFile('image')) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product->update([
            'category_id'  => $request->category_id,
            'name'         => $request->name,
            'description'  => $request->description,
            'price'        => $request->price,
            'stock'        => $request->stock,
            'track_stock'  => $request->track_stock ?? $product->track_stock,
            'image'        => $imagePath,
            'is_available' => $request->is_available ?? $product->is_available,
        ]);

        return response()->json($product->load('category'));
    }

    public function destroyProduct($id)
    {
        $product = Product::findOrFail($id);
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }
        $product->delete();
        return response()->json(['message' => 'Product deleted']);
    }

    public function updateStock(Request $request, $id)
    {
        $request->validate([
            'stock' => 'required|integer|min:0',
        ]);

        $product = Product::findOrFail($id);
        $product->update(['stock' => $request->stock]);

        return response()->json([
            'message' => 'Stock updated.',
            'product' => $product,
        ]);
    }
}
