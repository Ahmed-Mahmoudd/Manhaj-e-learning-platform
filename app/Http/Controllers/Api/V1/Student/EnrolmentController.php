<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Enrolment;
use App\Models\Section;
use App\Services\EnrolmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * EnrolmentController — student self-service enrolment.
 *
 * Middleware: auth:sanctum + require.tenant + role:student
 *
 * Wraps the existing EnrolmentService (built in Phase 1) with HTTP concerns:
 *   - Input validation
 *   - Authorization (can this student touch this enrolment?)
 *   - HTTP status codes and JSON shape
 */
class EnrolmentController extends Controller
{
    public function __construct(private readonly EnrolmentService $service) {}

    /**
     * GET /api/v1/student/sections/{section}/eligibility
     *
     * Check if the student can enrol in this section before actually doing it.
     * Useful for frontend to show "Enrol" vs "Join Waitlist" vs disabled state.
     */
    public function eligibility(Request $request, Section $section): JsonResponse
    {
        $section->load('course.prerequisites');

        $result = $this->service->checkEligibility($request->user(), $section);

        return response()->json(array_merge($result, [
            'section' => [
                'id'              => $section->id,
                'section_number'  => $section->section_number,
                'capacity'        => $section->capacity,
                'enrolled_count'  => $section->enrolledCount(),
                'seats_remaining' => max(0, $section->capacity - $section->enrolledCount()),
            ],
        ]));
    }

    /**
     * POST /api/v1/student/sections/{section}/enrol
     *
     * Self-enrol in a section. Returns status=enrolled or status=waitlisted.
     */
    public function enrol(Request $request, Section $section): JsonResponse
    {
        $section->load('course.prerequisites');

        try {
            $enrolment = $this->service->enrol($request->user(), $section);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $status  = $enrolment->status;
        $message = match ($status) {
            'enrolled'   => 'Successfully enrolled in the section.',
            'waitlisted' => "Section is full. You have been added to the waitlist at position {$enrolment->waitlist_position}.",
            default      => 'Enrolment recorded.',
        };

        return response()->json([
            'message'    => $message,
            'enrolment'  => [
                'id'               => $enrolment->id,
                'status'           => $enrolment->status,
                'waitlist_position'=> $enrolment->waitlist_position,
                'enrolled_at'      => $enrolment->enrolled_at,
                'section_id'       => $section->id,
                'course_code'      => $section->course->code,
            ],
        ], 201);
    }

    /**
     * POST /api/v1/student/enrolments/{enrolment}/drop
     *
     * Drop from an enrolled or waitlisted section.
     * If dropping from enrolled, automatically promotes the first waitlisted student.
     */
    public function drop(Request $request, Enrolment $enrolment): JsonResponse
    {
        // Students can only drop their own enrolments
        if ($enrolment->student_id !== $request->user()->id) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        if (! in_array($enrolment->status, ['enrolled', 'waitlisted'])) {
            return response()->json([
                'message' => "Cannot drop an enrolment with status '{$enrolment->status}'.",
            ], 422);
        }

        $wasEnrolled = $enrolment->status === 'enrolled';

        $this->service->drop($enrolment);

        $message = $wasEnrolled
            ? 'Successfully dropped from the section.'
            : 'Removed from the waitlist.';

        return response()->json(['message' => $message]);
    }

    /**
     * GET /api/v1/student/enrolments
     *
     * List all the authenticated student's enrolments (all statuses).
     */
    public function index(Request $request): JsonResponse
    {
        $enrolments = Enrolment::withoutGlobalScope('tenant')
            ->where('student_id', $request->user()->id)
            ->with(['section.course', 'section.term'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'enrolments' => $enrolments->map(fn(Enrolment $e) => [
                'id'               => $e->id,
                'status'           => $e->status,
                'waitlist_position'=> $e->waitlist_position,
                'enrolled_at'      => $e->enrolled_at,
                'dropped_at'       => $e->dropped_at,
                'section' => [
                    'id'             => $e->section->id,
                    'section_number' => $e->section->section_number,
                    'course_code'    => $e->section->course->code,
                    'course_title'   => $e->section->course->title_en,
                    'term'           => $e->section->term->name,
                ],
            ]),
        ]);
    }
}
