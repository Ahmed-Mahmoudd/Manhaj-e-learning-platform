<?php

namespace Tests\Feature\Api;

use App\Models\Faculty;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PlatformAdminApiTest extends TestCase
{
    use RefreshDatabase;

    private function pa(): User
    {
        return User::factory()->create(['role' => 'platform_admin', 'tenant_id' => null]);
    }

    // ─── Role guard ───────────────────────────────────────────────────────────

    #[Test]
    public function university_admin_cannot_access_platform_endpoints(): void
    {
        $tenant = Tenant::factory()->create();
        $ua     = User::factory()->forTenant($tenant)->universityAdmin()->create();

        $this->actingAs($ua, 'sanctum')
             ->getJson('/api/v1/platform/tenants')
             ->assertForbidden();
    }

    #[Test]
    public function unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/v1/platform/tenants')->assertUnauthorized();
    }

    // ─── Tenant list / create ─────────────────────────────────────────────────

    #[Test]
    public function platform_admin_can_list_tenants(): void
    {
        Tenant::factory()->count(3)->create();

        $this->actingAs($this->pa(), 'sanctum')
             ->getJson('/api/v1/platform/tenants')
             ->assertOk()
             ->assertJsonStructure(['data', 'meta']);
    }

    #[Test]
    public function platform_admin_can_create_tenant(): void
    {
        $this->actingAs($this->pa(), 'sanctum')
             ->postJson('/api/v1/platform/tenants', [
                 'name'      => 'New University',
                 'subdomain' => 'new-uni',
             ])
             ->assertCreated()
             ->assertJsonPath('tenant.name', 'New University')
             ->assertJsonPath('tenant.subdomain', 'new-uni');

        $this->assertDatabaseHas('tenants', ['subdomain' => 'new-uni']);
    }

    #[Test]
    public function subdomain_must_be_unique(): void
    {
        Tenant::factory()->create(['subdomain' => 'taken']);

        $this->actingAs($this->pa(), 'sanctum')
             ->postJson('/api/v1/platform/tenants', ['name' => 'X', 'subdomain' => 'taken'])
             ->assertUnprocessable();
    }

    #[Test]
    public function platform_admin_can_update_tenant(): void
    {
        $tenant = Tenant::factory()->create();

        $this->actingAs($this->pa(), 'sanctum')
             ->patchJson("/api/v1/platform/tenants/{$tenant->id}", ['name' => 'Updated Name'])
             ->assertOk()
             ->assertJsonPath('tenant.name', 'Updated Name');
    }

    // ─── Activate / Deactivate ────────────────────────────────────────────────

    #[Test]
    public function platform_admin_can_deactivate_and_reactivate_tenant(): void
    {
        $tenant = Tenant::factory()->create(['is_active' => true]);
        $pa     = $this->pa();

        $this->actingAs($pa, 'sanctum')
             ->postJson("/api/v1/platform/tenants/{$tenant->id}/deactivate")
             ->assertOk()
             ->assertJsonPath('tenant.is_active', false);

        $this->actingAs($pa, 'sanctum')
             ->postJson("/api/v1/platform/tenants/{$tenant->id}/activate")
             ->assertOk()
             ->assertJsonPath('tenant.is_active', true);
    }

    // ─── Stats ────────────────────────────────────────────────────────────────

    #[Test]
    public function platform_admin_can_view_tenant_stats(): void
    {
        $tenant = Tenant::factory()->create();
        User::factory()->forTenant($tenant)->student()->count(5)->create();
        Faculty::factory()->count(2)->create(['tenant_id' => $tenant->id]);

        $this->actingAs($this->pa(), 'sanctum')
             ->getJson("/api/v1/platform/tenants/{$tenant->id}/stats")
             ->assertOk()
             ->assertJsonPath('tenant_id', $tenant->id)
             ->assertJsonPath('users', 5)
             ->assertJsonPath('faculties', 2);
    }

    // ─── User management ──────────────────────────────────────────────────────

    #[Test]
    public function platform_admin_can_create_any_user(): void
    {
        $tenant = Tenant::factory()->create();

        $this->actingAs($this->pa(), 'sanctum')
             ->postJson('/api/v1/platform/users', [
                 'name'      => 'John Instructor',
                 'email'     => 'john@inst.com',
                 'role'      => 'instructor',
                 'tenant_id' => $tenant->id,
             ])
             ->assertCreated()
             ->assertJsonPath('user.role', 'instructor')
             ->assertJsonPath('user.tenant_id', $tenant->id);

        $this->assertDatabaseHas('users', ['email' => 'john@inst.com']);
    }

    #[Test]
    public function platform_admin_can_create_platform_admin(): void
    {
        $this->actingAs($this->pa(), 'sanctum')
             ->postJson('/api/v1/platform/users', [
                 'name'  => 'Super Admin',
                 'email' => 'super@admin.com',
                 'role'  => 'platform_admin',
             ])
             ->assertCreated()
             ->assertJsonPath('user.role', 'platform_admin');
    }

    #[Test]
    public function platform_admin_can_impersonate_user(): void
    {
        $tenant = Tenant::factory()->create();
        $target = User::factory()->forTenant($tenant)->student()->create();

        $this->actingAs($this->pa(), 'sanctum')
             ->postJson("/api/v1/platform/users/{$target->id}/impersonate")
             ->assertOk()
             ->assertJsonStructure(['token', 'expires_at']);
    }

    #[Test]
    public function tenant_list_filters_by_active_status(): void
    {
        Tenant::factory()->create(['is_active' => true,  'name' => 'Active University']);
        Tenant::factory()->create(['is_active' => false, 'name' => 'Inactive University']);

        $resp = $this->actingAs($this->pa(), 'sanctum')
                     ->getJson('/api/v1/platform/tenants?is_active=1')
                     ->assertOk();

        $names = collect($resp->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Active University'));
        $this->assertFalse($names->contains('Inactive University'));
    }
}
