<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Category;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ProductSeeder;

return new class extends Migration
{
    /**
     * Seed initial catalog (categories and products) if empty.
     */
    public function up(): void
    {
        if (Category::count() === 0) {
            $catSeeder = new CategorySeeder();
            $catSeeder->run();

            $prodSeeder = new ProductSeeder();
            $prodSeeder->run();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep data on rollback unless required
    }
};
