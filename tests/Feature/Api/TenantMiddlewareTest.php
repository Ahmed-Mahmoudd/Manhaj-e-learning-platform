<?php

namespace Tests\Feature\Api;

use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TenantMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    #[Test]
    public function request_without_tenant_header_proceeds_without_scoping(): void
    {
        // Login works without X-Tenant-ID (platform admin use case)
        $user = User::factory()->platformAdmin()->create([
            'email'    => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email'    => 'admin@test.com',
            'password' => 'password',
        ])->assertOk();
    }

    #[Test]
    public function request_with_valid_tenant_header_resolves_correctly(): void
    {
        $tenant = Tenant::factory()->create();
        $user   = User::factory()->forTenant($tenant)->student()->create([
            'email'    => 'student@test.com',
            'password' => bcrypt('password'),
        ]);

        $this->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->postJson('/api/v1/auth/login', [
                 'email'    => 'student@test.com',
                 'password' => 'password',
             ])
             ->assertOk()
             ->assertJsonPath('user.tenant_id', $tenant->id);
    }

    #[Test]
    public function request_with_invalid_tenant_id_returns_404(): void
    {
        $this->withHeaders(['X-Tenant-ID' => 99999])
             ->postJson('/api/v1/auth/login', [
                 'email'    => 'x@x.com',
                 'password' => 'password',
             ])
             ->assertNotFound()
             ->assertJsonPath('message', 'Tenant not found.');
    }

    #[Test]
    public function request_with_inactive_tenant_returns_403(): void
    {
        $tenant = Tenant::factory()->create(['is_active' => false]);

        $this->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->postJson('/api/v1/auth/login', [
                 'email'    => 'x@x.com',
                 'password' => 'password',
             ])
             ->assertForbidden()
             ->assertJsonPath('message', 'This institution account is suspended.');
    }

    #[Test]
    public function tenant_scoped_route_without_header_returns_400(): void
    {
        $tenant  = Tenant::factory()->create();
        $student = User::factory()->forTenant($tenant)->student()->create();

        $this->actingAs($student, 'sanctum')
             ->getJson('/api/v1/student/courses')
             ->assertStatus(400)
             ->assertJsonPath('message', 'X-Tenant-ID header is required for this endpoint.');
    }
}
