<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class AcademicTerm extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'type', 'name',
        'starts_at', 'ends_at', 'add_drop_deadline', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'starts_at'         => 'date',
            'ends_at'           => 'date',
            'add_drop_deadline' => 'date',
            'is_active'         => 'boolean',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    // ─── Business helpers ─────────────────────────────────────────────────────

    /** Is it still within the add/drop window? */
    public function isWithinAddDropPeriod(): bool
    {
        if (! $this->add_drop_deadline) {
            return false;
        }

        return Carbon::now()->lte($this->add_drop_deadline);
    }

    /** Is today between start and end dates? */
    public function isCurrentlyRunning(): bool
    {
        $now = Carbon::now()->toDateString();
        return $now >= $this->starts_at->toDateString()
            && $now <= $this->ends_at->toDateString();
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
