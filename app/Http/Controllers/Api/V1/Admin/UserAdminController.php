<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRoleRequest;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserAdminController extends Controller
{
    const MANAGEABLE_ROLES = [
        'university_admin', 'instructor', 'teaching_assistant', 'student',
    ];

    public function index(Request $request): JsonResponse
    {
        $query = User::query();
        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }
        $users = $query->orderBy('name')->paginate(50);

        return response()->json([
            'data' => $users->map(fn($u) => $this->fmt($u)),
            'meta' => [
                'total'        => $users->total(),
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['user' => $this->fmt($user)]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'tenant_id' => TenantContext::require()->id,
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'role'      => $validated['role'],
            'password'  => Hash::make($validated['password']),
        ]);

        return response()->json(['user' => $this->fmt($user)], 201);
    }

    public function updateRole(UpdateUserRoleRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        $currentRole = $user->role instanceof Role ? $user->role->value : $user->role;
        if ($currentRole === 'platform_admin') {
            return response()->json(['message' => 'Cannot modify platform admin accounts.'], 403);
        }

        $user->update(['role' => $validated['role']]);

        return response()->json(['message' => "Role updated to {$validated['role']}.", 'user' => $this->fmt($user->fresh())]);
    }

    private function fmt(User $u): array
    {
        $role = $u->role instanceof Role ? $u->role->value : $u->role;
        return [
            'id'         => $u->id,
            'name'       => $u->name,
            'email'      => $u->email,
            'role'       => $role,
            'tenant_id'  => $u->tenant_id,
            'created_at' => $u->created_at,
        ];
    }
}
