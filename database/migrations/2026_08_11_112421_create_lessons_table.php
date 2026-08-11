<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->string('title');
            // Types: video | pdf | text | link | download
            $table->string('type', 20)->default('text');
            // Flexible content storage:
            $table->text('body')->nullable();          // for type=text (rich HTML)
            $table->string('url')->nullable();         // for type=link or video (external)
            $table->string('file_path')->nullable();   // for type=pdf, download, uploaded video
            $table->unsignedInteger('duration_seconds')->nullable(); // for video
            $table->unsignedSmallInteger('order')->default(0);
            $table->timestamp('release_at')->nullable();
            $table->boolean('is_published')->default(false);
            $table->boolean('is_previewable')->default(false); // guests can preview?
            $table->timestamps();

            $table->index(['module_id', 'order']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lessons');
    }
};
