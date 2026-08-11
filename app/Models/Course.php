<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'department_id', 'code',
        'title_en', 'title_ar', 'credit_hours', 'description', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'credit_hours' => 'integer',
            'is_active'    => 'boolean',
        ];
    }

    // ─── Relationships ────────────────────────────────────────────────────────

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class);
    }

    public function modules(): HasMany
    {
        return $this->hasMany(\App\Models\Module::class)->orderBy('order');
    }

    /** Courses that MUST be completed before enrolling in this course */
    public function prerequisites(): BelongsToMany
    {
        return $this->belongsToMany(
            Course::class,
            'course_prerequisites',
            'course_id',
            'prerequisite_id'
        );
    }

    /** Courses for which THIS course is a prerequisite */
    public function dependentCourses(): BelongsToMany
    {
        return $this->belongsToMany(
            Course::class,
            'course_prerequisites',
            'prerequisite_id',
            'course_id'
        );
    }
}
