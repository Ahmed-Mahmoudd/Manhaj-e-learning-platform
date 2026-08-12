<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\PlatformUser\StorePlatformUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PlatformUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('tenant')->whereNull('tenant_id')
            ->orWhere('role', 'platform_admin');

        if ($request->filled('tenant_id')) {
            $query = User::with('tenant')->where('tenant_id', $request->integer('tenant_id'));
        }

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
        return response()->json(['user' => $this->fmt($user->load('tenant'))]);
    }

    public function store(StorePlatformUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'role'      => $validated['role'],
            'tenant_id' => $validated['tenant_id'] ?? null,
            'password'  => Hash::make($validated['password'] ?? str()->random(16)),
        ]);

        return response()->json(['user' => $this->fmt($user->load('tenant'))], 201);
    }

    public function impersonate(User $user): JsonResponse
    {
        // Issue a short-lived token scoped to the target user (no password needed).
        $token = $user->createToken('platform-impersonate', ['*'], now()->addHour())->plainTextToken;

        return response()->json([
            'message'    => "Impersonation token issued for {$user->email}.",
            'token'      => $token,
            'expires_at' => now()->addHour()->toISOString(),
        ]);
    }

    private function fmt(User $u): array
    {
        $role = $u->role instanceof \App\Enums\Role ? $u->role->value : $u->role;
        return [
            'id'        => $u->id,
            'name'      => $u->name,
            'email'     => $u->email,
            'role'      => $role,
            'tenant_id' => $u->tenant_id,
            'tenant'    => $u->relationLoaded('tenant') && $u->tenant
                            ? ['id' => $u->tenant->id, 'name' => $u->tenant->name] : null,
            'created_at' => $u->created_at,
        ];
    }
}
