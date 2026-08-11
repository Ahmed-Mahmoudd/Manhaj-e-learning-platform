<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discussion_threads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('section_id')->constrained('sections')->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->restrictOnDelete();
            // Types: general | question | resource
            $table->string('type', 30)->default('general');
            $table->string('title');
            $table->text('body');                              // opening post body
            $table->boolean('is_pinned')->default(false);      // instructor can pin
            $table->boolean('is_locked')->default(false);      // no new replies when locked
            $table->boolean('is_resolved')->default(false);    // for question threads
            $table->unsignedInteger('replies_count')->default(0); // cached counter
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'section_id', 'is_pinned', 'last_activity_at'], 'threads_section_activity_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discussion_threads');
    }
};
