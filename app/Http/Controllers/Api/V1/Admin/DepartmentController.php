<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Department::with('faculty');
        if ($request->filled('faculty_id')) {
            $query->where('faculty_id', $request->integer('faculty_id'));
        }
        return response()->json(['departments' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'faculty_id' => ['required', 'integer', 'exists:faculties,id'],
            'name_en'    => ['required', 'string', 'max:255'],
            'name_ar'    => ['nullable', 'string', 'max:255'],
            'code'       => ['required', 'string', 'max:20'],
        ]);

        $dept = Department::create(['tenant_id' => TenantContext::require()->id, ...$validated]);

        return response()->json(['department' => $dept->load('faculty')], 201);
    }

    public function show(Department $department): JsonResponse
    {
        return response()->json(['department' => $department->load(['faculty', 'courses'])]);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $department->update($request->validate([
            'name_en' => ['sometimes', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'code'    => ['sometimes', 'string', 'max:20'],
        ]));
        return response()->json(['department' => $department->fresh()]);
    }

    public function destroy(Department $department): JsonResponse
    {
        if ($department->courses()->exists()) {
            return response()->json(['message' => 'Cannot delete department with existing courses.'], 422);
        }
        $department->delete();
        return response()->json(['message' => 'Department deleted.']);
    }
}
