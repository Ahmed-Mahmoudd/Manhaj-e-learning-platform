<?php

namespace Tests\Feature\Api;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\Section;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AnnouncementService;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AnnouncementsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    // ─── Shared scaffold ──────────────────────────────────────────────────────

    private function scaffold(): array
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
        ]);
        $student = User::factory()->forTenant($tenant)->student()->create();
        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'student_id'  => $student->id,
            'section_id'  => $section->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        return compact('tenant', 'instructor', 'section', 'student');
    }

    private function headers(Tenant $tenant): array
    {
        return ['X-Tenant-ID' => $tenant->id];
    }

    // ─── AnnouncementService unit tests ──────────────────────────────────────

    #[Test]
    public function service_creates_and_publishes_announcement(): void
    {
        ['tenant' => $tenant, 'section' => $section, 'instructor' => $instructor] = $this->scaffold();

        $service      = app(AnnouncementService::class);
        $announcement = $service->create($section, $instructor, [
            'title' => 'Welcome!',
            'body'  => 'Welcome to the course.',
            'type'  => 'general',
        ], publishNow: true);

        $this->assertTrue($announcement->is_published);
        $this->assertNotNull($announcement->published_at);
        $this->assertDatabaseHas('announcements', ['title' => 'Welcome!', 'is_published' => true]);
    }

    #[Test]
    public function service_creates_draft_when_not_published_now(): void
    {
        ['section' => $section, 'instructor' => $instructor] = $this->scaffold();

        $service      = app(AnnouncementService::class);
        $announcement = $service->create($section, $instructor, [
            'title' => 'Draft Post',
            'body'  => 'Not ready yet.',
            'type'  => 'general',
        ], publishNow: false);

        $this->assertFalse($announcement->is_published);
        $this->assertNull($announcement->published_at);
    }

    #[Test]
    public function service_publishes_draft(): void
    {
        ['section' => $section, 'instructor' => $instructor] = $this->scaffold();

        $service      = app(AnnouncementService::class);
        $announcement = $service->create($section, $instructor, [
            'title' => 'Draft', 'body' => 'Body', 'type' => 'general',
        ], publishNow: false);

        $published = $service->publish($announcement);

        $this->assertTrue($published->is_published);
        $this->assertNotNull($published->published_at);
    }

    #[Test]
    public function service_publish_throws_if_already_published(): void
    {
        ['section' => $section, 'instructor' => $instructor] = $this->scaffold();

        $service      = app(AnnouncementService::class);
        $announcement = $service->create($section, $instructor, [
            'title' => 'Done', 'body' => 'Body', 'type' => 'general',
        ], publishNow: true);

        $this->expectException(\RuntimeException::class);
        $service->publish($announcement);
    }

    #[Test]
    public function mark_read_is_idempotent(): void
    {
        ['section' => $section, 'instructor' => $instructor, 'student' => $student] = $this->scaffold();

        $service      = app(AnnouncementService::class);
        $announcement = $service->create($section, $instructor, [
            'title' => 'Test', 'body' => 'Body', 'type' => 'general',
        ]);

        $service->markRead($announcement, $student);
        $service->markRead($announcement, $student); // second call

        $this->assertDatabaseCount('announcement_reads', 1);
    }

    #[Test]
    public function unread_count_decrements_after_marking_read(): void
    {
        ['section' => $section, 'instructor' => $instructor, 'student' => $student] = $this->scaffold();

        $service = app(AnnouncementService::class);

        $a1 = $service->create($section, $instructor, ['title' => 'A1', 'body' => 'B', 'type' => 'general']);
        $a2 = $service->create($section, $instructor, ['title' => 'A2', 'body' => 'B', 'type' => 'general']);

        $this->assertEquals(2, $service->unreadCount($student));

        $service->markRead($a1, $student);
        $this->assertEquals(1, $service->unreadCount($student));

        $service->markRead($a2, $student);
        $this->assertEquals(0, $service->unreadCount($student));
    }

    #[Test]
    public function for_student_only_returns_published_announcements(): void
    {
        ['section' => $section, 'instructor' => $instructor, 'student' => $student] = $this->scaffold();

        $service = app(AnnouncementService::class);
        $service->create($section, $instructor, ['title' => 'Published', 'body' => 'B', 'type' => 'general'], publishNow: true);
        $service->create($section, $instructor, ['title' => 'Draft',     'body' => 'B', 'type' => 'general'], publishNow: false);

        $results = $service->forStudent($student);

        $this->assertCount(1, $results);
        $this->assertEquals('Published', $results->first()->title);
    }

    // ─── Instructor API tests ─────────────────────────────────────────────────

    #[Test]
    public function instructor_can_create_announcement(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section] = $this->scaffold();

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/sections/{$section->id}/announcements", [
                 'title'       => 'Exam Next Week',
                 'body'        => 'Please prepare chapters 1-5.',
                 'type'        => 'exam',
                 'publish_now' => true,
             ])
             ->assertCreated()
             ->assertJsonPath('announcement.title', 'Exam Next Week')
             ->assertJsonPath('announcement.type', 'exam')
             ->assertJsonPath('announcement.is_published', true);
    }

    #[Test]
    public function instructor_can_create_draft_announcement(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section] = $this->scaffold();

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/sections/{$section->id}/announcements", [
                 'title'       => 'Draft Post',
                 'body'        => 'Not ready.',
                 'type'        => 'general',
                 'publish_now' => false,
             ])
             ->assertCreated()
             ->assertJsonPath('announcement.is_published', false);
    }

    #[Test]
    public function instructor_can_publish_draft(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section] = $this->scaffold();

        $announcement = Announcement::create([
            'tenant_id'    => $tenant->id,
            'section_id'   => $section->id,
            'author_id'    => $instructor->id,
            'title'        => 'Draft',
            'body'         => 'Body.',
            'type'         => 'general',
            'is_published' => false,
        ]);

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/announcements/{$announcement->id}/publish")
             ->assertOk()
             ->assertJsonPath('announcement.is_published', true);
    }

    #[Test]
    public function announcement_type_validation_works(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section] = $this->scaffold();

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/sections/{$section->id}/announcements", [
                 'title' => 'Test', 'body' => 'Test', 'type' => 'invalid',
             ])
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['type']);
    }

    #[Test]
    public function other_instructor_cannot_post_to_section(): void
    {
        ['tenant' => $tenant, 'section' => $section] = $this->scaffold();
        $outsider = User::factory()->forTenant($tenant)->instructor()->create();

        $this->actingAs($outsider, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/sections/{$section->id}/announcements", [
                 'title' => 'Hack', 'body' => 'Hack', 'type' => 'general',
             ])
             ->assertForbidden();
    }

    // ─── Student API tests ────────────────────────────────────────────────────

    #[Test]
    public function student_can_view_announcements_with_read_status(): void
    {
        ['tenant' => $tenant, 'section' => $section, 'instructor' => $instructor, 'student' => $student] =
            $this->scaffold();

        $service = app(AnnouncementService::class);
        $a1 = $service->create($section, $instructor, ['title' => 'First',  'body' => 'B', 'type' => 'general']);
        $a2 = $service->create($section, $instructor, ['title' => 'Second', 'body' => 'B', 'type' => 'urgent']);

        // Mark first as read
        $service->markRead($a1, $student);

        $response = $this->actingAs($student, 'sanctum')
                         ->withHeaders($this->headers($tenant))
                         ->getJson('/api/v1/student/announcements')
                         ->assertOk();

        $data = $response->json();
        $this->assertEquals(1, $data['unread_count']);
        $this->assertCount(2, $data['announcements']);

        // Find the read/unread ones
        $readItem   = collect($data['announcements'])->firstWhere('title', 'First');
        $unreadItem = collect($data['announcements'])->firstWhere('title', 'Second');

        $this->assertTrue($readItem['is_read']);
        $this->assertFalse($unreadItem['is_read']);
    }

    #[Test]
    public function student_can_mark_announcement_as_read(): void
    {
        ['tenant' => $tenant, 'section' => $section, 'instructor' => $instructor, 'student' => $student] =
            $this->scaffold();

        $announcement = Announcement::create([
            'tenant_id'    => $tenant->id,
            'section_id'   => $section->id,
            'author_id'    => $instructor->id,
            'title'        => 'Read Me',
            'body'         => 'Content.',
            'type'         => 'general',
            'is_published' => true,
            'published_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/student/announcements/{$announcement->id}/read")
             ->assertOk()
             ->assertJsonPath('message', 'Marked as read.')
             ->assertJsonPath('unread_count', 0);

        $this->assertDatabaseHas('announcement_reads', [
            'announcement_id' => $announcement->id,
            'user_id'         => $student->id,
        ]);
    }

    #[Test]
    public function student_cannot_see_announcements_from_unenrolled_sections(): void
    {
        ['tenant' => $tenant, 'student' => $student] = $this->scaffold();

        // Create a second section the student is NOT enrolled in
        $faculty2  = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept2     = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty2->id]);
        $term2     = AcademicTerm::factory()->create(['tenant_id' => $tenant->id]);
        $course2   = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept2->id]);
        $other_instr = User::factory()->forTenant($tenant)->instructor()->create();
        $section2  = Section::factory()->create([
            'tenant_id' => $tenant->id, 'course_id' => $course2->id,
            'academic_term_id' => $term2->id, 'instructor_id' => $other_instr->id,
        ]);

        Announcement::create([
            'tenant_id'    => $tenant->id,
            'section_id'   => $section2->id,
            'author_id'    => $other_instr->id,
            'title'        => 'Secret',
            'body'         => 'Not for this student.',
            'type'         => 'general',
            'is_published' => true,
            'published_at' => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->getJson('/api/v1/student/announcements')
             ->assertOk()
             ->assertJsonCount(0, 'announcements');
    }
}
