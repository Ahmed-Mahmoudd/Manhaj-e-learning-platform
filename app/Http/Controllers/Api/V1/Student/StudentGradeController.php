<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Enrolment;
use App\Models\StudentGrade;
use App\Services\GradeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * StudentGradeController — a student's view of their own grades.
 *
 * Students only see grades that have been published (is_published = true).
 * Middleware: auth:sanctum + require.tenant + role:student
 */
class StudentGradeController extends Controller
{
    public function __construct(private readonly GradeService $gradeService) {}

    /**
     * GET /api/v1/student/grades
     *
     * Returns all published grades across all the student's enrolled sections,
     * grouped by section, with an overall section grade summary.
     */
    public function myGrades(Request $request): JsonResponse
    {
        $student = $request->user();

        $enrolments = Enrolment::with(['section.course', 'section.term'])
            ->where('student_id', $student->id)
            ->where('status', 'enrolled')
            ->get();

        $data = $enrolments->map(function (Enrolment $enrolment) use ($student) {
            $section = $enrolment->section;

            // Published grade items for this section
            $items = $section->gradeItems()->where('is_published', true)->get();

            // Published grades for this student on those items
            $grades = StudentGrade::withoutGlobalScope('tenant')
                ->where('student_id', $student->id)
                ->where('is_published', true)
                ->whereIn('grade_item_id', $items->pluck('id'))
                ->with('gradeItem')
                ->get();

            $summary = $this->gradeService->sectionGradeSummary($student, $section);

            return [
                'section' => [
                    'id'           => $section->id,
                    'section_number'=> $section->section_number,
                    'course'       => [
                        'code'     => $section->course->code,
                        'title_en' => $section->course->title_en,
                    ],
                    'term' => [
                        'name' => $section->term->name,
                    ],
                ],
                'overall' => $summary,
                'items'   => $grades->map(fn($g) => [
                    'grade_item' => [
                        'id'        => $g->gradeItem->id,
                        'name'      => $g->gradeItem->name,
                        'type'      => $g->gradeItem->type,
                        'max_score' => $g->gradeItem->max_score,
                        'weight'    => $g->gradeItem->weight,
                    ],
                    'score'     => $g->score,
                    'score_pct' => $g->scorePercentage(),
                    'letter'    => $g->letterGrade(),
                    'feedback'  => $g->feedback,
                    'graded_at' => $g->graded_at,
                ]),
            ];
        });

        return response()->json(['grades' => $data]);
    }
}
