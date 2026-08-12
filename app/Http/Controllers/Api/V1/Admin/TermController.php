<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Term\StoreTermRequest;
use App\Http\Requests\Term\UpdateTermRequest;
use App\Models\AcademicTerm;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;

class TermController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['terms' => AcademicTerm::orderByDesc('start_date')->get()]);
    }

    public function store(StoreTermRequest $request): JsonResponse
    {
        $term = AcademicTerm::create([
            'tenant_id' => TenantContext::require()->id,
            'is_active' => false,
            ...$request->validated(),
        ]);

        return response()->json(['term' => $term], 201);
    }

    public function show(AcademicTerm $term): JsonResponse
    {
        return response()->json(['term' => $term->loadCount('sections')]);
    }

    public function update(UpdateTermRequest $request, AcademicTerm $term): JsonResponse
    {
        $term->update($request->validated());
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
