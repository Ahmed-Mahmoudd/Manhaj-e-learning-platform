<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('order')->default(0);
            // Release rules
            $table->timestamp('release_at')->nullable();       // release on a specific date/time
            $table->foreignId('release_after_module_id')       // release after another module is completed
                  ->nullable()
                  ->constrained('modules')
                  ->nullOnDelete();
            $table->boolean('is_published')->default(false);
            $table->timestamps();

            $table->index(['course_id', 'order']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
