<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Course::with('department');
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->integer('department_id'));
        }
        return response()->json(['courses' => $query->withCount('sections')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'department_id'   => ['required', 'integer', 'exists:departments,id'],
            'code'            => ['required', 'string', 'max:20'],
            'title_en'        => ['required', 'string', 'max:255'],
            'title_ar'        => ['nullable', 'string', 'max:255'],
            'credit_hours'    => ['required', 'integer', 'min:1', 'max:12'],
            'description'     => ['nullable', 'string'],
            'prerequisites'   => ['nullable', 'array'],
            'prerequisites.*' => ['integer', 'exists:courses,id'],
        ]);

        $prereqs = $validated['prerequisites'] ?? [];
        unset($validated['prerequisites']);

        $course = Course::create(['tenant_id' => TenantContext::require()->id, ...$validated]);

        if ($prereqs) {
            $course->prerequisites()->sync($prereqs);
        }

        return response()->json(['course' => $course->load(['department', 'prerequisites'])], 201);
    }

    public function show(Course $course): JsonResponse
    {
        return response()->json(['course' => $course->load(['department', 'prerequisites', 'sections.term'])]);
    }

    public function update(Request $request, Course $course): JsonResponse
    {
        $validated = $request->validate([
            'title_en'        => ['sometimes', 'string', 'max:255'],
            'title_ar'        => ['nullable', 'string', 'max:255'],
            'credit_hours'    => ['sometimes', 'integer', 'min:1', 'max:12'],
            'description'     => ['nullable', 'string'],
            'prerequisites'   => ['nullable', 'array'],
            'prerequisites.*' => ['integer', 'exists:courses,id'],
        ]);

        if (array_key_exists('prerequisites', $validated)) {
            $course->prerequisites()->sync($validated['prerequisites'] ?? []);
            unset($validated['prerequisites']);
        }

        $course->update($validated);
        return response()->json(['course' => $course->fresh(['department', 'prerequisites'])]);
    }

    public function destroy(Course $course): JsonResponse
    {
        if ($course->sections()->exists()) {
            return response()->json(['message' => 'Cannot delete course with existing sections.'], 422);
        }
        $course->prerequisites()->detach();
        $course->delete();
        return response()->json(['message' => 'Course deleted.']);
    }
}
