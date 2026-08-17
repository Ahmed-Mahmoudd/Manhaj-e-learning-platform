<?php

namespace Tests\Feature\Api;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\Section;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UniversityAdminApiTest extends TestCase
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
        $admin      = User::factory()->forTenant($tenant)->universityAdmin()->create();
        $faculty    = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept       = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $term       = AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);
        $course     = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();
        $section    = Section::factory()->create([
            'tenant_id'        => $tenant->id, 'course_id' => $course->id,
            'academic_term_id' => $term->id,   'instructor_id' => $instructor->id,
            'is_active'        => true,
        ]);
        return compact('tenant', 'admin', 'faculty', 'dept', 'term', 'course', 'section', 'instructor');
    }

    private function h(Tenant $t): array { return ['X-Tenant-ID' => $t->id]; }

    // ─── Role guard ───────────────────────────────────────────────────────────

    #[Test]
    public function student_cannot_access_admin_endpoints(): void
    {
        ['tenant' => $tenant] = $this->scaffold();
        $student = User::factory()->forTenant($tenant)->student()->create();
        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/faculties')->assertForbidden();
    }

    #[Test]
    public function instructor_cannot_access_admin_endpoints(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor] = $this->scaffold();
        $this->actingAs($instructor, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/faculties')->assertForbidden();
    }

    // ─── Role separation ──────────────────────────────────────────────────────

    #[Test]
    public function university_admin_cannot_access_faculty_admin_routes(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/departments')->assertForbidden();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/courses')->assertForbidden();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/users')->assertForbidden();
    }

    #[Test]
    public function university_admin_dashboard_returns_university_stats(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/dashboard')
             ->assertOk()
             ->assertJsonPath('scope', 'university')
             ->assertJsonStructure([
                 'stats' => [
                     'total_students',
                     'total_faculties',
                     'total_departments',
                     'faculty_summaries',
                 ],
             ]);
    }

    // ─── Faculty ──────────────────────────────────────────────────────────────

    #[Test]
    public function admin_can_list_faculties(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/faculties')->assertOk()->assertJsonCount(1, 'faculties');
    }

    #[Test]
    public function admin_can_create_faculty(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/faculties', ['name_en' => 'Engineering', 'name_ar' => 'هندسة', 'code' => 'ENG'])
             ->assertCreated()->assertJsonPath('faculty.code', 'ENG');
        $this->assertDatabaseHas('faculties', ['code' => 'ENG', 'tenant_id' => $tenant->id]);
    }

    #[Test]
    public function admin_can_update_faculty(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'faculty' => $faculty] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->patchJson("/api/v1/admin/faculties/{$faculty->id}", ['name_en' => 'Updated'])
             ->assertOk()->assertJsonPath('faculty.name_en', 'Updated');
    }

    #[Test]
    public function cannot_delete_faculty_with_departments(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'faculty' => $faculty] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->deleteJson("/api/v1/admin/faculties/{$faculty->id}")
             ->assertUnprocessable()->assertJsonPath('message', 'Cannot delete faculty with existing departments.');
    }

    // ─── Departments ──────────────────────────────────────────────────────────

    #[Test]
    public function admin_can_create_department(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'faculty' => $faculty] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/departments', [
                 'faculty_id' => $faculty->id, 'name_en' => 'Computer Science', 'name_ar' => 'علوم الحاسب', 'code' => 'CS',
             ])->assertCreated()->assertJsonPath('department.code', 'CS');
    }

    #[Test]
    public function admin_can_create_department_without_name_ar(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'faculty' => $faculty] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/departments', [
                 'faculty_id' => $faculty->id, 'name_en' => 'Information Systems', 'code' => 'IS',
             ])->assertCreated()
               ->assertJsonPath('department.code', 'IS')
               ->assertJsonPath('department.name_ar', 'Information Systems');
    }

    #[Test]
    public function admin_can_filter_departments_by_faculty(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'faculty' => $faculty] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson("/api/v1/admin/departments?faculty_id={$faculty->id}")
             ->assertOk()->assertJsonCount(1, 'departments');
    }

    #[Test]
    public function cannot_delete_department_with_courses(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'dept' => $dept] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->deleteJson("/api/v1/admin/departments/{$dept->id}")->assertUnprocessable();
    }

    // ─── Terms ────────────────────────────────────────────────────────────────

    #[Test]
    public function admin_can_create_term(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/terms', [
                 'name' => 'Fall 2027', 'type' => 'semester',
                 'starts_at' => '2027-09-01', 'ends_at' => '2028-01-15',
             ])->assertCreated()->assertJsonPath('term.name', 'Fall 2027')
               ->assertJsonPath('term.is_active', false);
    }

    #[Test]
    public function activating_term_deactivates_others(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'term' => $activeTerm] = $this->scaffold();
        $newTerm = AcademicTerm::factory()->create(['tenant_id' => $tenant->id, 'is_active' => false]);

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson("/api/v1/admin/terms/{$newTerm->id}/activate")
             ->assertOk()->assertJsonPath('term.is_active', true);

        $this->assertDatabaseHas('academic_terms', ['id' => $activeTerm->id, 'is_active' => false]);
        $this->assertDatabaseHas('academic_terms', ['id' => $newTerm->id,    'is_active' => true]);
    }

    // ─── Courses ──────────────────────────────────────────────────────────────

    #[Test]
    public function admin_can_create_course(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'dept' => $dept] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/courses', [
                 'department_id' => $dept->id, 'code' => 'CS101',
                 'title_en' => 'Intro to Programming', 'title_ar' => 'مقدمة في البرمجة', 'credit_hours' => 3,
             ])->assertCreated()->assertJsonPath('course.code', 'CS101');
    }

    #[Test]
    public function admin_can_update_course_prerequisites(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'dept' => $dept, 'course' => $course] = $this->scaffold();
        $prereq = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->patchJson("/api/v1/admin/courses/{$course->id}", ['prerequisites' => [$prereq->id]])
             ->assertOk();

        $this->assertDatabaseHas('course_prerequisites', [
            'course_id' => $course->id, 'prerequisite_id' => $prereq->id,
        ]);
    }

    #[Test]
    public function cannot_delete_course_with_sections(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'course' => $course] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->deleteJson("/api/v1/admin/courses/{$course->id}")->assertUnprocessable();
    }

    // ─── Sections ─────────────────────────────────────────────────────────────

    #[Test]
    public function admin_can_create_section(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'course' => $course,
         'term' => $term, 'instructor' => $instructor] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/sections', [
                 'course_id' => $course->id, 'academic_term_id' => $term->id,
                 'instructor_id' => $instructor->id, 'section_number' => 'B', 'capacity' => 40,
             ])->assertCreated()->assertJsonPath('section.section_number', 'B');
    }

    #[Test]
    public function admin_can_update_section_capacity(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'section' => $section] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->patchJson("/api/v1/admin/sections/{$section->id}", ['capacity' => 99])
             ->assertOk()->assertJsonPath('section.capacity', 99);
    }

    #[Test]
    public function cannot_delete_section_with_active_enrolments(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'section' => $section] = $this->scaffold();
        $student = User::factory()->forTenant($tenant)->student()->create();
        Enrolment::create([
            'tenant_id' => $tenant->id, 'student_id' => $student->id,
            'section_id' => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->deleteJson("/api/v1/admin/sections/{$section->id}")->assertUnprocessable();
    }

    // ─── Users ────────────────────────────────────────────────────────────────

    #[Test]
    public function admin_can_list_users(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/users')->assertOk()->assertJsonStructure(['data', 'meta']);
    }

    #[Test]
    public function admin_can_create_user(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson('/api/v1/admin/users', [
                 'name' => 'New Instructor', 'email' => 'new.inst@test.com', 'role' => 'instructor',
                 'password' => 'secure-pass-123',
             ])->assertCreated()->assertJsonPath('user.role', 'instructor');
        $this->assertDatabaseHas('users', ['email' => 'new.inst@test.com', 'tenant_id' => $tenant->id]);
    }

    #[Test]
    public function admin_can_change_user_role(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();
        $user = User::factory()->forTenant($tenant)->student()->create();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->patchJson("/api/v1/admin/users/{$user->id}/role", ['role' => 'teaching_assistant'])
             ->assertOk()->assertJsonPath('user.role', 'teaching_assistant');
    }

    #[Test]
    public function admin_cannot_modify_platform_admin_role(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();
        $pa = User::factory()->create(['role' => 'platform_admin', 'tenant_id' => $tenant->id]);
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->patchJson("/api/v1/admin/users/{$pa->id}/role", ['role' => 'student'])
             ->assertForbidden();
    }

    #[Test]
    public function admin_cannot_see_other_tenant_faculties(): void
    {
        ['admin' => $admin, 'tenant' => $tenant] = $this->scaffold();
        $other = Tenant::factory()->create();
        Faculty::factory()->create(['tenant_id' => $other->id]);

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/faculties')->assertOk()->assertJsonCount(1, 'faculties');
    }
}
