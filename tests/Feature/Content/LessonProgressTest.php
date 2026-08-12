<?php

namespace Tests\Feature\Content;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Module;
use App\Models\Tenant;
use App\Models\User;
use App\Services\LessonProgressService;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LessonProgressTest extends TestCase
{
    use RefreshDatabase;

    private LessonProgressService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new LessonProgressService();
    }

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function setupLesson(string $type = 'text'): array
    {
        $tenant  = Tenant::factory()->create();
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $course  = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $module  = Module::factory()->create(['tenant_id' => $tenant->id, 'course_id' => $course->id]);

        $lessonFactory = $type === 'video'
            ? Lesson::factory()->video()
            : Lesson::factory();

        $lesson = $lessonFactory->create([
            'tenant_id' => $tenant->id,
            'module_id' => $module->id,
            'type'      => $type,
        ]);

        $student = User::factory()->forTenant($tenant)->student()->create();

        TenantContext::set($tenant);

        return compact('tenant', 'course', 'module', 'lesson', 'student');
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    #[Test]
    public function recording_a_view_creates_progress_record(): void
    {
        ['lesson' => $lesson, 'student' => $student] = $this->setupLesson();

        $progress = $this->service->recordView($student, $lesson);

        $this->assertInstanceOf(LessonProgress::class, $progress);
        $this->assertEquals($student->id, $progress->user_id);
        $this->assertEquals($lesson->id, $progress->lesson_id);
        $this->assertEquals(0, $progress->progress_pct);
        $this->assertNotNull($progress->last_accessed_at);
    }

    #[Test]
    public function recording_view_twice_is_idempotent(): void
    {
        ['lesson' => $lesson, 'student' => $student] = $this->setupLesson();

        $this->service->recordView($student, $lesson);
        $this->service->recordView($student, $lesson);

        $count = LessonProgress::withoutGlobalScope('tenant')
            ->where('user_id', $student->id)
            ->where('lesson_id', $lesson->id)
            ->count();

        $this->assertEquals(1, $count);
    }

    #[Test]
    public function updating_progress_accumulates_correctly(): void
    {
        ['lesson' => $lesson, 'student' => $student] = $this->setupLesson('video');
        $lesson->update(['duration_seconds' => 200]);

        // First update: 60 seconds → 30%
        $progress = $this->service->updateProgress($student, $lesson, 60, null);
        $this->assertEquals(60, $progress->seconds_spent);
        $this->assertEquals(30, $progress->progress_pct);
        $this->assertNull($progress->completed_at);

        // Second update: 140 seconds → 70%
        $progress = $this->service->updateProgress($student, $lesson, 140, null);
        $this->assertEquals(140, $progress->seconds_spent);
        $this->assertEquals(70, $progress->progress_pct);
    }

    #[Test]
    public function video_progress_follows_playback_position(): void
    {
        ['lesson' => $lesson, 'student' => $student] = $this->setupLesson('video');
        $lesson->update(['duration_seconds' => 14_400]); // 4 hours

        $this->service->updateProgress($student, $lesson, 10_800, 75); // 3 hours in

        // Rewind scrubber — progress should decrease
        $progress = $this->service->updateProgress($student, $lesson, 3_600, 25);

        $this->assertEquals(3_600, $progress->seconds_spent);
        $this->assertEquals(25, $progress->progress_pct);
    }

    #[Test]
    public function non_video_progress_never_goes_backwards(): void
    {
        ['lesson' => $lesson, 'student' => $student] = $this->setupLesson('text');

        $this->service->updateProgress($student, $lesson, 0, 80);

        $progress = $this->service->updateProgress($student, $lesson, 0, 10);

        $this->assertEquals(80, $progress->progress_pct);
    }

    #[Test]
    public function reset_progress_clears_completion(): void
    {
        ['lesson' => $lesson, 'student' => $student] = $this->setupLesson('video');
        $lesson->update(['duration_seconds' => 600]);

        $this->service->updateProgress($student, $lesson, 600, 100);
        $progress = $this->service->resetProgress($student, $lesson);

        $this->assertEquals(0, $progress->seconds_spent);
        $this->assertEquals(0, $progress->progress_pct);
        $this->assertNull($progress->completed_at);
    }

    #[Test]
    public function marking_video_complete_sets_position_to_duration(): void
    {
        ['lesson' => $lesson, 'student' => $student] = $this->setupLesson('video');
        $lesson->update(['duration_seconds' => 3_600]);

        $progress = $this->service->updateProgress($student, $lesson, 0, 100);

        $this->assertEquals(3_600, $progress->seconds_spent);
        $this->assertEquals(100, $progress->progress_pct);
        $this->assertNotNull($progress->completed_at);
    }

    #[Test]
    public function lesson_is_marked_complete_at_100_percent(): void
    {
        ['lesson' => $lesson, 'student' => $student] = $this->setupLesson('video');
        $lesson->update(['duration_seconds' => 600]);

        $progress = $this->service->updateProgress($student, $lesson, 600, null);

        $this->assertNotNull($progress->completed_at);
        $this->assertEquals(100, $progress->progress_pct);
        $this->assertTrue($progress->isCompleted());
    }

    #[Test]
    public function mark_complete_works_for_text_lessons(): void
    {
        ['lesson' => $lesson, 'student' => $student] = $this->setupLesson('text');

        $progress = $this->service->markComplete($student, $lesson);

        $this->assertTrue($progress->isCompleted());
        $this->assertEquals(100, $progress->progress_pct);
    }

    #[Test]
    public function course_completion_pct_calculates_correctly(): void
    {
        ['course' => $course, 'module' => $module, 'lesson' => $l1, 'student' => $student, 'tenant' => $tenant] =
            $this->setupLesson();

        // setupLesson already created 1 lesson ($l1).
        // Create 2 more → total = 3
        $l2 = Lesson::factory()->create(['tenant_id' => $tenant->id, 'module_id' => $module->id]);
        $l3 = Lesson::factory()->create(['tenant_id' => $tenant->id, 'module_id' => $module->id]);

        // Complete 2 of 3 at 100%; third has no record (0%)
        $this->service->markComplete($student, $l1);
        $this->service->markComplete($student, $l2);

        $pct = $this->service->courseCompletionPct($student, $course->id);

        // (100 + 100 + 0) / 3 = 66.7%
        $this->assertEquals(66.7, $pct);
    }

    #[Test]
    public function course_completion_pct_averages_partial_progress(): void
    {
        ['course' => $course, 'module' => $module, 'lesson' => $l1, 'student' => $student, 'tenant' => $tenant] =
            $this->setupLesson('video');

        $l1->update(['duration_seconds' => 100, 'is_published' => true]);
        $module->update(['is_published' => true]);

        $l2 = Lesson::factory()->create([
            'tenant_id' => $tenant->id, 'module_id' => $module->id, 'is_published' => true,
        ]);

        $this->service->updateProgress($student, $l1, 80, null);

        $pct = $this->service->courseCompletionPct($student, $course->id);

        // (80 + 0) / 2 = 40%
        $this->assertEquals(40.0, $pct);
    }

    #[Test]
    public function lesson_type_helpers_return_correct_booleans(): void
    {
        $tenant  = Tenant::factory()->create();
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $course  = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $module  = Module::factory()->create(['tenant_id' => $tenant->id, 'course_id' => $course->id]);

        $videoLesson = Lesson::factory()->video()->create(['tenant_id' => $tenant->id, 'module_id' => $module->id]);
        $textLesson  = Lesson::factory()->create(['tenant_id' => $tenant->id, 'module_id' => $module->id]);

        $this->assertTrue($videoLesson->isVideo());
        $this->assertFalse($videoLesson->isText());
        $this->assertTrue($textLesson->isText());
        $this->assertFalse($textLesson->isVideo());
    }

    #[Test]
    public function unpublished_lesson_is_not_released(): void
    {
        $tenant  = Tenant::factory()->create();
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $course  = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $module  = Module::factory()->create(['tenant_id' => $tenant->id, 'course_id' => $course->id]);

        $lesson = Lesson::factory()->unpublished()->create([
            'tenant_id' => $tenant->id,
            'module_id' => $module->id,
        ]);

        $this->assertFalse($lesson->isReleasedNow());
    }

    #[Test]
    public function future_release_at_lesson_is_not_available(): void
    {
        $tenant  = Tenant::factory()->create();
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $course  = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $module  = Module::factory()->create(['tenant_id' => $tenant->id, 'course_id' => $course->id]);

        $lesson = Lesson::factory()->create([
            'tenant_id'  => $tenant->id,
            'module_id'  => $module->id,
            'release_at' => now()->addDays(7), // future
        ]);

        $this->assertFalse($lesson->isReleasedNow());
    }
}
