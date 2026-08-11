<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('grade_item_id')->constrained('grade_items')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('graded_by')->constrained('users')->restrictOnDelete();
            $table->decimal('score', 8, 2);           // raw score, e.g. 87.50
            $table->text('feedback')->nullable();      // instructor feedback
            $table->boolean('is_published')->default(false); // published to student?
            $table->timestamp('graded_at')->nullable();
            $table->timestamps();

            // One grade record per student per grade item
            $table->unique(['grade_item_id', 'student_id']);
            $table->index(['tenant_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_grades');
    }
};
