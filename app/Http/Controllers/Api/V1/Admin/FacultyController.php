<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacultyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['faculties' => Faculty::withCount('departments')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name_en' => ['required', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'code'    => ['required', 'string', 'max:20'],
        ]);

        $faculty = Faculty::create(['tenant_id' => TenantContext::require()->id, ...$validated]);

        return response()->json(['faculty' => $faculty], 201);
    }

    public function show(Faculty $faculty): JsonResponse
    {
        return response()->json(['faculty' => $faculty->load('departments')]);
    }

    public function update(Request $request, Faculty $faculty): JsonResponse
    {
        $faculty->update($request->validate([
            'name_en' => ['sometimes', 'string', 'max:255'],
            'name_ar' => ['nullable', 'string', 'max:255'],
            'code'    => ['sometimes', 'string', 'max:20'],
        ]));

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
