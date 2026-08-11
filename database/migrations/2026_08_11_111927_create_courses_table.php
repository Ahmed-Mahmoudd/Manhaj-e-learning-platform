<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('code', 20);           // e.g. "CS301"
            $table->string('title_en');
            $table->string('title_ar');
            $table->unsignedTinyInteger('credit_hours')->default(3);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'code']); // code unique per tenant
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
