<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('discussion_post_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('discussion_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('voted_at');

            $table->unique(['post_id', 'user_id']); // one vote per user per post
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discussion_post_votes');
    }
};
