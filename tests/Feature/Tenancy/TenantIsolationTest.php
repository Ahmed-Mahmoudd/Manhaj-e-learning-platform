<?php

namespace Tests\Feature\Tenancy;

use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Tenant Isolation Test
 *
 * CRITICAL requirement from spec:
 * "Tenant A must NOT be able to access Tenant B data."
 *
 * This test proves that the BelongsToTenant global scope enforces isolation
 * at the Eloquent query level.
 */
class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear(); // ensure no tenant bleeds between tests
        parent::tearDown();
    }

    #[Test]
    public function tenant_a_cannot_see_tenant_b_users(): void
    {
        $tenantA = Tenant::factory()->create(['subdomain' => 'univ-a']);
        $tenantB = Tenant::factory()->create(['subdomain' => 'univ-b']);

        $userA = User::factory()->forTenant($tenantA)->create();
        $userB = User::factory()->forTenant($tenantB)->create();

        TenantContext::set($tenantA);
        $visibleUsers = User::all();

        $this->assertCount(1, $visibleUsers);
        $this->assertTrue($visibleUsers->first()->is($userA));
        $this->assertFalse($visibleUsers->contains($userB));
    }

    #[Test]
    public function tenant_b_cannot_see_tenant_a_users(): void
    {
        $tenantA = Tenant::factory()->create(['subdomain' => 'univ-a2']);
        $tenantB = Tenant::factory()->create(['subdomain' => 'univ-b2']);

        User::factory()->forTenant($tenantA)->create();
        $userB = User::factory()->forTenant($tenantB)->create();

        TenantContext::set($tenantB);
        $visibleUsers = User::all();

        $this->assertCount(1, $visibleUsers);
        $this->assertTrue($visibleUsers->first()->is($userB));
    }

    #[Test]
    public function without_tenant_context_all_users_are_visible(): void
    {
        $tenantA = Tenant::factory()->create(['subdomain' => 'univ-a3']);
        $tenantB = Tenant::factory()->create(['subdomain' => 'univ-b3']);

        User::factory()->forTenant($tenantA)->create();
        User::factory()->forTenant($tenantB)->create();

        TenantContext::clear();
        $allUsers = User::all();

        $this->assertCount(2, $allUsers);
    }

    #[Test]
    public function tenant_id_is_automatically_filled_on_create(): void
    {
        $tenant = Tenant::factory()->create(['subdomain' => 'auto-fill']);

        TenantContext::set($tenant);

        $user = User::factory()->make();
        $user->tenant_id = null;
        $user->save();

        $this->assertEquals($tenant->id, $user->fresh()->tenant_id);
    }

    #[Test]
    public function for_tenant_scope_bypasses_global_scope(): void
    {
        $tenantA = Tenant::factory()->create(['subdomain' => 'scope-a']);
        $tenantB = Tenant::factory()->create(['subdomain' => 'scope-b']);

        $userA = User::factory()->forTenant($tenantA)->create();
        User::factory()->forTenant($tenantB)->create();

        TenantContext::set($tenantB);

        $result = User::query()->forTenant($tenantA)->get();

        $this->assertCount(1, $result);
        $this->assertTrue($result->first()->is($userA));
    }
}
