<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Enrolment;
use App\Models\Lesson;
use App\Models\Section;
use App\Services\LessonProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * StudentDashboardController — a student's view of their own data.
 *
 * All endpoints require: auth:sanctum + require.tenant
 * All queries are automatically tenant-scoped via BelongsToTenant global scope.
 */
class StudentDashboardController extends Controller
{
    public function __construct(
        private readonly LessonProgressService $progressService
    ) {}

    /**
     * GET /api/v1/student/courses
     *
     * Returns all sections the authenticated student is currently enrolled in,
     * with course info and completion percentage.
     */
    public function myCourses(Request $request): JsonResponse
    {
        $student = $request->user();

        $enrolments = Enrolment::with(['section.course', 'section.term', 'section.instructor'])
            ->where('student_id', $student->id)
            ->whereIn('status', ['enrolled', 'waitlisted'])
            ->get();

        $data = $enrolments->map(function (Enrolment $enrolment) use ($student) {
            $section = $enrolment->section;
            $course  = $section->course;

            return [
                'enrolment_id'     => $enrolment->id,
                'status'           => $enrolment->status,
                'waitlist_position'=> $enrolment->waitlist_position,
                'enrolled_at'      => $enrolment->enrolled_at,
                'section' => [
                    'id'             => $section->id,
                    'section_number' => $section->section_number,
                    'capacity'       => $section->capacity,
                    'enrolled_count' => $section->enrolledCount(),
                    'schedule'       => $section->schedule,
                    'instructor'     => [
                        'id'   => $section->instructor->id,
                        'name' => $section->instructor->name,
                    ],
                    'term' => [
                        'id'   => $section->term->id,
                        'name' => $section->term->name,
                        'type' => $section->term->type,
                    ],
                ],
                'course' => [
                    'id'           => $course->id,
                    'code'         => $course->code,
                    'title_en'     => $course->title_en,
                    'title_ar'     => $course->title_ar,
                    'credit_hours' => $course->credit_hours,
                ],
                'completion_pct' => $this->progressService->courseCompletionPct($student, $course->id),
            ];
        });

        return response()->json(['courses' => $data]);
    }

    /**
     * GET /api/v1/student/sections/{section}/lessons
     *
     * Returns all published modules and lessons for a section the student
     * is enrolled in, with the student's progress on each lesson.
     */
    public function sectionLessons(Request $request, Section $section): JsonResponse
    {
        $student = $request->user();

        // Verify student is enrolled in this section
        $enrolled = Enrolment::where('student_id', $student->id)
            ->where('section_id', $section->id)
            ->where('status', 'enrolled')
            ->exists();

        if (! $enrolled) {
            return response()->json(['message' => 'Not enrolled in this section.'], 403);
        }

        $modules = $section->course->modules()
            ->where('is_published', true)
            ->orderBy('order')
            ->with(['lessons' => fn($q) => $q->where('is_published', true)->orderBy('order')])
            ->get();

        $data = $modules->map(function ($module) use ($student) {
            return [
                'id'          => $module->id,
                'title'       => $module->title,
                'order'       => $module->order,
                'is_available'=> $module->isAvailableTo($student),
                'lessons'     => $module->lessons->map(function (Lesson $lesson) use ($student) {
                    $progress = $lesson->progressFor($student);
                    return [
                        'id'               => $lesson->id,
                        'title'            => $lesson->title,
                        'type'             => $lesson->type,
                        'order'            => $lesson->order,
                        'duration_seconds' => $lesson->duration_seconds,
                        'progress' => $progress ? [
                            'seconds_spent' => $progress->seconds_spent,
                            'progress_pct'  => $progress->progress_pct,
                            'completed_at'  => $progress->completed_at,
                            'last_accessed' => $progress->last_accessed_at,
                        ] : null,
                    ];
                }),
            ];
        });

        return response()->json(['modules' => $data]);
    }

    /**
     * POST /api/v1/student/lessons/{lesson}/progress
     *
     * Update progress for a lesson. Body: { seconds_spent, progress_pct }
     * For text/pdf/link lessons, send progress_pct=100 to mark complete.
     */
    public function updateProgress(Request $request, Lesson $lesson): JsonResponse
    {
        $request->validate([
            'seconds_spent' => ['sometimes', 'integer', 'min:0'],
            'progress_pct'  => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        $student  = $request->user();
        $progress = $this->progressService->updateProgress(
            $student,
            $lesson,
            $request->integer('seconds_spent', 0),
            $request->integer('progress_pct')
        );

        return response()->json([
            'progress' => [
                'lesson_id'     => $lesson->id,
                'seconds_spent' => $progress->seconds_spent,
                'progress_pct'  => $progress->progress_pct,
                'completed_at'  => $progress->completed_at,
            ],
        ]);
    }
}
