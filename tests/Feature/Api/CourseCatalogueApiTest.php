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
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CourseCatalogueApiTest extends TestCase
{
    use RefreshDatabase;

    private function scaffold(): array
    {
        $tenant     = Tenant::factory()->create();
        $student    = User::factory()->forTenant($tenant)->student()->create();
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();
        $faculty    = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept       = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $term       = AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);
        $courseA    = Course::factory()->create([
            'tenant_id' => $tenant->id, 'department_id' => $dept->id,
            'code' => 'CS101', 'credit_hours' => 3,
        ]);
        $courseB    = Course::factory()->create([
            'tenant_id' => $tenant->id, 'department_id' => $dept->id,
            'code' => 'CS201', 'credit_hours' => 3,
        ]);
        $section    = Section::factory()->create([
            'tenant_id' => $tenant->id, 'course_id' => $courseA->id,
            'academic_term_id' => $term->id, 'instructor_id' => $instructor->id,
            'is_active' => true, 'capacity' => 30,
        ]);
        return compact('tenant', 'student', 'instructor', 'faculty', 'dept', 'term',
                       'courseA', 'courseB', 'section');
    }

    private function h(Tenant $t): array { return ['X-Tenant-ID' => $t->id]; }

    // ─── Auth guard ───────────────────────────────────────────────────────────

    #[Test]
    public function unauthenticated_user_cannot_browse_catalogue(): void
    {
        ['tenant' => $tenant] = $this->scaffold();
        $this->withHeaders($this->h($tenant))
             ->getJson('/api/v1/catalogue/courses')
             ->assertUnauthorized();
    }

    // ─── Course list ──────────────────────────────────────────────────────────

    #[Test]
    public function student_can_browse_catalogue(): void
    {
        ['tenant' => $tenant, 'student' => $student] = $this->scaffold();
        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/catalogue/courses')
             ->assertOk()
             ->assertJsonCount(2, 'data')
             ->assertJsonStructure(['data', 'meta']);
    }

    #[Test]
    public function catalogue_is_isolated_by_tenant(): void
    {
        ['tenant' => $tenant, 'student' => $student] = $this->scaffold();

        // Another tenant's course — should NOT appear
        $other   = Tenant::factory()->create();
        $oFacult = Faculty::factory()->create(['tenant_id' => $other->id]);
        $oDept   = Department::factory()->create(['tenant_id' => $other->id, 'faculty_id' => $oFacult->id]);
        Course::factory()->count(5)->create(['tenant_id' => $other->id, 'department_id' => $oDept->id]);

        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/catalogue/courses')
             ->assertOk()
             ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function filter_by_department(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'dept' => $dept] = $this->scaffold();
        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson("/api/v1/catalogue/courses?department_id={$dept->id}")
             ->assertOk()
             ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function filter_by_faculty(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'faculty' => $faculty] = $this->scaffold();
        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson("/api/v1/catalogue/courses?faculty_id={$faculty->id}")
             ->assertOk()
             ->assertJsonCount(2, 'data');
    }

    #[Test]
    public function filter_by_term_returns_only_courses_with_active_sections(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'term' => $term] = $this->scaffold();
        // courseA has a section in the term; courseB does not
        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson("/api/v1/catalogue/courses?term_id={$term->id}")
             ->assertOk()
             ->assertJsonCount(1, 'data')
             ->assertJsonPath('data.0.code', 'CS101');
    }

    #[Test]
    public function search_by_code(): void
    {
        ['tenant' => $tenant, 'student' => $student] = $this->scaffold();
        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/catalogue/courses?search=CS201')
             ->assertOk()
             ->assertJsonCount(1, 'data')
             ->assertJsonPath('data.0.code', 'CS201');
    }

    // ─── Course detail ────────────────────────────────────────────────────────

    #[Test]
    public function course_detail_includes_sections_and_prerequisites(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'dept' => $dept,
         'courseA' => $courseA, 'courseB' => $courseB] = $this->scaffold();

        // Set courseA as prerequisite for courseB
        $courseB->prerequisites()->sync([$courseA->id]);

        $resp = $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
                     ->getJson("/api/v1/catalogue/courses/{$courseB->id}")
                     ->assertOk();

        $resp->assertJsonCount(1, 'course.prerequisites');
        $resp->assertJsonPath('course.prerequisites.0.code', 'CS101');
    }

    #[Test]
    public function course_detail_shows_active_sections(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'courseA' => $courseA] = $this->scaffold();
        $resp = $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
                     ->getJson("/api/v1/catalogue/courses/{$courseA->id}")
                     ->assertOk();

        $resp->assertJsonCount(1, 'course.sections');
        $this->assertArrayHasKey('capacity', $resp->json('course.sections.0'));
        $this->assertArrayHasKey('enrolled', $resp->json('course.sections.0'));
    }

    // ─── Section availability ─────────────────────────────────────────────────

    #[Test]
    public function section_availability_shows_correct_seat_count(): void
    {
        ['tenant' => $tenant, 'student' => $student,
         'section' => $section, 'courseA' => $courseA] = $this->scaffold();

        // Enrol 2 students
        for ($i = 0; $i < 2; $i++) {
            $s = User::factory()->forTenant($tenant)->student()->create();
            Enrolment::create([
                'tenant_id' => $tenant->id, 'student_id' => $s->id,
                'section_id' => $section->id, 'status' => 'enrolled',
                'enrolled_at' => now(),
            ]);
        }

        $resp = $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
                     ->getJson("/api/v1/catalogue/sections/{$section->id}/availability")
                     ->assertOk();

        $resp->assertJsonPath('enrolled', 2)
             ->assertJsonPath('capacity', 30)
             ->assertJsonPath('available_seats', 28)
             ->assertJsonPath('is_full', false);
    }

    #[Test]
    public function section_availability_reports_full_when_no_seats(): void
    {
        ['tenant' => $tenant, 'student' => $student,
         'section' => $section] = $this->scaffold();

        // Fill all 30 seats
        for ($i = 0; $i < 30; $i++) {
            $s = User::factory()->forTenant($tenant)->student()->create();
            Enrolment::create([
                'tenant_id' => $tenant->id, 'student_id' => $s->id,
                'section_id' => $section->id, 'status' => 'enrolled',
                'enrolled_at' => now(),
            ]);
        }

        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson("/api/v1/catalogue/sections/{$section->id}/availability")
             ->assertOk()
             ->assertJsonPath('is_full', true)
             ->assertJsonPath('available_seats', 0);
    }

    #[Test]
    public function section_availability_shows_waitlist_depth(): void
    {
        ['tenant' => $tenant, 'student' => $student,
         'section' => $section] = $this->scaffold();

        // 3 waitlisted students
        for ($i = 0; $i < 3; $i++) {
            $s = User::factory()->forTenant($tenant)->student()->create();
            Enrolment::create([
                'tenant_id' => $tenant->id, 'student_id' => $s->id,
                'section_id' => $section->id, 'status' => 'waitlisted',
                'enrolled_at' => now(),
            ]);
        }

        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson("/api/v1/catalogue/sections/{$section->id}/availability")
             ->assertOk()
             ->assertJsonPath('waitlisted', 3);
    }
}
