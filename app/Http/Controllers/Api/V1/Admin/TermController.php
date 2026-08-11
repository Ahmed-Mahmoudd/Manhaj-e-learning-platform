<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TermController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['terms' => AcademicTerm::orderByDesc('start_date')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'type'       => ['required', 'string', 'in:semester,quarter,trimester,summer'],
            'starts_at' => ['required', 'date'],
            'ends_at'   => ['required', 'date', 'after:starts_at'],
        ]);

        $term = AcademicTerm::create([
            'tenant_id' => TenantContext::require()->id,
            'is_active' => false,
            ...$validated,
        ]);

        return response()->json(['term' => $term], 201);
    }

    public function show(AcademicTerm $term): JsonResponse
    {
        return response()->json(['term' => $term->loadCount('sections')]);
    }

    public function update(Request $request, AcademicTerm $term): JsonResponse
    {
        $term->update($request->validate([
            'name'       => ['sometimes', 'string', 'max:100'],
            'type'       => ['sometimes', 'string', 'in:semester,quarter,trimester,summer'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at'   => ['sometimes', 'date', 'after:starts_at'],
        ]));
        return response()->json(['term' => $term->fresh()]);
    }

    /** POST /api/v1/admin/terms/{term}/activate — make active, deactivate all others */
    public function activate(AcademicTerm $term): JsonResponse
    {
        AcademicTerm::where('tenant_id', TenantContext::require()->id)
            ->where('id', '!=', $term->id)
            ->update(['is_active' => false]);

        $term->update(['is_active' => true]);

        return response()->json(['message' => "Term '{$term->name}' is now active.", 'term' => $term->fresh()]);
    }

    public function deactivate(AcademicTerm $term): JsonResponse
    {
        $term->update(['is_active' => false]);
        return response()->json(['message' => "Term '{$term->name}' deactivated.", 'term' => $term->fresh()]);
    }
}
