<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->text('qr_image_uri')->nullable()->after('response_data');
            $table->text('qr_image_path')->nullable()->after('qr_image_uri');
            $table->text('qr_image_base64')->nullable()->after('qr_image_path');
            $table->string('khqr_mark')->nullable()->after('qr_image_base64');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['qr_image_uri', 'qr_image_path', 'qr_image_base64', 'khqr_mark']);
        });
    }
};
