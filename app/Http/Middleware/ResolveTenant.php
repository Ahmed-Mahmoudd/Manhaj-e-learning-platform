<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Tenancy\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * ResolveTenant — reads X-Tenant-ID from the request header and sets TenantContext.
 *
 * WHY header-based (not subdomain-based)?
 *   Mobile apps and SPA clients can set headers trivially.
 *   Subdomain routing can be layered on top later.
 *
 * Behaviour:
 *   - If X-Tenant-ID is present → load tenant → set context → proceed
 *   - If X-Tenant-ID is absent  → skip (TenantContext remains unset; fine for platform admin)
 *   - If X-Tenant-ID is invalid → 404 JSON response
 *   - If tenant is inactive     → 403 JSON response
 */
class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $request->header('X-Tenant-ID');

        if (! $tenantId) {
            return $next($request);
        }

        $tenant = Tenant::find($tenantId);

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant not found.',
            ], 404);
        }

        if (! $tenant->is_active) {
            return response()->json([
                'message' => 'This institution account is suspended.',
            ], 403);
        }

        TenantContext::set($tenant);

        $response = $next($request);

        // Always clear context after response so it doesn't bleed into the next request
        TenantContext::clear();

        return $response;
    }
}
