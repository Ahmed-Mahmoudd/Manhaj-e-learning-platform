<?php

namespace App\Http\Controllers\Api\V1\Instructor;

use App\Http\Controllers\Controller;
use App\Models\Enrolment;
use App\Models\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * InstructorDashboardController — an instructor's view of their sections.
 *
 * All endpoints require: auth:sanctum + require.tenant + role:instructor,teaching_assistant
 */
class InstructorDashboardController extends Controller
{
    /**
     * GET /api/v1/instructor/sections
     *
     * Returns all sections the authenticated instructor is assigned to,
     * with course info, term, and enrolment stats.
     */
    public function mySections(Request $request): JsonResponse
    {
        $instructor = $request->user();

        $sections = Section::with(['course', 'term'])
            ->where(function ($query) use ($instructor) {
                $query->where('instructor_id', $instructor->id)
                    ->orWhereHas('teachingAssistants', fn($q) => $q->where('user_id', $instructor->id));
            })
            ->where('is_active', true)
            ->get();

        $data = $sections->map(fn(Section $section) => [
            'id'             => $section->id,
            'section_number' => $section->section_number,
            'capacity'       => $section->capacity,
            'enrolled_count' => $section->enrolledCount(),
            'waitlisted_count' => $section->enrolments()
                                          ->where('status', 'waitlisted')->count(),
            'schedule'       => $section->schedule,
            'is_active'      => $section->is_active,
            'course' => [
                'id'           => $section->course->id,
                'code'         => $section->course->code,
                'title_en'     => $section->course->title_en,
                'title_ar'     => $section->course->title_ar,
                'credit_hours' => $section->course->credit_hours,
            ],
            'term' => [
                'id'        => $section->term->id,
                'name'      => $section->term->name,
                'type'      => $section->term->type,
                'is_active' => $section->term->is_active,
                'starts_at' => $section->term->starts_at,
                'ends_at'   => $section->term->ends_at,
            ],
        ]);

        return response()->json(['sections' => $data]);
    }

    /**
     * GET /api/v1/instructor/sections/{section}/enrolments
     *
     * Returns the student roster for a section the instructor owns.
     */
    public function sectionEnrolments(Request $request, Section $section): JsonResponse
    {
        $this->assertSectionStaff($request->user(), $section);

        $enrolments = Enrolment::with('student')
            ->where('section_id', $section->id)
            ->orderBy('status')
            ->orderBy('waitlist_position')
            ->get();

        $data = $enrolments->map(fn(Enrolment $e) => [
            'enrolment_id'      => $e->id,
            'status'            => $e->status,
            'waitlist_position' => $e->waitlist_position,
            'enrolled_at'       => $e->enrolled_at,
            'dropped_at'        => $e->dropped_at,
            'student' => [
                'id'    => $e->student->id,
                'name'  => $e->student->name,
                'email' => $e->student->email,
            ],
        ]);

        return response()->json([
            'section_id'     => $section->id,
            'enrolled_count' => $section->enrolledCount(),
            'enrolments'     => $data,
        ]);
    }

