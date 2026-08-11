<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('programmes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->string('name_en');
            $table->string('name_ar');
            $table->string('code', 20)->nullable();
            // credit_gpa (credit hours + GPA) or year_percentage (year-based %)
            $table->string('grading_type', 32)->default('credit_gpa');
            $table->unsignedTinyInteger('duration_years')->default(4);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'department_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('programmes');
    }
};
