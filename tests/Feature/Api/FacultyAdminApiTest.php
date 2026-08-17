<?php

namespace Tests\Feature\Api;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\Programme;
use App\Models\Section;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class FacultyAdminApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    private function scaffold(): array
    {
        $tenant     = Tenant::factory()->create();
        $faculty    = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $otherFac   = Faculty::factory()->create(['tenant_id' => $tenant->id, 'code' => 'ART']);
        $admin      = User::factory()->forTenant($tenant)->facultyAdmin()->create([
            'faculty_id' => $faculty->id,
        ]);
        $dept       = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $otherDept  = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $otherFac->id]);
        $term       = AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);
        $course     = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $otherCourse = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $otherDept->id]);
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();
        $student    = User::factory()->forTenant($tenant)->student()->create();
        $section    = Section::factory()->create([
            'tenant_id'        => $tenant->id,
            'course_id'        => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $instructor->id,
            'is_active'        => true,
        ]);
        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'student_id'  => $student->id,
            'section_id'  => $section->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        return compact(
            'tenant', 'admin', 'faculty', 'otherFac', 'dept', 'otherDept',
            'term', 'course', 'otherCourse', 'section', 'instructor', 'student',
        );
    }

    private function h(Tenant $t): array
    {
        return ['X-Tenant-ID' => $t->id];
    }

    #[Test]
    public function faculty_admin_cannot_access_university_admin_routes(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/faculties')->assertForbidden();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/terms')->assertForbidden();
    }

    #[Test]
    public function faculty_admin_dashboard_is_scoped_to_faculty(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'faculty' => $faculty] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/dashboard')
             ->assertOk()
             ->assertJsonPath('scope', 'faculty')
             ->assertJsonPath('stats.faculty.id', $faculty->id)
             ->assertJsonPath('stats.departments_count', 1);
    }

    #[Test]
    public function faculty_admin_only_sees_own_departments(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/departments')
             ->assertOk()
             ->assertJsonCount(1, 'departments');
    }

    #[Test]
    public function faculty_admin_can_create_department_in_own_faculty(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'faculty' => $faculty] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/departments', [
                 'faculty_id' => $faculty->id,
                 'name_en'    => 'Information Systems',
                 'code'       => 'IS',
             ])
             ->assertCreated()
             ->assertJsonPath('department.faculty_id', $faculty->id);
    }

    #[Test]
    public function faculty_admin_cannot_access_other_faculty_department(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'otherDept' => $otherDept] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson("/api/v1/admin/departments/{$otherDept->id}")
             ->assertForbidden();
    }

    #[Test]
    public function faculty_admin_can_manage_programmes(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'dept' => $dept] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/programmes', [
                 'department_id'  => $dept->id,
                 'name_en'        => 'BSc CS',
                 'code'           => 'BSCS',
                 'grading_type'   => 'credit_gpa',
                 'duration_years' => 4,
             ])
             ->assertCreated()
             ->assertJsonPath('programme.code', 'BSCS');
    }

    #[Test]
    public function faculty_admin_only_sees_own_courses(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/courses')
             ->assertOk()
             ->assertJsonCount(1, 'courses');
    }

    #[Test]
    public function faculty_admin_can_create_course(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'dept' => $dept] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/courses', [
                 'department_id' => $dept->id,
                 'code'          => 'CS201',
                 'title_en'      => 'Data Structures',
                 'credit_hours'  => 3,
             ])
             ->assertCreated()
             ->assertJsonPath('course.code', 'CS201');
    }

    #[Test]
    public function faculty_admin_lists_faculty_scoped_users(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'instructor' => $instructor, 'student' => $student] =
            $this->scaffold();

        $response = $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
                         ->getJson('/api/v1/admin/users')
                         ->assertOk();

        $emails = collect($response->json('data'))->pluck('email');
        $this->assertTrue($emails->contains($instructor->email));
        $this->assertTrue($emails->contains($student->email));
    }

    #[Test]
    public function faculty_admin_can_create_instructor_user(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/users', [
                 'name'     => 'New Instructor',
                 'email'    => 'new.inst@test.com',
                 'role'     => 'instructor',
                 'password' => 'secure-pass-123',
             ])
             ->assertCreated()
             ->assertJsonPath('user.role', 'instructor');
    }

    #[Test]
    public function faculty_admin_cannot_assign_university_admin_role(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'student' => $student] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->patchJson("/api/v1/admin/users/{$student->id}/role", ['role' => 'university_admin'])
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['role']);
    }
}
