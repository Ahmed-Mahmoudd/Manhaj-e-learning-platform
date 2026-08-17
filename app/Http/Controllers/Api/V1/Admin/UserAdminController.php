<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\Role;
use App\Http\Controllers\Api\V1\Admin\Concerns\ScopesFacultyAdmin;
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
    use ScopesFacultyAdmin;

    /** Roles a faculty admin may assign within their faculty. */
    const FACULTY_MANAGEABLE_ROLES = [
        'instructor', 'teaching_assistant', 'student',
    ];

    public static function manageableRolesFor(User $admin): array
    {
        return $admin->isFacultyAdmin()
            ? self::FACULTY_MANAGEABLE_ROLES
            : self::FACULTY_MANAGEABLE_ROLES;
    }

    public function index(Request $request): JsonResponse
    {
        $admin = $request->user();
        $query = User::query();

        if ($admin->isFacultyAdmin()) {
            $userIds = $this->facultyUserIds($this->requireFacultyId($admin));
            $query->whereIn('id', $userIds);
        }

        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }

        $users = $query->orderBy('name')->paginate(50);

        return response()->json([
            'data' => $users->map(fn ($u) => $this->fmt($u)),
            'meta' => [
                'total'        => $users->total(),
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->assertUserInFaculty($user, $request->user());

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
        $admin = $request->user();
        $this->assertUserInFaculty($user, $admin);

        $validated = $request->validated();

        $currentRole = $user->role instanceof Role ? $user->role->value : $user->role;
        if (in_array($currentRole, ['platform_admin', 'university_admin', 'faculty_admin'], true)) {
            return response()->json(['message' => 'Cannot modify administrative accounts.'], 403);
        }

        $user->update(['role' => $validated['role']]);

        return response()->json([
            'message' => "Role updated to {$validated['role']}.",
            'user'    => $this->fmt($user->fresh()),
        ]);
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
