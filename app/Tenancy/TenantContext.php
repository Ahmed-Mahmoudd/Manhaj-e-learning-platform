<?php

namespace App\Tenancy;

use App\Models\Tenant;
use RuntimeException;

/**
 * TenantContext — the single source of truth for "which tenant owns this request".
 *
 * Usage:
 *   TenantContext::set($tenant);   // called by middleware after resolving the tenant
 *   TenantContext::current();      // returns the active Tenant (or null)
 *   TenantContext::require();      // returns Tenant or throws if not set
 *   TenantContext::clear();        // used in tests / after request
 */
class TenantContext
{
    private static ?Tenant $current = null;

    public static function set(Tenant $tenant): void
    {
        self::$current = $tenant;
    }

    public static function current(): ?Tenant
    {
        return self::$current;
    }

    /**
     * Returns the current tenant, or throws if none is set.
     * Use this inside any code that MUST have a tenant.
     */
    public static function require(): Tenant
    {
        if (self::$current === null) {
            throw new RuntimeException('No tenant is set in TenantContext.');
        }

        return self::$current;
    }

    public static function clear(): void
    {
        self::$current = null;
    }

    public static function isSet(): bool
    {
        return self::$current !== null;
    }
}
