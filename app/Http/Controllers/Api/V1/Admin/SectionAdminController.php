<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Section\StoreSectionRequest;
use App\Http\Requests\Section\UpdateSectionRequest;
use App\Models\Section;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SectionAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Section::with(['course', 'term', 'instructor']);
        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }
        if ($request->filled('term_id')) {
            $query->where('academic_term_id', $request->integer('term_id'));
        }
        return response()->json(['sections' => $query->get()->map(fn($s) => $this->fmt($s))]);
    }

    public function store(StoreSectionRequest $request): JsonResponse
    {
        $section = Section::create(['tenant_id' => TenantContext::require()->id, ...$request->validated()]);

        return response()->json(['section' => $this->fmt($section->load(['course', 'term', 'instructor']))], 201);
    }

    public function show(Section $section): JsonResponse
    {
        return response()->json([
            'section'        => $this->fmt($section->load(['course', 'term', 'instructor'])),
            'enrolled_count' => $section->enrolledCount(),
        ]);
    }

    public function update(UpdateSectionRequest $request, Section $section): JsonResponse
    {
        $section->update($request->validated());
        return response()->json(['section' => $this->fmt($section->fresh(['course', 'term', 'instructor']))]);
    }

    public function destroy(Section $section): JsonResponse
    {
        if ($section->enrolments()->whereIn('status', ['enrolled', 'waitlisted'])->exists()) {
            return response()->json(['message' => 'Cannot delete section with active enrolments.'], 422);
        }
        $section->delete();
        return response()->json(['message' => 'Section deleted.']);
    }

    private function fmt(Section $s): array
    {
        return [
            'id'             => $s->id,
            'section_number' => $s->section_number,
            'capacity'       => $s->capacity,
            'is_active'      => $s->is_active,
            'course'  => $s->relationLoaded('course')
                ? ['id' => $s->course->id, 'code' => $s->course->code] : null,
            'term'  => $s->relationLoaded('term')
                ? ['id' => $s->term->id, 'name' => $s->term->name] : null,
            'instructor' => $s->relationLoaded('instructor')
                ? ['id' => $s->instructor->id, 'name' => $s->instructor->name] : null,
        ];
    }
}
