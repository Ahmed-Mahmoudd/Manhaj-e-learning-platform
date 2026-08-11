<?php

namespace Tests\Feature\Academic;

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

class EnrolmentTest extends TestCase
{
    use RefreshDatabase;

    private EnrolmentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new EnrolmentService();
    }

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function setupTenantWithSection(int $capacity = 30): array
    {
        $tenant  = Tenant::factory()->create();
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $term    = AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);
        $course  = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();

        $section = Section::factory()->create([
            'tenant_id'        => $tenant->id,
            'course_id'        => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $instructor->id,
            'capacity'         => $capacity,
        ]);

        $student = User::factory()->forTenant($tenant)->student()->create();

        TenantContext::set($tenant);

        return compact('tenant', 'course', 'section', 'student', 'dept');
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    #[Test]
    public function student_can_enrol_in_section_with_capacity(): void
    {
        ['section' => $section, 'student' => $student] = $this->setupTenantWithSection(30);

        $enrolment = $this->service->enrol($student, $section);

        $this->assertEquals('enrolled', $enrolment->status);
        $this->assertNotNull($enrolment->enrolled_at);
        $this->assertEquals($student->id, $enrolment->student_id);
    }

    #[Test]
    public function student_is_waitlisted_when_section_is_full(): void
    {
        ['section' => $section, 'student' => $student, 'tenant' => $tenant] =
            $this->setupTenantWithSection(1);

        // Fill the section with 1 other student
        $other = User::factory()->forTenant($tenant)->student()->create();
        $this->service->enrol($other, $section);

        // Now enrol our student — should be waitlisted
        $enrolment = $this->service->enrol($student, $section);

        $this->assertEquals('waitlisted', $enrolment->status);
        $this->assertEquals(1, $enrolment->waitlist_position);
    }

    #[Test]
    public function student_cannot_enrol_twice_in_same_section(): void
    {
        ['section' => $section, 'student' => $student] = $this->setupTenantWithSection();

        $this->service->enrol($student, $section);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/already enrolled/i');

        $this->service->enrol($student, $section);
    }

    #[Test]
    public function dropping_enrolled_student_promotes_waitlisted_student(): void
    {
        ['section' => $section, 'student' => $student, 'tenant' => $tenant] =
            $this->setupTenantWithSection(1);

        // Fill the seat
        $enrolment = $this->service->enrol($student, $section);
        $this->assertEquals('enrolled', $enrolment->status);

        // Waitlist another student
        $waiter = User::factory()->forTenant($tenant)->student()->create();
        $waitEnrolment = $this->service->enrol($waiter, $section);
        $this->assertEquals('waitlisted', $waitEnrolment->status);

        // Drop the enrolled student
        $this->service->drop($enrolment);

        // Waitlisted student should now be enrolled
        $this->assertEquals('enrolled', $waitEnrolment->fresh()->status);
        $this->assertNull($waitEnrolment->fresh()->waitlist_position);
    }

    #[Test]
    public function student_cannot_enrol_without_completing_prerequisite(): void
    {
        ['section' => $section, 'student' => $student, 'tenant' => $tenant, 'dept' => $dept] =
            $this->setupTenantWithSection();

        // Create a prerequisite course and attach it
        $prereq = Course::factory()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
            'code'          => 'CS101',
            'title_en'      => 'Intro to CS',
        ]);
        $section->course->prerequisites()->attach($prereq->id);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/prerequisite not met/i');

        $this->service->enrol($student, $section);
    }

    #[Test]
    public function student_can_enrol_after_completing_prerequisite(): void
    {
        ['section' => $section, 'student' => $student, 'tenant' => $tenant, 'dept' => $dept] =
            $this->setupTenantWithSection();

        // Create prerequisite course + section
        $prereq = Course::factory()->create([
            'tenant_id' => $tenant->id, 'department_id' => $dept->id, 'code' => 'CS100',
        ]);
        $section->course->prerequisites()->attach($prereq->id);

        // Mark the student as having completed the prereq
        $term     = AcademicTerm::factory()->create(['tenant_id' => $tenant->id]);
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();
        $prereqSection = Section::factory()->create([
            'tenant_id' => $tenant->id, 'course_id' => $prereq->id,
            'academic_term_id' => $term->id, 'instructor_id' => $instructor->id,
        ]);

        Enrolment::create([
            'tenant_id'  => $tenant->id,
            'student_id' => $student->id,
            'section_id' => $prereqSection->id,
            'status'     => 'completed',
            'enrolled_at'=> now(),
        ]);

        // Now enrolment should succeed
        $enrolment = $this->service->enrol($student, $section);
        $this->assertEquals('enrolled', $enrolment->status);
    }

    #[Test]
    public function section_capacity_helpers_are_accurate(): void
    {
        ['section' => $section, 'student' => $student] = $this->setupTenantWithSection(2);

        $this->assertTrue($section->hasCapacity());
        $this->assertFalse($section->isFull());
        $this->assertEquals(0, $section->enrolledCount());

        $this->service->enrol($student, $section);
        $section->refresh();

        $this->assertEquals(1, $section->enrolledCount());
        $this->assertTrue($section->hasCapacity()); // still 1 spot left
    }
}
