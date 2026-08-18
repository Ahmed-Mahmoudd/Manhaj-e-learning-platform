<?php

namespace Tests\Feature\Api;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\GradeItem;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Module;
use App\Models\Section;
use App\Models\StudentGrade;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InstructorAnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    private function setupSectionWithStudents(): array
    {
        $tenant     = Tenant::factory()->create();
        $faculty    = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept       = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $term       = AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);
        $course     = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();
        $ta         = User::factory()->forTenant($tenant)->teachingAssistant()->create();

        $section = Section::factory()->create([
            'tenant_id'        => $tenant->id,
            'course_id'        => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $instructor->id,
            'capacity'         => 30,
        ]);

        $section->teachingAssistants()->attach($ta->id);

        $student1 = User::factory()->forTenant($tenant)->student()->create();
        $student2 = User::factory()->forTenant($tenant)->student()->create();

        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'section_id'  => $section->id,
            'student_id'  => $student1->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'section_id'  => $section->id,
            'student_id'  => $student2->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        // Grade item and grades
        $gradeItem = GradeItem::create([
            'tenant_id'    => $tenant->id,
            'section_id'   => $section->id,
            'name'         => 'Midterm Exam',
            'type'         => 'exam',
            'max_score'    => 100,
            'weight'       => 40,
            'is_published' => true,
        ]);

        StudentGrade::create([
            'tenant_id'     => $tenant->id,
            'grade_item_id' => $gradeItem->id,
            'student_id'    => $student1->id,
            'graded_by'     => $instructor->id,
            'score'         => 95,
            'is_published'  => true,
            'graded_at'     => now(),
        ]);

        StudentGrade::create([
            'tenant_id'     => $tenant->id,
            'grade_item_id' => $gradeItem->id,
            'student_id'    => $student2->id,
            'graded_by'     => $instructor->id,
            'score'         => 75,
            'is_published'  => true,
            'graded_at'     => now(),
        ]);

        // Module and lesson
        $module = Module::create([
            'tenant_id'    => $tenant->id,
            'course_id'    => $course->id,
            'title'        => 'Module 1',
            'order'        => 1,
            'is_published' => true,
        ]);

        $lesson = Lesson::create([
            'tenant_id'    => $tenant->id,
            'module_id'    => $module->id,
            'title'        => 'Lesson 1.1',
            'type'         => 'text',
            'order'        => 1,
            'is_published' => true,
        ]);

        LessonProgress::create([
            'tenant_id'     => $tenant->id,
            'user_id'       => $student1->id,
            'lesson_id'     => $lesson->id,
            'progress_pct'  => 100,
            'seconds_spent' => 120,
            'completed_at'  => now(),
        ]);

        return compact('tenant', 'instructor', 'ta', 'section', 'course', 'student1', 'student2', 'module', 'lesson');
    }

    #[Test]
    public function instructor_can_view_section_analytics(): void
    {
        $data = $this->setupSectionWithStudents();

        $response = $this->actingAs($data['instructor'], 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->getJson("/api/v1/instructor/sections/{$data['section']->id}/analytics");

        $response->assertOk()
            ->assertJsonPath('section_id', $data['section']->id)
            ->assertJsonPath('enrolled_count', 2)
            ->assertJsonPath('published_grade_items', 1)
            ->assertJsonPath('average_grade_pct', 85)
            ->assertJsonPath('grade_distribution.A', 1)
            ->assertJsonPath('grade_distribution.C', 1);
    }

    #[Test]
    public function ta_can_view_assigned_section_analytics(): void
    {
        $data = $this->setupSectionWithStudents();

        $this->actingAs($data['ta'], 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->getJson("/api/v1/instructor/sections/{$data['section']->id}/analytics")
            ->assertOk()
            ->assertJsonPath('enrolled_count', 2);
    }

    #[Test]
    public function unassigned_instructor_cannot_view_section_analytics(): void
    {
        $data = $this->setupSectionWithStudents();
        $otherInstructor = User::factory()->forTenant($data['tenant'])->instructor()->create();

        $this->actingAs($otherInstructor, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->getJson("/api/v1/instructor/sections/{$data['section']->id}/analytics")
            ->assertForbidden();
    }

    #[Test]
    public function instructor_can_view_student_progress_matrix(): void
    {
        $data = $this->setupSectionWithStudents();

        $response = $this->actingAs($data['instructor'], 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->getJson("/api/v1/instructor/sections/{$data['section']->id}/progress");

        $response->assertOk()
            ->assertJsonPath('section_id', $data['section']->id)
            ->assertJsonCount(2, 'students')
            ->assertJsonCount(1, 'modules');
    }

    #[Test]
    public function unassigned_instructor_cannot_view_student_progress_matrix(): void
    {
        $data = $this->setupSectionWithStudents();
        $otherInstructor = User::factory()->forTenant($data['tenant'])->instructor()->create();

        $this->actingAs($otherInstructor, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->getJson("/api/v1/instructor/sections/{$data['section']->id}/progress")
            ->assertForbidden();
    }
}
