<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Validates the X-Internal-Token header for machine-to-machine endpoints.
 * The token is configured via INTERNAL_API_TOKEN in .env.
 */
class ValidateInternalToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('app.internal_api_token');

        if (! $expected || $request->header('X-Internal-Token') !== $expected) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        return $next($request);
    }
}
