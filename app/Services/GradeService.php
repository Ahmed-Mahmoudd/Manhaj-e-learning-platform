<?php

namespace App\Services;

use App\Models\GradeItem;
use App\Models\Section;
use App\Models\StudentGrade;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * GradeService — all grading business logic in one place.
 *
 * Responsibilities:
 *   - Enter / update a student's grade on a grade item
 *   - Publish grades (item-level or all items in a section)
 *   - Calculate weighted section average for a student
 *   - Map percentage to letter grade
 */
class GradeService
{
    /**
     * Enter or update a grade for a student on a grade item.
     * Creates the record if it doesn't exist (upsert).
     *
     * @throws \InvalidArgumentException if score exceeds max_score
     */
    public function enterGrade(
        GradeItem $item,
        User      $student,
        float     $score,
        User      $gradedBy,
        ?string   $feedback = null
    ): StudentGrade {
        if ($score > $item->max_score) {
            throw new \InvalidArgumentException(
                "Score {$score} exceeds max score {$item->max_score} for '{$item->name}'."
            );
        }

        if ($score < 0) {
            throw new \InvalidArgumentException('Score cannot be negative.');
        }

        $grade = StudentGrade::withoutGlobalScope('tenant')->updateOrCreate(
            [
                'grade_item_id' => $item->id,
                'student_id'    => $student->id,
            ],
            [
                'tenant_id'  => $item->tenant_id,
                'graded_by'  => $gradedBy->id,
                'score'      => $score,
                'feedback'   => $feedback,
                'graded_at'  => now(),
            ]
        );

        return $grade->fresh(['gradeItem']);
    }

    /**
     * Publish all graded scores for a given grade item.
     * After this, students can see their grades via the API.
     *
     * @throws \RuntimeException if no grades have been entered yet
     */
    public function publishGradeItem(GradeItem $item): int
    {
        return DB::transaction(function () use ($item) {
            // Mark the item itself as published
            $item->update(['is_published' => true]);

            // Publish all student grade records for this item
            return StudentGrade::withoutGlobalScope('tenant')
                ->where('grade_item_id', $item->id)
                ->update(['is_published' => true]);
        });
    }

    /**
     * Calculate a student's weighted overall grade for a section.
     *
     * If grade items have weights: uses weighted average.
     * If no weights defined: uses simple average of score percentages.
     *
     * Only published grades are included.
     *
     * Returns ['percentage' => float, 'letter' => string, 'items_graded' => int]
     */
    public function sectionGradeSummary(User $student, Section $section): array
    {
        $publishedItems = $section->gradeItems()
            ->where('is_published', true)
            ->get();

        if ($publishedItems->isEmpty()) {
            return ['percentage' => null, 'letter' => null, 'items_graded' => 0];
        }

        $grades = StudentGrade::withoutGlobalScope('tenant')
            ->where('student_id', $student->id)
            ->where('is_published', true)
            ->whereIn('grade_item_id', $publishedItems->pluck('id'))
            ->with('gradeItem')
            ->get();

        if ($grades->isEmpty()) {
            return ['percentage' => null, 'letter' => null, 'items_graded' => 0];
        }

        $hasWeights = $publishedItems->whereNotNull('weight')->isNotEmpty();

        if ($hasWeights) {
            $totalWeight   = 0;
            $weightedScore = 0;

            foreach ($grades as $grade) {
                $item     = $grade->gradeItem;
                $weight   = $item->weight ?? 0;
                $pct      = $item->max_score > 0 ? ($grade->score / $item->max_score) * 100 : 0;
                $weightedScore += $pct * $weight;
                $totalWeight   += $weight;
            }

            $percentage = $totalWeight > 0 ? round($weightedScore / $totalWeight, 2) : 0.0;
        } else {
            // Simple average of score percentages
            $percentage = round(
                $grades->avg(fn($g) =>
                    $g->gradeItem->max_score > 0
                        ? ($g->score / $g->gradeItem->max_score) * 100
                        : 0
                ),
                2
            );
        }

        return [
            'percentage'   => $percentage,
            'letter'       => $this->percentageToLetter($percentage),
            'items_graded' => $grades->count(),
        ];
    }

    // ─── Public helpers ───────────────────────────────────────────────────────

    public function percentageToLetter(float $pct): string
    {
        return match(true) {
            $pct >= 93 => 'A',
            $pct >= 90 => 'A-',
            $pct >= 87 => 'B+',
            $pct >= 83 => 'B',
            $pct >= 80 => 'B-',
            $pct >= 77 => 'C+',
            $pct >= 73 => 'C',
            $pct >= 70 => 'C-',
            $pct >= 67 => 'D+',
            $pct >= 63 => 'D',
            $pct >= 60 => 'D-',
            default    => 'F',
        };
    }
}
