<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrolments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('section_id')->constrained('sections')->cascadeOnDelete();
            // Status: enrolled | waitlisted | dropped | completed | withdrawn
            $table->string('status', 20)->default('enrolled');
            $table->unsignedSmallInteger('waitlist_position')->nullable();
            $table->timestamp('enrolled_at')->nullable();
            $table->timestamp('dropped_at')->nullable();
            $table->timestamps();

            // A student can only be enrolled once per section
            $table->unique(['student_id', 'section_id']);
            $table->index(['tenant_id', 'student_id']);
            $table->index(['section_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrolments');
    }
};
