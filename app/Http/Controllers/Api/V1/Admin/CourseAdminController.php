<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Admin\Concerns\ScopesFacultyAdmin;
use App\Http\Controllers\Controller;
use App\Http\Requests\Course\StoreCourseRequest;
use App\Http\Requests\Course\UpdateCourseRequest;
use App\Models\Course;
use App\Models\Department;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseAdminController extends Controller
{
    use ScopesFacultyAdmin;

    public function index(Request $request): JsonResponse
    {
        $query = $this->coursesQuery($request->user());

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->integer('department_id'));
        }

        return response()->json(['courses' => $query->withCount('sections')->get()]);
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $department = Department::findOrFail($validated['department_id']);
        $this->assertDepartmentInFaculty($department, $request->user());

        $prereqs = $validated['prerequisites'] ?? [];
        unset($validated['prerequisites']);

        $course = Course::create(['tenant_id' => TenantContext::require()->id, ...$validated]);

        if ($prereqs) {
            $course->prerequisites()->sync($prereqs);
        }

        return response()->json(['course' => $course->load(['department', 'prerequisites'])], 201);
    }

    public function show(Request $request, Course $course): JsonResponse
    {
        $this->assertCourseInFaculty($course, $request->user());

        return response()->json(['course' => $course->load(['department', 'prerequisites', 'sections.term'])]);
    }

    public function update(UpdateCourseRequest $request, Course $course): JsonResponse
    {
        $this->assertCourseInFaculty($course, $request->user());

        $validated = $request->validated();

        if (array_key_exists('prerequisites', $validated)) {
            $course->prerequisites()->sync($validated['prerequisites'] ?? []);
            unset($validated['prerequisites']);
        }

        $course->update($validated);

        return response()->json(['course' => $course->fresh(['department', 'prerequisites'])]);
    }

    public function destroy(Request $request, Course $course): JsonResponse
    {
        $this->assertCourseInFaculty($course, $request->user());

        if ($course->sections()->exists()) {
            return response()->json(['message' => 'Cannot delete course with existing sections.'], 422);
        }
        $course->prerequisites()->detach();
        $course->delete();

        return response()->json(['message' => 'Course deleted.']);
    }
}
