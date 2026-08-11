<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Announcement extends Model
{
    use HasFactory, BelongsToTenant;

    const TYPES = ['general', 'assignment', 'exam', 'urgent'];

    protected $fillable = [
        'tenant_id', 'section_id', 'author_id',
        'type', 'title', 'body',
        'is_published', 'published_at',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function tenant(): BelongsTo  { return $this->belongsTo(Tenant::class); }
    public function section(): BelongsTo { return $this->belongsTo(Section::class); }
    public function author(): BelongsTo  { return $this->belongsTo(User::class, 'author_id'); }

    /** Students who have read this announcement */
    public function readers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'announcement_reads', 'announcement_id', 'user_id')
                    ->withPivot('read_at');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(AnnouncementRead::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isReadBy(User $user): bool
    {
        return $this->reads()->where('user_id', $user->id)->exists();
    }

    public function isUrgent(): bool
    {
        return $this->type === 'urgent';
    }
}
