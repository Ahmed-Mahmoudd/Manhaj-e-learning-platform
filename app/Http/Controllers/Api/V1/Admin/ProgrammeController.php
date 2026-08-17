<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Admin\Concerns\ScopesFacultyAdmin;
use App\Http\Controllers\Controller;
use App\Http\Requests\Programme\StoreProgrammeRequest;
use App\Http\Requests\Programme\UpdateProgrammeRequest;
use App\Models\Department;
use App\Models\Programme;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgrammeController extends Controller
{
    use ScopesFacultyAdmin;

    public function index(Request $request): JsonResponse
    {
        $query = $this->programmesQuery($request->user());

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->integer('department_id'));
        }

        return response()->json(['programmes' => $query->get()]);
    }

    public function store(StoreProgrammeRequest $request): JsonResponse
    {
        $data = $request->validated();
        $department = Department::findOrFail($data['department_id']);
        $this->assertDepartmentInFaculty($department, $request->user());

        $data['name_ar'] = $data['name_ar'] ?? $data['name_en'];

        $programme = Programme::create([
            'tenant_id' => TenantContext::require()->id,
            ...$data,
        ]);

        return response()->json(['programme' => $programme->load('department')], 201);
    }

    public function show(Request $request, Programme $programme): JsonResponse
    {
        $this->assertProgrammeInFaculty($programme, $request->user());

        return response()->json(['programme' => $programme->load('department')]);
    }

    public function update(UpdateProgrammeRequest $request, Programme $programme): JsonResponse
    {
        $this->assertProgrammeInFaculty($programme, $request->user());

        $data = $request->validated();
        if (array_key_exists('name_en', $data) && ! array_key_exists('name_ar', $data)) {
            $data['name_ar'] = $programme->name_ar ?: $data['name_en'];
        }

        $programme->update($data);

        return response()->json(['programme' => $programme->fresh('department')]);
    }

    public function destroy(Request $request, Programme $programme): JsonResponse
    {
        $this->assertProgrammeInFaculty($programme, $request->user());
        $programme->delete();

        return response()->json(['message' => 'Programme deleted.']);
    }
}
