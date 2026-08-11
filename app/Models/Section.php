<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Section extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'course_id', 'academic_term_id', 'instructor_id',
        'section_number', 'capacity', 'schedule', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'schedule'  => 'array',
            'capacity'  => 'integer',
            'is_active' => 'boolean',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class, 'academic_term_id');
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function teachingAssistants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'section_teaching_assistants');
    }

    public function enrolments(): HasMany
    {
        return $this->hasMany(Enrolment::class);
    }

    public function gradeItems(): HasMany
    {
        return $this->hasMany(GradeItem::class)->orderBy('order');
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class)->latest('published_at');
    }

    // ─── Business helpers ─────────────────────────────────────────────────────

    public function enrolledCount(): int
    {
        return $this->enrolments()->where('status', 'enrolled')->count();
    }

    public function hasCapacity(): bool
    {
        return $this->enrolledCount() < $this->capacity;
    }

    public function isFull(): bool
    {
        return ! $this->hasCapacity();
    }

    public function nextWaitlistPosition(): int
    {
        $max = $this->enrolments()
                    ->where('status', 'waitlisted')
                    ->max('waitlist_position');

        return ($max ?? 0) + 1;
    }
}
