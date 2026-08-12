<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Faculty\StoreFacultyRequest;
use App\Http\Requests\Faculty\UpdateFacultyRequest;
use App\Models\Faculty;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;

class FacultyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['faculties' => Faculty::withCount('departments')->get()]);
    }

    public function store(StoreFacultyRequest $request): JsonResponse
    {
        $faculty = Faculty::create(['tenant_id' => TenantContext::require()->id, ...$request->validated()]);

        return response()->json(['faculty' => $faculty], 201);
    }

    public function show(Faculty $faculty): JsonResponse
    {
        return response()->json(['faculty' => $faculty->load('departments')]);
    }

    public function update(UpdateFacultyRequest $request, Faculty $faculty): JsonResponse
    {
        $faculty->update($request->validated());

        return response()->json(['faculty' => $faculty->fresh()]);
    }

    public function destroy(Faculty $faculty): JsonResponse
    {
        if ($faculty->departments()->exists()) {
            return response()->json(['message' => 'Cannot delete faculty with existing departments.'], 422);
        }

        $faculty->delete();
        return response()->json(['message' => 'Faculty deleted.']);
    }
}
