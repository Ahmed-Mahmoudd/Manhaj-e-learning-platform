<?php

namespace App\Http\Middleware;

use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * RequireTenant — gate middleware for routes that MUST run inside a tenant context.
 *
 * Apply after ResolveTenant. Returns 400 if no tenant was resolved.
 * This prevents accidental cross-tenant data leaks on routes that
 * should always be scoped.
 */
class RequireTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! TenantContext::isSet()) {
            return response()->json([
                'message' => 'X-Tenant-ID header is required for this endpoint.',
            ], 400);
        }

        return $next($request);
    }
}
