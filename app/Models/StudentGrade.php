<?php

namespace App\Models;

use App\Tenancy\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentGrade extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id', 'grade_item_id', 'student_id', 'graded_by',
        'score', 'feedback', 'is_published', 'graded_at',
    ];

    protected function casts(): array
    {
        return [
            'score'        => 'float',
            'is_published' => 'boolean',
            'graded_at'    => 'datetime',
        ];
    }

    public function gradeItem(): BelongsTo { return $this->belongsTo(GradeItem::class); }
    public function student(): BelongsTo   { return $this->belongsTo(User::class, 'student_id'); }
    public function gradedBy(): BelongsTo  { return $this->belongsTo(User::class, 'graded_by'); }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Score as a percentage of max_score */
    public function scorePercentage(): float
    {
        $max = $this->gradeItem->max_score;
        return $max > 0 ? round(($this->score / $max) * 100, 2) : 0.0;
    }

    /** Letter grade using standard GPA scale */
    public function letterGrade(): string
    {
        return match(true) {
            $this->scorePercentage() >= 93 => 'A',
            $this->scorePercentage() >= 90 => 'A-',
            $this->scorePercentage() >= 87 => 'B+',
            $this->scorePercentage() >= 83 => 'B',
            $this->scorePercentage() >= 80 => 'B-',
            $this->scorePercentage() >= 77 => 'C+',
            $this->scorePercentage() >= 73 => 'C',
            $this->scorePercentage() >= 70 => 'C-',
            $this->scorePercentage() >= 67 => 'D+',
            $this->scorePercentage() >= 63 => 'D',
            $this->scorePercentage() >= 60 => 'D-',
            default                        => 'F',
        };
    }
}
