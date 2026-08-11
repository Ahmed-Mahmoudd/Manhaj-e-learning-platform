<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            // Type: semester | summer | year
            $table->string('type', 20)->default('semester');
            $table->string('name');            // e.g. "Fall 2025/2026"
            $table->date('starts_at');
            $table->date('ends_at');
            $table->date('add_drop_deadline')->nullable();
            // Only one term per tenant can be active at a time
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_terms');
    }
};
