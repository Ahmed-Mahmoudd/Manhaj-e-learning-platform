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
use App\Services\EnrolmentService;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class EnrolmentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    // ─── Scaffold ─────────────────────────────────────────────────────────────

    private function scaffold(int $capacity = 2): array
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
            'capacity'         => $capacity,
            'is_active'        => true,
        ]);
        $student = User::factory()->forTenant($tenant)->student()->create();

        return compact('tenant', 'section', 'student', 'course', 'dept', 'faculty', 'term', 'instructor');
    }

    private function h(Tenant $t): array { return ['X-Tenant-ID' => $t->id]; }

    // ─── checkEligibility service tests ──────────────────────────────────────

    #[Test]
    public function eligible_student_with_capacity(): void
    {
        ['section' => $section, 'student' => $student] = $this->scaffold(30);

        $result = app(EnrolmentService::class)->checkEligibility($student, $section);

        $this->assertTrue($result['can_enrol']);
        $this->assertFalse($result['would_be_waitlisted']);
        $this->assertNull($result['reason']);
        $this->assertEmpty($result['missing_prerequisites']);
    }

    #[Test]
    public function eligible_student_goes_to_waitlist_when_full(): void
    {
        ['section' => $section, 'student' => $student, 'tenant' => $tenant, 'instructor' => $instructor] =
            $this->scaffold(1);

        // Fill the one seat
        $other = User::factory()->forTenant($tenant)->student()->create();
        Enrolment::create([
            'tenant_id'   => $tenant->id, 'student_id' => $other->id,
            'section_id'  => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);

        $result = app(EnrolmentService::class)->checkEligibility($student, $section);

        $this->assertTrue($result['can_enrol']);
        $this->assertTrue($result['would_be_waitlisted']);
    }

    #[Test]
    public function already_enrolled_student_cannot_enrol_again(): void
    {
        ['section' => $section, 'student' => $student, 'tenant' => $tenant] = $this->scaffold();

        Enrolment::create([
            'tenant_id'   => $tenant->id, 'student_id' => $student->id,
            'section_id'  => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);

        $result = app(EnrolmentService::class)->checkEligibility($student, $section);

        $this->assertFalse($result['can_enrol']);
        $this->assertStringContainsString('already enrolled', $result['reason']);
    }

    #[Test]
    public function student_blocked_by_missing_prerequisites(): void
    {
        ['section' => $section, 'student' => $student, 'course' => $course,
         'tenant' => $tenant, 'dept' => $dept] = $this->scaffold();

        // Create a prereq course and link it
        $prereq = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $course->prerequisites()->attach($prereq->id);
        $section->load('course.prerequisites');

        $result = app(EnrolmentService::class)->checkEligibility($student, $section);

        $this->assertFalse($result['can_enrol']);
        $this->assertCount(1, $result['missing_prerequisites']);
        $this->assertEquals($prereq->code, $result['missing_prerequisites'][0]['code']);
    }

    // ─── Eligibility API endpoint ─────────────────────────────────────────────

    #[Test]
    public function eligibility_endpoint_returns_correct_shape(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold(30);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->getJson("/api/v1/student/sections/{$section->id}/eligibility")
             ->assertOk()
             ->assertJsonPath('can_enrol', true)
             ->assertJsonPath('would_be_waitlisted', false)
             ->assertJsonStructure(['can_enrol', 'would_be_waitlisted', 'reason',
                                    'missing_prerequisites', 'section']);
    }

    #[Test]
    public function eligibility_shows_waitlist_when_section_full(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold(1);

        $other = User::factory()->forTenant($tenant)->student()->create();
        Enrolment::create([
            'tenant_id'   => $tenant->id, 'student_id' => $other->id,
            'section_id'  => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->getJson("/api/v1/student/sections/{$section->id}/eligibility")
             ->assertOk()
             ->assertJsonPath('can_enrol', true)
             ->assertJsonPath('would_be_waitlisted', true);
    }

    // ─── Self-enrol API ───────────────────────────────────────────────────────

    #[Test]
    public function student_can_enrol_in_section(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section, 'course' => $course] =
            $this->scaffold(30);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/student/sections/{$section->id}/enrol")
             ->assertCreated()
             ->assertJsonPath('enrolment.status', 'enrolled')
             ->assertJsonPath('enrolment.course_code', $course->code);

        $this->assertDatabaseHas('enrolments', [
            'student_id' => $student->id,
            'section_id' => $section->id,
            'status'     => 'enrolled',
        ]);
    }

    #[Test]
    public function student_gets_waitlisted_when_section_full(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold(1);

        // Fill the seat
        $other = User::factory()->forTenant($tenant)->student()->create();
        Enrolment::create([
            'tenant_id'   => $tenant->id, 'student_id' => $other->id,
            'section_id'  => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/student/sections/{$section->id}/enrol")
             ->assertCreated()
             ->assertJsonPath('enrolment.status', 'waitlisted')
             ->assertJsonPath('enrolment.waitlist_position', 1);
    }

    #[Test]
    public function student_cannot_enrol_twice(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold(30);

        Enrolment::create([
            'tenant_id'   => $tenant->id, 'student_id' => $student->id,
            'section_id'  => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/student/sections/{$section->id}/enrol")
             ->assertUnprocessable()
             ->assertJsonPath('message', 'You are already enrolled in this section.');
    }

    #[Test]
    public function enrolling_twice_does_not_return_server_error(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold(30);

        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'student_id'  => $student->id,
            'section_id'  => $section->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/student/sections/{$section->id}/enrol")
             ->assertUnprocessable()
             ->assertJsonMissing(['exception'])
             ->assertJsonPath('message', 'You are already enrolled in this section.');
    }

    #[Test]
    public function student_blocked_by_prerequisite_via_api(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section,
         'course' => $course, 'dept' => $dept] = $this->scaffold(30);

        $prereq = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $course->prerequisites()->attach($prereq->id);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/student/sections/{$section->id}/enrol")
             ->assertUnprocessable()
             ->assertJsonPath('message', "Prerequisite not met: {$prereq->code} — {$prereq->title_en}");
    }

    // ─── Drop API ──────────────────────────────────────────────────────────────

    #[Test]
    public function student_can_drop_enrolment(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold(30);

        $enrolment = Enrolment::create([
            'tenant_id'   => $tenant->id, 'student_id' => $student->id,
            'section_id'  => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/student/enrolments/{$enrolment->id}/drop")
             ->assertOk()
             ->assertJsonPath('message', 'Successfully dropped from the section.');

        $this->assertDatabaseHas('enrolments', [
            'id'     => $enrolment->id,
            'status' => 'dropped',
        ]);
    }

    #[Test]
    public function dropping_enrolled_student_promotes_waitlisted_student(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold(1);

        // Enrol student1 (takes the one seat)
        $enrolled = Enrolment::create([
            'tenant_id'   => $tenant->id, 'student_id' => $student->id,
            'section_id'  => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);

        // Student2 goes to waitlist
        $waiter = User::factory()->forTenant($tenant)->student()->create();
        $waitlisted = Enrolment::create([
            'tenant_id'         => $tenant->id, 'student_id' => $waiter->id,
            'section_id'        => $section->id, 'status' => 'waitlisted', 'waitlist_position' => 1,
        ]);

        // Student1 drops → waiter gets promoted
        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/student/enrolments/{$enrolled->id}/drop")
             ->assertOk();

        $this->assertDatabaseHas('enrolments', [
            'id'     => $waitlisted->id,
            'status' => 'enrolled',
        ]);
    }

    #[Test]
    public function student_cannot_drop_another_students_enrolment(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold(30);

        $other      = User::factory()->forTenant($tenant)->student()->create();
        $enrolment  = Enrolment::create([
            'tenant_id'   => $tenant->id, 'student_id' => $other->id,
            'section_id'  => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/student/enrolments/{$enrolment->id}/drop")
             ->assertForbidden();
    }

    #[Test]
    public function student_can_list_their_enrolments(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold(30);

        Enrolment::create([
            'tenant_id'   => $tenant->id, 'student_id' => $student->id,
            'section_id'  => $section->id, 'status' => 'enrolled', 'enrolled_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->getJson('/api/v1/student/enrolments')
             ->assertOk()
             ->assertJsonCount(1, 'enrolments')
             ->assertJsonPath('enrolments.0.status', 'enrolled');
    }
}
