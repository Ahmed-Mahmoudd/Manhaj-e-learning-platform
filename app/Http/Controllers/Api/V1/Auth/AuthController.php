<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * AuthController — handles token-based authentication.
 *
 * Uses Laravel Sanctum (stateless, token-based). No sessions.
 * Each login issues a new token. Logout deletes the current token.
 */
class AuthController extends Controller
{
    /**
     * POST /api/v1/auth/login
     *
     * Returns a Sanctum token on valid credentials.
     * 422 on validation failure; 401 on wrong credentials.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Login must not be scoped by X-Tenant-ID — users are looked up globally by email.
        $user = User::withoutGlobalScope('tenant')
            ->where('email', $credentials['email'])
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ])->status(401);
        }

        /** @var \App\Models\User $user */

        // Revoke any existing tokens to prevent accumulation (optional strategy)
        // Uncomment if you prefer single-session-per-user:
        // $user->tokens()->delete();

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token'      => $token,
            'token_type' => 'Bearer',
            'user'       => $this->userResource($user),
        ]);
    }

    /**
     * GET /api/v1/auth/me
     *
     * Returns the authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userResource($request->user()),
        ]);
    }

    /**
     * POST /api/v1/auth/logout
     *
     * Revokes the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function userResource(\App\Models\User $user): array
    {
        return [
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role->value,
            'tenant_id' => $user->tenant_id,
        ];
    }
}
