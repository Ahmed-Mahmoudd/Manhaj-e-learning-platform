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

class InstructorDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    private function buildTenantWithInstructorAndSection(): array
    {
        $tenant     = Tenant::factory()->create();
        $faculty    = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept       = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $term       = AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);
        $course     = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();
        $section    = Section::factory()->create([
            'tenant_id'        => $tenant->id,
            'course_id'        => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $instructor->id,
            'capacity'         => 30,
        ]);

        return compact('tenant', 'instructor', 'section', 'course', 'term');
    }

    // ─── My Sections ──────────────────────────────────────────────────────────

    #[Test]
    public function instructor_can_get_their_sections(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'course' => $course] =
            $this->buildTenantWithInstructorAndSection();

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson('/api/v1/instructor/sections')
             ->assertOk()
             ->assertJsonCount(1, 'sections')
             ->assertJsonPath('sections.0.course.code', $course->code)
             ->assertJsonPath('sections.0.enrolled_count', 0);
    }

    #[Test]
    public function student_cannot_access_instructor_sections(): void
    {
        $tenant  = Tenant::factory()->create();
        $student = User::factory()->forTenant($tenant)->student()->create();

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson('/api/v1/instructor/sections')
             ->assertForbidden();
    }

    #[Test]
    public function instructor_only_sees_their_own_sections(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor] =
            $this->buildTenantWithInstructorAndSection();

        // Create a second instructor with their own section
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $term    = AcademicTerm::factory()->create(['tenant_id' => $tenant->id]);
        $course  = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $otherInstructor = User::factory()->forTenant($tenant)->instructor()->create();

        Section::factory()->create([
            'tenant_id'        => $tenant->id,
            'course_id'        => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $otherInstructor->id,
        ]);

        // Our instructor should only see 1 section
        $this->actingAs($instructor, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson('/api/v1/instructor/sections')
             ->assertOk()
             ->assertJsonCount(1, 'sections');
    }

    // ─── Section Enrolments ───────────────────────────────────────────────────

    #[Test]
    public function instructor_can_get_section_enrolments(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section] =
            $this->buildTenantWithInstructorAndSection();

        // Enrol 2 students
        $students = User::factory()->count(2)->forTenant($tenant)->student()->create();
        foreach ($students as $student) {
            Enrolment::create([
                'tenant_id'   => $tenant->id,
                'student_id'  => $student->id,
                'section_id'  => $section->id,
                'status'      => 'enrolled',
                'enrolled_at' => now(),
            ]);
        }

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson("/api/v1/instructor/sections/{$section->id}/enrolments")
             ->assertOk()
             ->assertJsonCount(2, 'enrolments')
             ->assertJsonPath('enrolled_count', 2);
    }

    #[Test]
    public function instructor_cannot_see_other_instructor_section_enrolments(): void
    {
        ['tenant' => $tenant, 'section' => $section] =
            $this->buildTenantWithInstructorAndSection();

        $otherInstructor = User::factory()->forTenant($tenant)->instructor()->create();

        $this->actingAs($otherInstructor, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson("/api/v1/instructor/sections/{$section->id}/enrolments")
             ->assertForbidden();
    }

    #[Test]
    public function ta_can_get_their_assigned_sections(): void
    {
        ['tenant' => $tenant, 'section' => $section] =
            $this->buildTenantWithInstructorAndSection();

        $ta = User::factory()->forTenant($tenant)->teachingAssistant()->create();
        $section->teachingAssistants()->attach($ta->id);

        $this->actingAs($ta, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson('/api/v1/instructor/sections')
             ->assertOk()
             ->assertJsonCount(1, 'sections')
             ->assertJsonPath('sections.0.id', $section->id);
    }

    #[Test]
    public function ta_can_view_assigned_section_enrolments(): void
    {
        ['tenant' => $tenant, 'section' => $section] =
            $this->buildTenantWithInstructorAndSection();

        $ta = User::factory()->forTenant($tenant)->teachingAssistant()->create();
        $section->teachingAssistants()->attach($ta->id);

        $this->actingAs($ta, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson("/api/v1/instructor/sections/{$section->id}/enrolments")
             ->assertOk();
    }

    #[Test]
    public function ta_cannot_see_unassigned_section_enrolments(): void
    {
        ['tenant' => $tenant, 'section' => $section] =
            $this->buildTenantWithInstructorAndSection();

        $ta = User::factory()->forTenant($tenant)->teachingAssistant()->create();

        $this->actingAs($ta, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson("/api/v1/instructor/sections/{$section->id}/enrolments")
             ->assertForbidden();
    }
}
