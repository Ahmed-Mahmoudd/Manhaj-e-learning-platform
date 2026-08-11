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
            ->where('instructor_id', $instructor->id)
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
        $instructor = $request->user();

        // Verify the instructor owns this section (or is a TA)
        $owns = $section->instructor_id === $instructor->id
             || $section->teachingAssistants()->where('user_id', $instructor->id)->exists();

        if (! $owns) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

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
}
