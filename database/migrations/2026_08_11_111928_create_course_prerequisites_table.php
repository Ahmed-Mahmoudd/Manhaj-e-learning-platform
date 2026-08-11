<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Self-referential many-to-many on courses
        // A course can require N prerequisite courses
        Schema::create('course_prerequisites', function (Blueprint $table) {
            $table->foreignId('course_id')
                  ->constrained('courses')->cascadeOnDelete();
            $table->foreignId('prerequisite_id')
                  ->constrained('courses')->cascadeOnDelete();

            $table->primary(['course_id', 'prerequisite_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_prerequisites');
    }
};
