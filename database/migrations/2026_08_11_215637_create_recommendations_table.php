<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->float('score')->default(0);
            $table->string('reason')->nullable();
            $table->string('source')->default('ml'); // 'ml' | 'rule' | 'manual'
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // A student gets at most one active recommendation per course per source
            $table->unique(['tenant_id', 'student_id', 'course_id', 'source'], 'rec_student_course_source_unique');
            $table->index(['tenant_id', 'student_id', 'is_active'], 'rec_tenant_student_active_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recommendations');
    }
};
