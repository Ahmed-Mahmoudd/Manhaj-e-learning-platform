<?php

namespace App\Tenancy;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;

/**
 * BelongsToTenant — reusable trait for all tenant-scoped Eloquent models.
 *
 * Add this trait to any model that must be isolated per tenant (Course, Section,
 * Enrolment, etc.).
 *
 * What it does:
 *  1. Adds a global scope so every query is automatically filtered by the
 *     current tenant when TenantContext is set.
 *  2. Automatically fills `tenant_id` on model creation.
 *  3. Provides a `forTenant()` scope for explicit cross-tenant admin queries.
 *
 * The model using this trait MUST have a `tenant_id` column.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        // Auto-fill tenant_id when creating a new record
        static::creating(function ($model) {
            if (empty($model->tenant_id) && TenantContext::isSet()) {
                $model->tenant_id = TenantContext::current()->id;
            }
        });

        // Global scope: automatically filter by current tenant on every query
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (TenantContext::isSet()) {
                $builder->where(
                    $builder->getModel()->getTable() . '.tenant_id',
                    TenantContext::current()->id
                );
            }
        });
    }

    // ─── Explicit scopes ─────────────────────────────────────────────────────

    /**
     * Scope to explicitly query records belonging to a specific tenant.
     * Bypasses the global scope — use only in admin/platform contexts.
     */
    public function scopeForTenant(Builder $query, Tenant $tenant): Builder
    {
        return $query->withoutGlobalScope('tenant')
                     ->where($this->getTable() . '.tenant_id', $tenant->id);
    }

    // ─── Relationship ─────────────────────────────────────────────────────────

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
