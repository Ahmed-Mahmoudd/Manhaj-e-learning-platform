<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonProgress extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'lesson_progress';

    protected $fillable = [
        'tenant_id', 'user_id', 'lesson_id',
        'seconds_spent', 'progress_pct',
        'completed_at', 'last_accessed_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_at'     => 'datetime',
            'last_accessed_at' => 'datetime',
            'seconds_spent'    => 'integer',
            'progress_pct'     => 'integer',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }
}
