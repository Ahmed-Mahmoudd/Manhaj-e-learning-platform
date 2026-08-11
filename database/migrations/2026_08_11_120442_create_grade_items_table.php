<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('section_id')->constrained('sections')->cascadeOnDelete();
            // Types: assignment | quiz | midterm | final | project | lab | attendance
            $table->string('type', 30)->default('assignment');
            $table->string('name');                        // e.g. "Midterm Exam"
            $table->decimal('max_score', 8, 2)->default(100);
            // Weight as a percentage (0-100). NULL = unweighted (all items equal weight).
            $table->decimal('weight', 5, 2)->nullable();
            $table->timestamp('due_at')->nullable();
            $table->unsignedSmallInteger('order')->default(0);
            // Visible to students? Instructor can prepare items before publishing.
            $table->boolean('is_published')->default(false);
            $table->timestamps();

            $table->index(['tenant_id', 'section_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_items');
    }
};
