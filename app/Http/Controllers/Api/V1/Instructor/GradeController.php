<?php

namespace App\Http\Controllers\Api\V1\Instructor;

use App\Http\Controllers\Controller;
use App\Models\GradeItem;
use App\Models\Section;
use App\Models\User;
use App\Services\GradeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GradeController (instructor side) — manage grade items and enter/publish grades.
 *
 * Middleware: auth:sanctum + require.tenant + role:instructor,teaching_assistant
 */
class GradeController extends Controller
{
    public function __construct(private readonly GradeService $gradeService) {}

    // ─── Grade Items ──────────────────────────────────────────────────────────

    /**
     * GET /api/v1/instructor/sections/{section}/grade-items
     * List all grade items for a section.
     */
    public function index(Section $section): JsonResponse
    {
        $this->assertOwns($section, request()->user());

        $items = $section->gradeItems()->withCount('studentGrades')->get();

        return response()->json([
            'grade_items' => $items->map(fn(GradeItem $item) => [
                'id'           => $item->id,
                'name'         => $item->name,
                'type'         => $item->type,
                'max_score'    => $item->max_score,
                'weight'       => $item->weight,
                'due_at'       => $item->due_at,
                'order'        => $item->order,
                'is_published' => $item->is_published,
                'grades_count' => $item->student_grades_count,
            ]),
        ]);
    }

    /**
     * POST /api/v1/instructor/sections/{section}/grade-items
     * Create a new grade item for a section.
     */
    public function store(Request $request, Section $section): JsonResponse
    {
        $this->assertOwns($section, $request->user());

        $validated = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'type'      => ['required', 'string', 'in:' . implode(',', GradeItem::TYPES)],
            'max_score' => ['required', 'numeric', 'min:1', 'max:9999'],
            'weight'    => ['nullable', 'numeric', 'min:0', 'max:100'],
            'due_at'    => ['nullable', 'date'],
            'order'     => ['nullable', 'integer', 'min:0'],
        ]);

        $item = GradeItem::create([
            'tenant_id'  => $section->tenant_id,
            'section_id' => $section->id,
            ...$validated,
        ]);

        return response()->json(['grade_item' => $item], 201);
    }

    // ─── Student Grades ───────────────────────────────────────────────────────

    /**
     * POST /api/v1/instructor/grade-items/{item}/grades/{student}
     * Enter or update a grade for a specific student.
     */
    public function enterGrade(Request $request, GradeItem $item, User $student): JsonResponse
    {
        $this->assertOwns($item->section, $request->user());

        $validated = $request->validate([
            'score'    => ['required', 'numeric', 'min:0'],
            'feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $grade = $this->gradeService->enterGrade(
                $item,
                $student,
                (float) $validated['score'],
                $request->user(),
                $validated['feedback'] ?? null
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'grade' => [
                'id'              => $grade->id,
                'student_id'      => $grade->student_id,
                'score'           => $grade->score,
                'max_score'       => $item->max_score,
                'score_pct'       => $grade->scorePercentage(),
                'letter'          => $grade->letterGrade(),
                'feedback'        => $grade->feedback,
                'is_published'    => $grade->is_published,
                'graded_at'       => $grade->graded_at,
            ],
        ]);
    }

    /**
     * POST /api/v1/instructor/grade-items/{item}/publish
     * Publish all grades for this grade item (students can now see them).
     */
    public function publish(Request $request, GradeItem $item): JsonResponse
    {
        $this->assertOwns($item->section, $request->user());

        $count = $this->gradeService->publishGradeItem($item);

        return response()->json([
            'message'       => "Grade item published. {$count} student grade(s) are now visible.",
            'is_published'  => true,
            'grades_updated'=> $count,
        ]);
    }

    // ─── Roster with Grades ───────────────────────────────────────────────────

    /**
     * GET /api/v1/instructor/grade-items/{item}/grades
     * View all grades entered for a grade item (full roster).
     */
    public function grades(Request $request, GradeItem $item): JsonResponse
    {
        $this->assertOwns($item->section, $request->user());

        $grades = $item->studentGrades()->with('student')->get();

        return response()->json([
            'grade_item' => ['id' => $item->id, 'name' => $item->name, 'max_score' => $item->max_score],
            'grades'     => $grades->map(fn($g) => [
                'student'      => ['id' => $g->student->id, 'name' => $g->student->name],
                'score'        => $g->score,
                'score_pct'    => $g->scorePercentage(),
                'letter'       => $g->letterGrade(),
                'feedback'     => $g->feedback,
                'is_published' => $g->is_published,
                'graded_at'    => $g->graded_at,
            ]),
        ]);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function assertOwns(Section $section, User $user): void
    {
        $owns = $section->instructor_id === $user->id
             || $section->teachingAssistants()->where('user_id', $user->id)->exists();

        if (! $owns) {
            abort(403, 'Access denied.');
        }
    }
}
