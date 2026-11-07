<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'category_id',
        'name',
        'description',
        'price',
        'stock',
        'track_stock',
        'image',
        'is_available',
    ];

    protected $casts = [
        'price'        => 'decimal:2',
        'is_available' => 'boolean',
        'track_stock'  => 'boolean',
        'stock'        => 'integer',
    ];

    protected $appends = ['image_url', 'stock_status'];

    public function getImageUrlAttribute()
    {
        if ($this->image) {
            return asset('storage/' . $this->image);
        }
        return null;
    }

    public function getStockStatusAttribute()
    {
        if (!$this->track_stock) return 'unlimited';
        if ($this->stock <= 0)   return 'out_of_stock';
        if ($this->stock <= 10)   return 'low_stock';
        return 'in_stock';
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