    /**
     * GET /api/v1/instructor/sections/{section}/analytics
     *
     * Returns section analytics (enrolment, grade averages, distribution, lesson completion).
     */
    public function analytics(Request $request, Section $section): JsonResponse
    {
        $user = $request->user();
        $this->assertSectionStaff($user, $section);

        $enrolledStudents = $section->enrolments()
            ->where('status', 'enrolled')
            ->pluck('student_id');

        $enrolledCount = $enrolledStudents->count();

        // Grade items & student grades
        $gradeItems = $section->gradeItems()->where('is_published', true)->get();
        $gradeItemIds = $gradeItems->pluck('id');

        $grades = \App\Models\StudentGrade::query()
            ->whereIn('grade_item_id', $gradeItemIds)
            ->whereIn('student_id', $enrolledStudents)
            ->with('gradeItem')
            ->get();

        $gradePercentages = $grades->map(fn($g) => $g->scorePercentage());
        $avgGrade = $gradePercentages->count() > 0
            ? round($gradePercentages->avg(), 1)
            : null;

        $distribution = [
            'A' => 0,
            'B' => 0,
            'C' => 0,
            'D' => 0,
            'F' => 0,
        ];

        foreach ($grades as $grade) {
            $letter = $grade->letterGrade();
            $baseLetter = substr($letter, 0, 1);
            if (isset($distribution[$baseLetter])) {
                $distribution[$baseLetter]++;
            }
        }

        // Lesson progress
        $progressService = app(\App\Services\LessonProgressService::class);
        $studentCompletionPcts = $enrolledStudents->map(
            fn($studentId) => $progressService->courseCompletionPct(
                \App\Models\User::withoutGlobalScope('tenant')->find($studentId),
                $section->course_id
            )
        );

        $avgCompletion = $studentCompletionPcts->count() > 0
            ? round($studentCompletionPcts->avg(), 1)
            : 0.0;

        return response()->json([
            'section_id'             => $section->id,
            'section_number'         => $section->section_number,
            'enrolled_count'         => $enrolledCount,
            'capacity'               => $section->capacity,
            'waitlisted_count'       => $section->enrolments()->where('status', 'waitlisted')->count(),
            'published_grade_items'  => $gradeItems->count(),
            'average_grade_pct'      => $avgGrade,
            'grade_distribution'     => $distribution,
            'average_completion_pct' => $avgCompletion,
        ]);
    }

    /**
     * GET /api/v1/instructor/sections/{section}/progress
     *
     * Returns student progress matrix across all published modules & lessons.
     */
    public function studentProgress(Request $request, Section $section): JsonResponse
    {
        $user = $request->user();
        $this->assertSectionStaff($user, $section);

        $enrolments = Enrolment::with('student')
            ->where('section_id', $section->id)
            ->where('status', 'enrolled')
            ->get();

        $modules = $section->course->modules()
            ->where('is_published', true)
            ->orderBy('order')
            ->with(['lessons' => fn($q) => $q->where('is_published', true)->orderBy('order')])
            ->get();

        $allLessonIds = $modules->flatMap->lessons->pluck('id');

        $allProgress = \App\Models\LessonProgress::withoutGlobalScope('tenant')
            ->whereIn('user_id', $enrolments->pluck('student_id'))
            ->whereIn('lesson_id', $allLessonIds)
            ->get()
            ->groupBy('user_id');

        $progressService = app(\App\Services\LessonProgressService::class);

        $studentMatrix = $enrolments->map(function (Enrolment $enrolment) use ($section, $allProgress, $progressService) {
            $student = $enrolment->student;
            $userProgRecords = $allProgress->get($student->id, collect());
            $progByLesson = $userProgRecords->keyBy('lesson_id');

            return [
                'student_id'     => $student->id,
                'name'           => $student->name,
                'email'          => $student->email,
                'overall_pct'    => $progressService->courseCompletionPct($student, $section->course_id),
                'lesson_progress'=> $progByLesson->map(fn($p) => [
                    'progress_pct'  => $p->progress_pct,
                    'completed_at'  => $p->completed_at,
                    'seconds_spent' => $p->seconds_spent,
                ]),
            ];
        });

        return response()->json([
            'section_id' => $section->id,
            'modules'    => $modules->map(fn($m) => [
                'id'      => $m->id,
                'title'   => $m->title,
                'lessons' => $m->lessons->map(fn($l) => [
                    'id'    => $l->id,
                    'title' => $l->title,
                    'type'  => $l->type,
                ]),
            ]),
            'students'   => $studentMatrix,
        ]);
    }

    private function assertSectionStaff(\App\Models\User $user, Section $section): void
    {
        if ($user->isPlatformAdmin()) {
            return;
        }

        $owns = $section->instructor_id === $user->id
             || $section->teachingAssistants()->where('user_id', $user->id)->exists();

        if (! $owns) {
            abort(403, 'Access denied.');
        }
    }
}

