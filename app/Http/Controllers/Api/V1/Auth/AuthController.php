<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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

    /**
     * POST /api/v1/auth/forgot-password
     *
     * Sends a password reset email when the account exists.
     * Always returns a generic message to prevent email enumeration.
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $email = strtolower($request->validated('email'));
        $user  = User::withoutGlobalScope('tenant')->where('email', $email)->first();

        if ($user) {
            $token = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                ['token' => Hash::make($token), 'created_at' => now()],
            );

            $user->notify(new ResetPasswordNotification($token));
        }

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    /**
     * POST /api/v1/auth/reset-password
     *
     * Resets the password using the token from the reset email.
     */
    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $email     = strtolower($validated['email']);

        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        if (! $record || ! Hash::check($validated['token'], $record->token)) {
            throw ValidationException::withMessages([
                'email' => ['This password reset token is invalid.'],
            ]);
        }

        $expiresMinutes = (int) config('auth.passwords.users.expire', 60);
        if (now()->subMinutes($expiresMinutes)->gt($record->created_at)) {
            throw ValidationException::withMessages([
                'email' => ['This password reset token has expired.'],
            ]);
        }

        $user = User::withoutGlobalScope('tenant')->where('email', $email)->first();
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['We cannot find a user with that email address.'],
            ]);
        }

        $user->forceFill(['password' => $validated['password']])->save();
        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json(['message' => 'Your password has been reset.']);
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
            'faculty_id' => $user->faculty_id,
        ];
    }
}
