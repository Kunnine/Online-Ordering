<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Burgers',    'slug' => 'burgers'],
            ['name' => 'Fried Chicken', 'slug' => 'fried-chicken'],
            ['name' => 'Pizza',      'slug' => 'pizza'],
            ['name' => 'Drinks',     'slug' => 'drinks'],
            ['name' => 'Desserts',   'slug' => 'desserts'],
            ['name' => 'Sides',      'slug' => 'sides'],
        ];

        foreach ($categories as $category) {
            Category::create([
                'name'      => $category['name'],
                'slug'      => $category['slug'],
                'image'     => null,
                'is_active' => true,
            ]);
        }
    }
}
