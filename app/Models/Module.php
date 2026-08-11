<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Module extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'course_id', 'title', 'description',
        'order', 'release_at', 'release_after_module_id', 'is_published',
    ];

    protected function casts(): array
    {
        return [
            'release_at'  => 'datetime',
            'is_published' => 'boolean',
            'order'        => 'integer',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function releaseAfterModule(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'release_after_module_id');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class)->orderBy('order');
    }

    // ─── Release logic ────────────────────────────────────────────────────────

    /**
     * Is this module available to a given user right now?
     * Checks both date-based and dependency-based release rules.
     */
    public function isAvailableTo(User $user): bool
    {
        if (! $this->is_published) {
            return false;
        }

        // Date-based release
        if ($this->release_at && Carbon::now()->lt($this->release_at)) {
            return false;
        }

        // Dependency-based: previous module must be 100% completed
        if ($this->release_after_module_id) {
            $allComplete = $this->releaseAfterModule
                ->lessons
                ->every(fn(Lesson $lesson) =>
                    $lesson->progressFor($user)?->completed_at !== null
                );

            if (! $allComplete) {
                return false;
            }
        }

        return true;
    }
}
