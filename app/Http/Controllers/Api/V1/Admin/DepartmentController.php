<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Department\StoreDepartmentRequest;
use App\Http\Requests\Department\UpdateDepartmentRequest;
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

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $dept = Department::create(['tenant_id' => TenantContext::require()->id, ...$request->validated()]);

        return response()->json(['department' => $dept->load('faculty')], 201);
    }

    public function show(Department $department): JsonResponse
    {
        return response()->json(['department' => $department->load(['faculty', 'courses'])]);
    }

    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $department->update($request->validated());
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
