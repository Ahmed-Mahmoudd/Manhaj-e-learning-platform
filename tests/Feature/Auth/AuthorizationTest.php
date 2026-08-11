<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Authorization / RBAC Tests
 *
 * Verifies that Gates and the EnsureRole middleware enforce role boundaries.
 */
class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    // ─── Gate tests ───────────────────────────────────────────────────────────

    #[Test]
    public function platform_admin_passes_every_gate(): void
    {
        $admin = User::factory()->platformAdmin()->create();

        $gates = [
            'manage-tenants', 'manage-university', 'manage-faculty',
            'manage-courses', 'manage-sections', 'teach',
            'enrol', 'grade-submissions', 'publish-grades',
            'view-grades', 'manage-users', 'import-students',
        ];

        foreach ($gates as $gate) {
            $this->assertTrue(
                Gate::forUser($admin)->allows($gate),
                "Platform admin should pass gate: {$gate}"
            );
        }
    }

    #[Test]
    public function student_cannot_manage_courses(): void
    {
        $tenant  = Tenant::factory()->create();
        $student = User::factory()->forTenant($tenant)->student()->create();

        $this->assertFalse(Gate::forUser($student)->allows('manage-courses'));
    }

    #[Test]
    public function student_cannot_publish_grades(): void
    {
        $tenant  = Tenant::factory()->create();
        $student = User::factory()->forTenant($tenant)->student()->create();

        $this->assertFalse(Gate::forUser($student)->allows('publish-grades'));
    }

    #[Test]
    public function instructor_can_manage_courses(): void
    {
        $tenant     = Tenant::factory()->create();
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();

        $this->assertTrue(Gate::forUser($instructor)->allows('manage-courses'));
    }

    #[Test]
    public function instructor_can_publish_grades(): void
    {
        $tenant     = Tenant::factory()->create();
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();

        $this->assertTrue(Gate::forUser($instructor)->allows('publish-grades'));
    }

    #[Test]
    public function teaching_assistant_cannot_publish_grades(): void
    {
        $tenant = Tenant::factory()->create();
        $ta     = User::factory()->forTenant($tenant)->teachingAssistant()->create();

        // TA can grade but cannot publish — instructor privilege only
        $this->assertTrue(Gate::forUser($ta)->allows('grade-submissions'));
        $this->assertFalse(Gate::forUser($ta)->allows('publish-grades'));
    }

    #[Test]
    public function university_admin_can_manage_faculty(): void
    {
        $tenant = Tenant::factory()->create();
        $admin  = User::factory()->forTenant($tenant)->universityAdmin()->create();

        $this->assertTrue(Gate::forUser($admin)->allows('manage-faculty'));
    }

    #[Test]
    public function guest_cannot_enrol(): void
    {
        $tenant = Tenant::factory()->create();
        $guest  = User::factory()->forTenant($tenant)->guest()->create();

        $this->assertFalse(Gate::forUser($guest)->allows('enrol'));
    }

    // ─── Role helper method tests ─────────────────────────────────────────────

    #[Test]
    public function user_role_is_cast_to_enum(): void
    {
        $tenant  = Tenant::factory()->create();
        $student = User::factory()->forTenant($tenant)->student()->create();

        $fresh = $student->fresh();
        $this->assertInstanceOf(Role::class, $fresh->role);
        $this->assertSame(Role::Student, $fresh->role);
    }

    #[Test]
    #[DataProvider('roleHelperProvider')]
    public function role_helper_methods_return_correct_boolean(
        string $factoryState,
        string $helperMethod,
        bool $expected
    ): void {
        $tenant = Tenant::factory()->create();
        $user   = User::factory()->forTenant($tenant)->{$factoryState}()->create();

        $this->assertSame($expected, $user->{$helperMethod}());
    }

    public static function roleHelperProvider(): array
    {
        return [
            'student isStudent true'         => ['student',           'isStudent',           true],
            'instructor isStudent false'     => ['instructor',        'isStudent',           false],
            'instructor isInstructor true'   => ['instructor',        'isInstructor',        true],
            'student isInstructor false'     => ['student',           'isInstructor',        false],
            'uniAdmin isAdministrative true' => ['universityAdmin',   'isAdministrative',    true],
            'student isAdministrative false' => ['student',           'isAdministrative',    false],
            'instructor isTeachingStaff'     => ['instructor',        'isTeachingStaff',     true],
            'ta isTeachingStaff'             => ['teachingAssistant', 'isTeachingStaff',     true],
            'student isTeachingStaff false'  => ['student',           'isTeachingStaff',     false],
        ];
    }
}
