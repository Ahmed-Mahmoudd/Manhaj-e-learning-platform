<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Enrolment extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'student_id', 'section_id',
        'status', 'waitlist_position', 'enrolled_at', 'dropped_at',
    ];

    protected function casts(): array
    {
        return [
            'enrolled_at'       => 'datetime',
            'dropped_at'        => 'datetime',
            'waitlist_position' => 'integer',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    // ─── Status helpers ───────────────────────────────────────────────────────

    public function isEnrolled(): bool     { return $this->status === 'enrolled'; }
    public function isWaitlisted(): bool   { return $this->status === 'waitlisted'; }
    public function isDropped(): bool      { return $this->status === 'dropped'; }
    public function isCompleted(): bool    { return $this->status === 'completed'; }
    public function isWithdrawn(): bool    { return $this->status === 'withdrawn'; }
}
