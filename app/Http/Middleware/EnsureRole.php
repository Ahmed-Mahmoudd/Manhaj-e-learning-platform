<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureRole middleware — protects routes by required role(s).
 *
 * Usage in routes:
 *   Route::middleware('role:instructor,teaching_assistant')->group(...)
 *   Route::middleware('role:platform_admin')->group(...)
 *
 * Multiple roles are OR'd — the user only needs to match ONE.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $allowed = array_map(
            fn(string $r) => Role::from($r),
            $roles
        );

        // Platform admin bypasses everything
        if ($user->isPlatformAdmin()) {
            return $next($request);
        }

        if (! $user->hasAnyRole(...$allowed)) {
            abort(403, 'Insufficient role.');
        }

        return $next($request);
    }
}
