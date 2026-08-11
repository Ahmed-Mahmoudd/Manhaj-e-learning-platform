<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('academic_term_id')->constrained('academic_terms')->cascadeOnDelete();
            $table->foreignId('instructor_id')->constrained('users')->restrictOnDelete();
            $table->string('section_number', 10)->default('01'); // e.g. "01", "02"
            $table->unsignedSmallInteger('capacity')->default(30);
            $table->json('schedule')->nullable();   // [{day:"Mon", time:"10:00", room:"A101"}, ...]
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'academic_term_id']);
            $table->unique(['course_id', 'academic_term_id', 'section_number']); // unique section per term
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sections');
    }
};
