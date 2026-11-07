<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\Category;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $burgers = Category::where('slug', 'burgers')->first()->id;
        $chicken = Category::where('slug', 'fried-chicken')->first()->id;
        $pizza   = Category::where('slug', 'pizza')->first()->id;
        $drinks  = Category::where('slug', 'drinks')->first()->id;
        $desserts = Category::where('slug', 'desserts')->first()->id;
        $sides   = Category::where('slug', 'sides')->first()->id;

        $products = [
            // Burgers
            ['category_id' => $burgers, 'name' => 'Classic Burger',      'description' => 'Juicy beef patty with lettuce, tomato and sauce',  'price' => 5.99],
            ['category_id' => $burgers, 'name' => 'Double Cheeseburger', 'description' => 'Double beef patty with extra cheese',               'price' => 7.99],
            ['category_id' => $burgers, 'name' => 'BBQ Bacon Burger',    'description' => 'Crispy bacon with BBQ sauce and onion rings',       'price' => 8.99],
            ['category_id' => $burgers, 'name' => 'Veggie Burger',       'description' => 'Plant-based patty with fresh vegetables',           'price' => 6.99],

            // Chicken
            ['category_id' => $chicken, 'name' => 'Crispy Chicken',      'description' => '3 pieces of crispy fried chicken',                  'price' => 6.99],
            ['category_id' => $chicken, 'name' => 'Spicy Chicken Wings', 'description' => '6 pieces of spicy buffalo wings',                   'price' => 7.49],
            ['category_id' => $chicken, 'name' => 'Chicken Strips',      'description' => '5 crispy chicken strips with dipping sauce',        'price' => 5.99],

            // Pizza
            ['category_id' => $pizza,   'name' => 'Pepperoni Pizza',     'description' => 'Classic pepperoni with mozzarella cheese',          'price' => 9.99],
            ['category_id' => $pizza,   'name' => 'BBQ Chicken Pizza',   'description' => 'Grilled chicken with BBQ sauce and peppers',        'price' => 10.99],
            ['category_id' => $pizza,   'name' => 'Margherita Pizza',    'description' => 'Fresh tomato sauce with basil and mozzarella',      'price' => 8.99],

            // Drinks
            ['category_id' => $drinks,  'name' => 'Cola',                'description' => 'Chilled Coca-Cola 500ml',                           'price' => 1.99],
            ['category_id' => $drinks,  'name' => 'Orange Juice',        'description' => 'Fresh squeezed orange juice',                       'price' => 2.49],
            ['category_id' => $drinks,  'name' => 'Milkshake',           'description' => 'Creamy vanilla or chocolate milkshake',             'price' => 3.99],

            // Desserts
            ['category_id' => $desserts, 'name' => 'Ice Cream',           'description' => 'Vanilla soft serve ice cream cone',                 'price' => 1.99],
            ['category_id' => $desserts, 'name' => 'Chocolate Brownie',   'description' => 'Warm chocolate brownie with ice cream',             'price' => 3.49],

            // Sides
            ['category_id' => $sides,   'name' => 'French Fries',        'description' => 'Crispy golden french fries',                        'price' => 2.49],
            ['category_id' => $sides,   'name' => 'Onion Rings',         'description' => 'Crispy battered onion rings',                       'price' => 2.99],
            ['category_id' => $sides,   'name' => 'Coleslaw',            'description' => 'Creamy homemade coleslaw',                          'price' => 1.99],
        ];

        foreach ($products as $product) {
            Product::create([
                ...$product,
                'stock'        => rand(10, 100),
                'track_stock'  => true,
                'is_available' => true,
            ]);
        }
    }
}
