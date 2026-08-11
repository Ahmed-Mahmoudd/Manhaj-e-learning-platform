<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscussionPost extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'thread_id', 'author_id', 'parent_post_id',
        'body', 'upvotes_count', 'is_instructor_answer',
    ];

    protected function casts(): array
    {
        return [
            'is_instructor_answer' => 'boolean',
            'upvotes_count'        => 'integer',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function thread(): BelongsTo     { return $this->belongsTo(DiscussionThread::class, 'thread_id'); }
    public function author(): BelongsTo     { return $this->belongsTo(User::class, 'author_id'); }
    public function parent(): BelongsTo     { return $this->belongsTo(self::class, 'parent_post_id'); }

    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_post_id')->orderBy('created_at');
    }

    public function votes(): HasMany
    {
        return $this->hasMany(DiscussionPostVote::class, 'post_id');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function hasVotedBy(User $user): bool
    {
        return $this->votes()->where('user_id', $user->id)->exists();
    }
}
