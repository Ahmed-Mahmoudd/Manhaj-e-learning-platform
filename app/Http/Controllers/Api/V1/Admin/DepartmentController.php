<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Admin\Concerns\ScopesFacultyAdmin;
use App\Http\Controllers\Controller;
use App\Http\Requests\Department\StoreDepartmentRequest;
use App\Http\Requests\Department\UpdateDepartmentRequest;
use App\Models\Department;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    use ScopesFacultyAdmin;

    public function index(Request $request): JsonResponse
    {
        $query = $this->departmentsQuery($request->user());

        if ($request->filled('faculty_id') && $request->user()->isUniversityAdmin()) {
            $query->where('faculty_id', $request->integer('faculty_id'));
        }

        return response()->json(['departments' => $query->get()]);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        if ($user->isFacultyAdmin()) {
            $data['faculty_id'] = $this->requireFacultyId($user);
        }

        $data['name_ar'] = $data['name_ar'] ?? $data['name_en'];
        $dept = Department::create(['tenant_id' => TenantContext::require()->id, ...$data]);

        return response()->json(['department' => $dept->load('faculty')], 201);
    }

    public function show(Request $request, Department $department): JsonResponse
    {
        $this->assertDepartmentInFaculty($department, $request->user());

        return response()->json(['department' => $department->load(['faculty', 'courses'])]);
    }

    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $this->assertDepartmentInFaculty($department, $request->user());

        $data = $request->validated();
        if (array_key_exists('name_en', $data) && ! array_key_exists('name_ar', $data)) {
            $data['name_ar'] = $department->name_ar ?: $data['name_en'];
        }
        $department->update($data);

        return response()->json(['department' => $department->fresh()]);
    }

    public function destroy(Request $request, Department $department): JsonResponse
    {
        $this->assertDepartmentInFaculty($department, $request->user());

        if ($department->courses()->exists()) {
            return response()->json(['message' => 'Cannot delete department with existing courses.'], 422);
        }
        $department->delete();

        return response()->json(['message' => 'Department deleted.']);
    }
}
