<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GradeItem extends Model
{
    use HasFactory, BelongsToTenant;

    const TYPES = ['assignment', 'quiz', 'midterm', 'final', 'project', 'lab', 'attendance'];

    protected $fillable = [
        'tenant_id', 'section_id', 'type', 'name',
        'max_score', 'weight', 'due_at', 'order', 'is_published',
    ];

    protected function casts(): array
    {
        return [
            'max_score'    => 'float',
            'weight'       => 'float',
            'due_at'       => 'datetime',
            'is_published' => 'boolean',
            'order'        => 'integer',
        ];
    }

    public function tenant(): BelongsTo    { return $this->belongsTo(Tenant::class); }
    public function section(): BelongsTo   { return $this->belongsTo(Section::class); }

    public function studentGrades(): HasMany
    {
        return $this->hasMany(StudentGrade::class);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function gradeFor(User $student): ?StudentGrade
    {
        return $this->studentGrades()->where('student_id', $student->id)->first();
    }
}
