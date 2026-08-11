<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');                          // University display name
            $table->string('subdomain')->unique();           // e.g. "cairo-uni" → cairo-uni.manhaj.app
            $table->string('logo')->nullable();              // Path/URL to branding logo
            $table->string('locale', 10)->default('en');     // e.g. "en", "ar"
            $table->string('timezone', 64)->default('UTC');  // e.g. "Africa/Cairo"
            $table->string('grading_system', 32)->default('credit_gpa'); // credit_gpa | year_percentage
            $table->json('settings')->nullable();            // Arbitrary tenant-level config
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
