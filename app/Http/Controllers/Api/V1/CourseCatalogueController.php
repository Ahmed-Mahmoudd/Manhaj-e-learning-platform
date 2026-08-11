<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Course;
use App\Models\Section;
use App\Tenancy\TenantContext;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseCatalogueController extends Controller
{
    /**
     * GET /api/v1/catalogue/courses
     * Browsable course catalogue for the current tenant.
     * Filterable by: department_id, term_id, credit_hours, search (code/title).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Course::with(['department.faculty'])
            ->withCount(['sections' => fn($q) => $q->where('is_active', true)]);

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->integer('department_id'));
        }

        if ($request->filled('faculty_id')) {
            $query->whereHas('department', fn($q) =>
                $q->where('faculty_id', $request->integer('faculty_id')));
        }

        if ($request->filled('credit_hours')) {
            $query->where('credit_hours', $request->integer('credit_hours'));
        }

        if ($request->filled('term_id')) {
            $query->whereHas('sections', fn($q) =>
                $q->where('academic_term_id', $request->integer('term_id'))
                  ->where('is_active', true));
        }

        if ($request->filled('search')) {
            $term = $request->string('search');
            $query->where(fn($q) =>
                $q->where('code', 'like', "%{$term}%")
                  ->orWhere('title_en', 'like', "%{$term}%")
                  ->orWhere('title_ar', 'like', "%{$term}%"));
        }

        $courses = $query->orderBy('code')->paginate(20);

        return response()->json([
            'data' => $courses->map(fn($c) => $this->fmtCourse($c)),
            'meta' => [
                'total'        => $courses->total(),
                'current_page' => $courses->currentPage(),
                'last_page'    => $courses->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/v1/catalogue/courses/{course}
     * Course detail with active sections, prerequisites, and offering terms.
     */
    public function show(Request $request, Course $course): JsonResponse
    {
        $course->load([
            'department.faculty',
            'prerequisites',
            'sections' => fn($q) => $q->where('is_active', true)
                                      ->with(['term', 'instructor']),
        ]);

        return response()->json([
            'course' => $this->fmtCourse($course, detailed: true),
        ]);
    }

    /**
     * GET /api/v1/catalogue/sections/{section}/availability
     * Seat counts and waitlist depth for a specific section.
     */
    public function sectionAvailability(Section $section): JsonResponse
    {
        $enrolled  = $section->enrolments()->where('status', 'enrolled')->count();
        $waitlisted= $section->enrolments()->where('status', 'waitlisted')->count();
        $available = max(0, $section->capacity - $enrolled);

        return response()->json([
            'section_id'      => $section->id,
            'section_number'  => $section->section_number,
            'capacity'        => $section->capacity,
            'enrolled'        => $enrolled,
            'waitlisted'      => $waitlisted,
            'available_seats' => $available,
            'is_full'         => $available === 0,
        ]);
    }

    // ─── Formatters ───────────────────────────────────────────────────────────

    private function fmtCourse(Course $c, bool $detailed = false): array
    {
        $base = [
            'id'             => $c->id,
            'code'           => $c->code,
            'title_en'       => $c->title_en,
            'title_ar'       => $c->title_ar,
            'credit_hours'   => $c->credit_hours,
            'description'    => $c->description,
            'active_sections'=> $c->sections_count ?? null,
            'department'     => $c->relationLoaded('department') ? [
                'id'      => $c->department->id,
                'name_en' => $c->department->name_en,
                'faculty' => $c->department->relationLoaded('faculty') ? [
                    'id'      => $c->department->faculty->id,
                    'name_en' => $c->department->faculty->name_en,
                ] : null,
            ] : null,
        ];

        if ($detailed) {
            $base['prerequisites'] = $c->relationLoaded('prerequisites')
                ? $c->prerequisites->map(fn($p) => [
                    'id' => $p->id, 'code' => $p->code, 'title_en' => $p->title_en,
                ])->values()
                : [];

            $base['sections'] = $c->relationLoaded('sections')
                ? $c->sections->map(fn($s) => [
                    'id'             => $s->id,
                    'section_number' => $s->section_number,
                    'capacity'       => $s->capacity,
                    'enrolled'       => $s->enrolments()->where('status', 'enrolled')->count(),
                    'term'      => $s->relationLoaded('term')
                        ? ['id' => $s->term->id, 'name' => $s->term->name] : null,
                    'instructor'=> $s->relationLoaded('instructor')
                        ? ['id' => $s->instructor->id, 'name' => $s->instructor->name] : null,
                ])->values()
                : [];
        }

        return $base;
    }
}
