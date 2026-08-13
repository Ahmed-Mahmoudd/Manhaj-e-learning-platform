<?php

namespace Tests\Feature\Api\Auth;

use App\Enums\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    // ─── Login tests ──────────────────────────────────────────────────────────

    #[Test]
    public function user_can_login_with_valid_credentials(): void
    {
        $tenant = Tenant::factory()->create();
        $user   = User::factory()->forTenant($tenant)->student()->create([
            'email'    => 'student@test.com',
            'password' => bcrypt('secret123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'student@test.com',
            'password' => 'secret123',
        ]);

        $response->assertOk()
                 ->assertJsonStructure([
                     'token',
                     'token_type',
                     'user' => ['id', 'name', 'email', 'role', 'tenant_id'],
                 ])
                 ->assertJsonPath('user.email', 'student@test.com')
                 ->assertJsonPath('user.role', Role::Student->value)
                 ->assertJsonPath('token_type', 'Bearer');
    }

    #[Test]
    public function login_fails_with_wrong_password(): void
    {
        $tenant = Tenant::factory()->create();
        User::factory()->forTenant($tenant)->student()->create([
            'email'    => 'student@test.com',
            'password' => bcrypt('correct'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'student@test.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(401)
                 ->assertJsonValidationErrors(['email']);
    }

    #[Test]
    public function login_fails_with_missing_fields(): void
    {
        $response = $this->postJson('/api/v1/auth/login', []);

        $response->assertUnprocessable()
                 ->assertJsonValidationErrors(['email', 'password']);
    }

    #[Test]
    public function login_fails_for_nonexistent_user(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'ghost@nowhere.com',
            'password' => 'password',
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function login_succeeds_when_tenant_header_does_not_match_user_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        User::factory()->forTenant($tenantA)->student()->create([
            'email'    => 'student@cut.manhaj.app',
            'password' => bcrypt('password'),
        ]);

        $this->withHeader('X-Tenant-ID', (string) $tenantB->id)
             ->postJson('/api/v1/auth/login', [
                 'email'    => 'student@cut.manhaj.app',
                 'password' => 'password',
             ])
             ->assertOk()
             ->assertJsonPath('user.email', 'student@cut.manhaj.app');
    }

    // ─── Me tests ─────────────────────────────────────────────────────────────

    #[Test]
    public function authenticated_user_can_fetch_their_profile(): void
    {
        $tenant = Tenant::factory()->create();
        $user   = User::factory()->forTenant($tenant)->instructor()->create();

        $response = $this->actingAs($user, 'sanctum')
                         ->getJson('/api/v1/auth/me');

        $response->assertOk()
                 ->assertJsonPath('user.id', $user->id)
                 ->assertJsonPath('user.role', Role::Instructor->value)
                 ->assertJsonPath('user.tenant_id', $tenant->id);
    }

    #[Test]
    public function unauthenticated_request_to_me_returns_401(): void
    {
        $this->getJson('/api/v1/auth/me')
             ->assertUnauthorized();
    }

    // ─── Logout tests ─────────────────────────────────────────────────────────

    #[Test]
    public function authenticated_user_can_logout(): void
    {
        $tenant = Tenant::factory()->create();
        $user   = User::factory()->forTenant($tenant)->student()->create();

        // Use a real token so currentAccessToken() is a proper PersonalAccessToken
        $token = $user->createToken('api')->plainTextToken;

        $this->withToken($token)
             ->postJson('/api/v1/auth/logout')
             ->assertOk()
             ->assertJsonPath('message', 'Logged out successfully.');
    }

    #[Test]
    public function logout_deletes_the_access_token_from_database(): void
    {
        $tenant = Tenant::factory()->create();
        $user   = User::factory()->forTenant($tenant)->student()->create();

        // Issue a real Sanctum token
        $tokenResult = $user->createToken('api');
        $token       = $tokenResult->plainTextToken;
        $tokenId     = $tokenResult->accessToken->id;

        // Token exists in DB before logout
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $tokenId]);

        // Logout revokes it
        $this->withToken($token)
             ->postJson('/api/v1/auth/logout')
             ->assertOk();

        // Token record is gone from DB
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
    }

    #[Test]
    public function unauthenticated_logout_returns_401(): void
    {
        $this->postJson('/api/v1/auth/logout')
             ->assertUnauthorized();
    }

    // ─── Role assertion test ──────────────────────────────────────────────────

    #[Test]
    public function login_response_contains_correct_role_for_each_user_type(): void
    {
        $tenant = Tenant::factory()->create();

        $roles = [
            Role::Student->value    => 'student',
            Role::Instructor->value => 'instructor',
        ];

        foreach ($roles as $roleValue => $expected) {
            $user = User::factory()->forTenant($tenant)->create([
                'role'     => $roleValue,
                'password' => bcrypt('password'),
            ]);

            $this->postJson('/api/v1/auth/login', [
                'email'    => $user->email,
                'password' => 'password',
            ])->assertJsonPath('user.role', $expected);
        }
    }
}
