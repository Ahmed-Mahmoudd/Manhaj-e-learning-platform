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
             ->getJson('/api/v1/admin/programmes')->assertForbidden();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/courses')->assertForbidden();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/sections')->assertForbidden();

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
                     'total_programmes',
                     'total_enrolments',
                     'faculty_summaries' => [
                         '*' => ['id', 'name_en', 'name_ar', 'code', 'departments_count', 'programmes_count', 'courses_count', 'students_count'],
                     ],
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

    #[Test]
    public function admin_cannot_see_other_tenant_faculties(): void
    {
        ['admin' => $admin, 'tenant' => $tenant] = $this->scaffold();
        $other = Tenant::factory()->create();
        Faculty::factory()->create(['tenant_id' => $other->id]);

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/faculties')->assertOk()->assertJsonCount(1, 'faculties');
    }

    // ─── Terms ────────────────────────────────────────────────────────────────

    #[Test]
    public function admin_can_list_terms(): void
    {
        ['tenant' => $tenant, 'admin' => $admin] = $this->scaffold();
        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/admin/terms')
             ->assertOk()
             ->assertJsonStructure(['terms']);
    }

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

    #[Test]
    public function admin_can_deactivate_term(): void
    {
        ['tenant' => $tenant, 'admin' => $admin, 'term' => $activeTerm] = $this->scaffold();

        $this->actingAs($admin, 'sanctum')->withHeaders($this->h($tenant))
             ->postJson("/api/v1/admin/terms/{$activeTerm->id}/deactivate")
             ->assertOk()->assertJsonPath('term.is_active', false);

        $this->assertDatabaseHas('academic_terms', ['id' => $activeTerm->id, 'is_active' => false]);
    }
}
