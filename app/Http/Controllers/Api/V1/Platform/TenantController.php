<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\StoreTenantRequest;
use App\Http\Requests\Tenant\UpdateTenantRequest;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Tenant::withCount('users');

        if ($request->filled('search')) {
            $q = $request->string('search');
            $query->where(fn($q2) => $q2->where('name', 'like', "%{$q}%")
                                        ->orWhere('subdomain', 'like', "%{$q}%"));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $tenants = $query->orderBy('name')->paginate(20);

        return response()->json([
            'data' => $tenants->map(fn($t) => $this->fmt($t)),
            'meta' => [
                'total'        => $tenants->total(),
                'current_page' => $tenants->currentPage(),
                'last_page'    => $tenants->lastPage(),
            ],
        ]);
    }

    public function store(StoreTenantRequest $request): JsonResponse
    {
        $tenant = Tenant::create($request->validated());

        return response()->json(['tenant' => $this->fmt($tenant)], 201);
    }

    public function show(Tenant $tenant): JsonResponse
    {
        return response()->json([
            'tenant' => $this->fmt($tenant->loadCount(['users', 'faculties', 'departments'])),
        ]);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant): JsonResponse
    {
        $tenant->update($request->validated());
        return response()->json(['tenant' => $this->fmt($tenant->fresh())]);
    }

    public function activate(Tenant $tenant): JsonResponse
    {
        $tenant->update(['is_active' => true]);
        return response()->json([
            'message' => "Tenant '{$tenant->name}' activated.",
            'tenant'  => $this->fmt($tenant->fresh()),
        ]);
    }

    public function deactivate(Tenant $tenant): JsonResponse
    {
        $tenant->update(['is_active' => false]);
        return response()->json([
            'message' => "Tenant '{$tenant->name}' deactivated.",
            'tenant'  => $this->fmt($tenant->fresh()),
        ]);
    }

    public function stats(Tenant $tenant): JsonResponse
    {
        return response()->json([
            'tenant_id'   => $tenant->id,
            'name'        => $tenant->name,
            'users'       => $tenant->users()->count(),
            'faculties'   => $tenant->faculties()->count(),
            'departments' => $tenant->departments()->count(),
            'courses'     => $tenant->courses()->count(),
            'sections'    => $tenant->sections()->count(),
            'enrolments'  => $tenant->enrolments()->count(),
        ]);
    }

    private function fmt(Tenant $t): array
    {
        return [
            'id'             => $t->id,
            'name'           => $t->name,
            'subdomain'      => $t->subdomain,
            'locale'         => $t->locale,
            'timezone'       => $t->timezone,
            'grading_system' => $t->grading_system,
            'is_active'      => $t->is_active,
            'settings'       => $t->settings,
            'users_count'    => $t->users_count ?? null,
            'created_at'     => $t->created_at,
        ];
    }
}
