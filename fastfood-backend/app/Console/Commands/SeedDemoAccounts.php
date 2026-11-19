<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\DemoUserSeeder;

class SeedDemoAccounts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'auth:seed-demo';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed or reset demo Admin and Customer accounts with standard hashed passwords';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Seeding demo accounts...');
        $seeder = new DemoUserSeeder();
        $seeder->run();
        $this->info('Demo accounts seeded successfully:');
        $this->line('  Admin:    admin@fastfood.demo / Admin123!');
        $this->line('  Customer: customer@fastfood.demo / Customer123!');
        return Command::SUCCESS;
    }
}
