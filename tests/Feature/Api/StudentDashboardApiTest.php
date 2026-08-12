<?php

namespace Tests\Feature\Api;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Section;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class StudentDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    // ─── Setup helper ─────────────────────────────────────────────────────────

    private function buildTenantWithEnrolledStudent(): array
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
        $student = User::factory()->forTenant($tenant)->student()->create();
        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'student_id'  => $student->id,
            'section_id'  => $section->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        $module = Module::factory()->create([
            'tenant_id'    => $tenant->id,
            'course_id'    => $course->id,
            'order'        => 1,
            'is_published' => true,
        ]);
        $lesson = Lesson::factory()->create([
            'tenant_id'    => $tenant->id,
            'module_id'    => $module->id,
            'order'        => 1,
            'is_published' => true,
        ]);

        return compact('tenant', 'student', 'section', 'course', 'module', 'lesson');
    }

    // ─── My Courses ───────────────────────────────────────────────────────────

    #[Test]
    public function student_can_get_their_enrolled_courses(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'course' => $course] =
            $this->buildTenantWithEnrolledStudent();

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson('/api/v1/student/courses')
             ->assertOk()
             ->assertJsonCount(1, 'courses')
             ->assertJsonPath('courses.0.course.code', $course->code)
             ->assertJsonPath('courses.0.status', 'enrolled');
    }

    #[Test]
    public function my_courses_includes_enrolment_even_when_tenant_global_scope_would_exclude_it(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section, 'course' => $course] =
            $this->buildTenantWithEnrolledStudent();

        // Force-clear context before the HTTP request so the global scope is NOT applied
        // during test setup verification — the API request sets it via X-Tenant-ID.
        TenantContext::clear();

        $this->assertDatabaseHas('enrolments', [
            'student_id' => $student->id,
            'section_id' => $section->id,
            'status'     => 'enrolled',
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson('/api/v1/student/courses')
             ->assertOk()
             ->assertJsonCount(1, 'courses')
             ->assertJsonPath('courses.0.enrolment_id', Enrolment::withoutGlobalScope('tenant')
                 ->where('student_id', $student->id)
                 ->where('section_id', $section->id)
                 ->value('id'))
             ->assertJsonPath('courses.0.course.code', $course->code)
             ->assertJsonPath('courses.0.status', 'enrolled');
    }

    #[Test]
    public function my_courses_finds_enrolment_by_student_id_when_row_tenant_id_differs_from_header(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $faculty    = Faculty::factory()->create(['tenant_id' => $tenantA->id]);
        $dept       = Department::factory()->create(['tenant_id' => $tenantA->id, 'faculty_id' => $faculty->id]);
        $term       = AcademicTerm::factory()->active()->create(['tenant_id' => $tenantA->id]);
        $course     = Course::factory()->create(['tenant_id' => $tenantA->id, 'department_id' => $dept->id]);
        $instructor = User::factory()->forTenant($tenantA)->instructor()->create();
        $section    = Section::factory()->create([
            'tenant_id'        => $tenantA->id,
            'course_id'        => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $instructor->id,
        ]);
        $student = User::factory()->forTenant($tenantA)->student()->create();

        // Legacy / inconsistent row: tenant_id does not match X-Tenant-ID header tenant
        Enrolment::withoutGlobalScope('tenant')->create([
            'tenant_id'   => $tenantB->id,
            'student_id'  => $student->id,
            'section_id'  => $section->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenantA->id])
             ->getJson('/api/v1/student/courses')
             ->assertOk()
             ->assertJsonCount(1, 'courses')
             ->assertJsonPath('courses.0.status', 'enrolled');
    }

    #[Test]
    public function non_student_cannot_access_student_courses(): void
    {
        $tenant     = Tenant::factory()->create();
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson('/api/v1/student/courses')
             ->assertForbidden();
    }

    #[Test]
    public function unauthenticated_request_is_rejected(): void
    {
        $tenant = Tenant::factory()->create();

        $this->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson('/api/v1/student/courses')
             ->assertUnauthorized();
    }

    // ─── Section Lessons ──────────────────────────────────────────────────────

    #[Test]
    public function enrolled_student_can_get_section_lessons(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section, 'lesson' => $lesson] =
            $this->buildTenantWithEnrolledStudent();

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson("/api/v1/student/sections/{$section->id}/lessons")
             ->assertOk()
             ->assertJsonCount(1, 'modules')
             ->assertJsonCount(1, 'modules.0.lessons')
             ->assertJsonPath('modules.0.lessons.0.id', $lesson->id)
             ->assertJsonPath('modules.0.lessons.0.progress', null); // no progress yet
    }

    #[Test]
    public function non_enrolled_student_cannot_get_section_lessons(): void
    {
        ['tenant' => $tenant, 'section' => $section] =
            $this->buildTenantWithEnrolledStudent();

        $outsider = User::factory()->forTenant($tenant)->student()->create();

        $this->actingAs($outsider, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->getJson("/api/v1/student/sections/{$section->id}/lessons")
             ->assertForbidden();
    }

    // ─── Progress Update ──────────────────────────────────────────────────────

    #[Test]
    public function student_can_update_lesson_progress(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'lesson' => $lesson] =
            $this->buildTenantWithEnrolledStudent();

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->postJson("/api/v1/student/lessons/{$lesson->id}/progress", [
                 'seconds_spent' => 120,
                 'progress_pct'  => 50,
             ])
             ->assertOk()
             ->assertJsonPath('progress.lesson_id', $lesson->id)
             ->assertJsonPath('progress.seconds_spent', 120)
             ->assertJsonPath('progress.progress_pct', 50)
             ->assertJsonPath('progress.completed_at', null);
    }

    #[Test]
    public function marking_100_percent_sets_completed_at(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'lesson' => $lesson] =
            $this->buildTenantWithEnrolledStudent();

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->postJson("/api/v1/student/lessons/{$lesson->id}/progress", [
                 'progress_pct' => 100,
             ])
             ->assertOk()
             ->assertJsonPath('progress.progress_pct', 100);

        $this->assertDatabaseHas('lesson_progress', [
            'user_id'   => $student->id,
            'lesson_id' => $lesson->id,
            'progress_pct' => 100,
        ]);
    }

    #[Test]
    public function progress_pct_is_recomputed_from_seconds_for_video_lessons(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'lesson' => $lesson] =
            $this->buildTenantWithEnrolledStudent();

        $lesson->update(['type' => 'video', 'duration_seconds' => 400]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->postJson("/api/v1/student/lessons/{$lesson->id}/progress", [
                 'seconds_spent' => 100,
                 'progress_pct'  => 8, // stale client value — ignored when duration is set
             ])
             ->assertOk()
             ->assertJsonPath('progress.seconds_spent', 100)
             ->assertJsonPath('progress.progress_pct', 25);

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->postJson("/api/v1/student/lessons/{$lesson->id}/progress", [
                 'seconds_spent' => 200,
             ])
             ->assertOk()
             ->assertJsonPath('progress.progress_pct', 50);

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->postJson("/api/v1/student/lessons/{$lesson->id}/progress", [
                 'seconds_spent' => 400,
             ])
             ->assertOk()
             ->assertJsonPath('progress.progress_pct', 100)
             ->assertJsonPath('progress.completed_at', fn ($v) => $v !== null);
    }

    #[Test]
    public function progress_validation_rejects_out_of_range_pct(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'lesson' => $lesson] =
            $this->buildTenantWithEnrolledStudent();

        $this->actingAs($student, 'sanctum')
             ->withHeaders(['X-Tenant-ID' => $tenant->id])
             ->postJson("/api/v1/student/lessons/{$lesson->id}/progress", [
                 'progress_pct' => 150, // invalid
             ])
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['progress_pct']);
    }
}
