<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discussion_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('thread_id')->constrained('discussion_threads')->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->restrictOnDelete();
            // NULL = top-level reply; set = nested reply (max depth 1 for simplicity)
            $table->foreignId('parent_post_id')->nullable()->constrained('discussion_posts')->cascadeOnDelete();
            $table->text('body');
            $table->unsignedInteger('upvotes_count')->default(0); // cached counter
            $table->boolean('is_instructor_answer')->default(false); // marks best answer
            $table->timestamps();

            $table->index(['thread_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discussion_posts');
    }
};
