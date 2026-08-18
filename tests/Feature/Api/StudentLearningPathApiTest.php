<?php

namespace Tests\Feature\Api;

use App\Models\AcademicTerm;
use App\Models\Announcement;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Module;
use App\Models\Recommendation;
use App\Models\Section;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class StudentLearningPathApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    #[Test]
    public function student_can_get_dashboard_summary_with_continue_learning(): void
    {
        $tenant     = Tenant::factory()->create();
        $faculty    = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept       = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $term       = AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);
        $course     = Course::factory()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
            'code'          => 'CS101',
            'title_en'      => 'Intro to Programming',
            'title_ar'      => 'مقدمة في البرمجة',
        ]);
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();
        $student    = User::factory()->forTenant($tenant)->student()->create();

        $section = Section::factory()->create([
            'tenant_id'        => $tenant->id,
            'course_id'        => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $instructor->id,
        ]);

        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'section_id'  => $section->id,
            'student_id'  => $student->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        $module = Module::create([
            'tenant_id'    => $tenant->id,
            'course_id'    => $course->id,
            'title'        => 'Module 1: Basics',
            'order'        => 1,
            'is_published' => true,
        ]);

        $lesson = Lesson::create([
            'tenant_id'    => $tenant->id,
            'module_id'    => $module->id,
            'title'        => 'Variables and Loops',
            'type'         => 'video',
            'duration_seconds' => 600,
            'order'        => 1,
            'is_published' => true,
        ]);

        LessonProgress::create([
            'tenant_id'     => $tenant->id,
            'user_id'       => $student->id,
            'lesson_id'     => $lesson->id,
            'progress_pct'  => 50,
            'seconds_spent' => 300,
            'last_accessed_at' => now(),
        ]);

        Announcement::create([
            'tenant_id'    => $tenant->id,
            'section_id'   => $section->id,
            'author_id'    => $instructor->id,
            'title'        => 'Welcome to CS101',
            'body'         => 'First lecture starts tomorrow!',
            'is_published' => true,
            'published_at' => now(),
        ]);

        $response = $this->actingAs($student, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $tenant->id])
            ->getJson('/api/v1/student/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('enrolled_courses_count', 1)
            ->assertJsonPath('average_progress_pct', 50)
            ->assertJsonPath('continue_learning.lesson_id', $lesson->id)
            ->assertJsonPath('continue_learning.course_code', 'CS101')
            ->assertJsonCount(1, 'recent_announcements');
    }

    #[Test]
    public function instructor_cannot_access_student_summary(): void
    {
        $tenant     = Tenant::factory()->create();
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();

        $this->actingAs($instructor, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $tenant->id])
            ->getJson('/api/v1/student/dashboard/summary')
            ->assertForbidden();
    }

    #[Test]
    public function recommendations_return_bilingual_metadata(): void
    {
        $tenant  = Tenant::factory()->create();
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create([
            'tenant_id'  => $tenant->id,
            'faculty_id' => $faculty->id,
            'name_en'    => 'Computer Science',
            'name_ar'    => 'علوم الحاسب',
        ]);
        $course  = Course::factory()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
            'title_en'      => 'Data Structures',
            'title_ar'      => 'هياكل البيانات',
            'description'   => 'Learn stacks, queues, trees.',
        ]);
        $student = User::factory()->forTenant($tenant)->student()->create();

        Recommendation::create([
            'tenant_id'  => $tenant->id,
            'student_id' => $student->id,
            'course_id'  => $course->id,
            'score'      => 0.95,
            'reason'     => 'Based on your interest in algorithms',
            'source'     => 'collaborative_filtering',
            'is_active'  => true,
        ]);

        $response = $this->actingAs($student, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $tenant->id])
            ->getJson('/api/v1/student/recommendations');

        $response->assertOk()
            ->assertJsonCount(1, 'recommendations')
            ->assertJsonPath('recommendations.0.course.title_en', 'Data Structures')
            ->assertJsonPath('recommendations.0.course.title_ar', 'هياكل البيانات')
            ->assertJsonPath('recommendations.0.course.department.name_ar', 'علوم الحاسب');
    }
}
