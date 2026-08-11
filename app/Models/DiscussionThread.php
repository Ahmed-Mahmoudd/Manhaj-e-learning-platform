<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscussionThread extends Model
{
    use HasFactory, BelongsToTenant;

    const TYPES = ['general', 'question', 'resource'];

    protected $fillable = [
        'tenant_id', 'section_id', 'author_id', 'type',
        'title', 'body', 'is_pinned', 'is_locked', 'is_resolved',
        'replies_count', 'last_activity_at',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned'        => 'boolean',
            'is_locked'        => 'boolean',
            'is_resolved'      => 'boolean',
            'last_activity_at' => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function tenant(): BelongsTo  { return $this->belongsTo(Tenant::class); }
    public function section(): BelongsTo { return $this->belongsTo(Section::class); }
    public function author(): BelongsTo  { return $this->belongsTo(User::class, 'author_id'); }

    public function posts(): HasMany
    {
        return $this->hasMany(DiscussionPost::class, 'thread_id')->orderBy('created_at');
    }

    public function topLevelPosts(): HasMany
    {
        return $this->hasMany(DiscussionPost::class, 'thread_id')
                    ->whereNull('parent_post_id')
                    ->orderBy('is_instructor_answer', 'desc') // instructor answers float to top
                    ->orderBy('upvotes_count', 'desc')
                    ->orderBy('created_at');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isQuestion(): bool { return $this->type === 'question'; }
    public function isLocked(): bool   { return $this->is_locked; }

    /** Increment the cached replies_count and update last_activity_at */
    public function touchActivity(): void
    {
        $this->increment('replies_count');
        $this->update(['last_activity_at' => now()]);
    }
}
