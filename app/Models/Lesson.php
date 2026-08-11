<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

class Lesson extends Model
{
    use HasFactory, BelongsToTenant;

    // Valid lesson types
    const TYPES = ['video', 'pdf', 'text', 'link', 'download'];

    protected $fillable = [
        'tenant_id', 'module_id', 'title', 'type',
        'body', 'url', 'file_path', 'duration_seconds',
        'order', 'release_at', 'is_published', 'is_previewable',
    ];

    protected function casts(): array
    {
        return [
            'release_at'       => 'datetime',
            'is_published'     => 'boolean',
            'is_previewable'   => 'boolean',
            'order'            => 'integer',
            'duration_seconds' => 'integer',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function progressFor(User $user): ?LessonProgress
    {
        return $this->hasOne(LessonProgress::class)
                    ->where('user_id', $user->id)
                    ->first();
    }

    // ─── Type helpers ─────────────────────────────────────────────────────────

    public function isVideo(): bool    { return $this->type === 'video'; }
    public function isPdf(): bool      { return $this->type === 'pdf'; }
    public function isText(): bool     { return $this->type === 'text'; }
    public function isLink(): bool     { return $this->type === 'link'; }
    public function isDownload(): bool { return $this->type === 'download'; }

    // ─── Release check ────────────────────────────────────────────────────────

    public function isReleasedNow(): bool
    {
        if (! $this->is_published) {
            return false;
        }

        if ($this->release_at && Carbon::now()->lt($this->release_at)) {
            return false;
        }

        return true;
    }
}
