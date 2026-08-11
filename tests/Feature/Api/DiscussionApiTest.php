<?php

namespace Tests\Feature\Api;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\DiscussionPost;
use App\Models\DiscussionThread;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\Section;
use App\Models\Tenant;
use App\Models\User;
use App\Services\DiscussionService;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DiscussionApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    // ─── Scaffold ─────────────────────────────────────────────────────────────

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

    private function h(Tenant $t): array { return ['X-Tenant-ID' => $t->id]; }

    // ─── DiscussionService unit tests ─────────────────────────────────────────

    #[Test]
    public function create_thread_sets_last_activity(): void
    {
        ['section' => $section, 'student' => $student] = $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Help with Chapter 3',
            'body'  => 'I don\'t understand recursion.',
            'type'  => 'question',
        ]);

        $thread = $thread->fresh();
        $this->assertEquals('question', $thread->type);
        $this->assertNotNull($thread->last_activity_at);
        $this->assertFalse($thread->is_pinned);
        $this->assertFalse($thread->is_locked);
    }

    #[Test]
    public function reply_increments_replies_count(): void
    {
        ['section' => $section, 'student' => $student, 'instructor' => $instructor] = $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'A thread', 'body' => 'Body', 'type' => 'general',
        ]);

        $this->assertEquals(0, $thread->replies_count);

        $service->reply($thread, $instructor, 'Here is the answer.');

        $this->assertEquals(1, $thread->fresh()->replies_count);
    }

    #[Test]
    public function reply_on_locked_thread_throws(): void
    {
        ['section' => $section, 'student' => $student] = $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Locked', 'body' => 'Body', 'type' => 'general',
        ]);

        $service->toggleLock($thread);

        $this->expectException(\RuntimeException::class);
        $service->reply($thread->fresh(), $student, 'Should fail.');
    }

    #[Test]
    public function toggle_pin_flips_state(): void
    {
        ['section' => $section, 'student' => $student] = $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Pin me', 'body' => 'Body', 'type' => 'general',
        ]);

        $this->assertFalse($thread->fresh()->is_pinned);
        $pinned = $service->togglePin($thread);
        $this->assertTrue($pinned->is_pinned);
        $unpinned = $service->togglePin($pinned);
        $this->assertFalse($unpinned->is_pinned);
    }

    #[Test]
    public function mark_answer_resolves_thread_and_unmarks_old_answer(): void
    {
        ['section' => $section, 'student' => $student, 'instructor' => $instructor] = $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Q?', 'body' => 'Body', 'type' => 'question',
        ]);

        $post1 = $service->reply($thread, $instructor, 'Answer 1');
        $post2 = $service->reply($thread, $instructor, 'Answer 2');

        $service->markAnswer($post1);
        $this->assertTrue($post1->fresh()->is_instructor_answer);

        // Marking post2 should unmark post1
        $service->markAnswer($post2);
        $this->assertFalse($post1->fresh()->is_instructor_answer);
        $this->assertTrue($post2->fresh()->is_instructor_answer);
        $this->assertTrue($thread->fresh()->is_resolved);
    }

    #[Test]
    public function toggle_vote_increments_and_decrements(): void
    {
        ['section' => $section, 'student' => $student, 'instructor' => $instructor] = $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Vote thread', 'body' => 'Body', 'type' => 'general',
        ]);
        $post = $service->reply($thread, $instructor, 'Vote on me!');

        $result = $service->toggleVote($post, $student);
        $this->assertTrue($result['voted']);
        $this->assertEquals(1, $result['upvotes_count']);

        $result = $service->toggleVote($post->fresh(), $student);
        $this->assertFalse($result['voted']);
        $this->assertEquals(0, $result['upvotes_count']);
    }

    // ─── API tests ────────────────────────────────────────────────────────────

    #[Test]
    public function student_can_create_thread(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold();

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/discuss/sections/{$section->id}/threads", [
                 'title' => 'Exam prep tips?',
                 'body'  => 'Anyone have advice?',
                 'type'  => 'question',
             ])
             ->assertCreated()
             ->assertJsonPath('thread.title', 'Exam prep tips?')
             ->assertJsonPath('thread.type', 'question');
    }

    #[Test]
    public function student_can_list_threads_and_reply(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold();

        $service = app(DiscussionService::class);
        $service->createThread($section, $student, [
            'title' => 'Thread One', 'body' => 'Body', 'type' => 'general',
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->getJson("/api/v1/discuss/sections/{$section->id}/threads")
             ->assertOk()
             ->assertJsonCount(1, 'data');
    }

    #[Test]
    public function student_can_view_thread_with_posts(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'instructor' => $instructor, 'section' => $section] =
            $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Show me', 'body' => 'Opening post.', 'type' => 'general',
        ]);
        $service->reply($thread, $instructor, 'Instructor reply!');

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->getJson("/api/v1/discuss/threads/{$thread->id}")
             ->assertOk()
             ->assertJsonPath('thread.title', 'Show me')
             ->assertJsonCount(1, 'posts');
    }

    #[Test]
    public function student_can_reply_to_thread(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Thread', 'body' => 'Body', 'type' => 'general',
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/discuss/threads/{$thread->id}/posts", [
                 'body' => 'My reply here.',
             ])
             ->assertCreated()
             ->assertJsonPath('post.body', 'My reply here.');
    }

    #[Test]
    public function student_cannot_reply_to_locked_thread(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Thread', 'body' => 'Body', 'type' => 'general',
        ]);
        $service->toggleLock($thread);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/discuss/threads/{$thread->id}/posts", [
                 'body' => 'Should fail.',
             ])
             ->assertUnprocessable();
    }

    #[Test]
    public function student_can_toggle_upvote(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'instructor' => $instructor, 'section' => $section] =
            $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Voteable', 'body' => 'Body', 'type' => 'general',
        ]);
        $post = $service->reply($thread, $instructor, 'Vote me!');

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/discuss/posts/{$post->id}/vote")
             ->assertOk()
             ->assertJsonPath('voted', true)
             ->assertJsonPath('upvotes_count', 1);
    }

    #[Test]
    public function instructor_can_pin_thread(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'student' => $student, 'section' => $section] =
            $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Pin test', 'body' => 'Body', 'type' => 'general',
        ]);

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/discuss/threads/{$thread->id}/pin")
             ->assertOk()
             ->assertJsonPath('is_pinned', true);
    }

    #[Test]
    public function student_cannot_pin_thread(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'section' => $section] = $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Pin attempt', 'body' => 'Body', 'type' => 'general',
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/discuss/threads/{$thread->id}/pin")
             ->assertForbidden();
    }

    #[Test]
    public function instructor_can_mark_answer(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'student' => $student, 'section' => $section] =
            $this->scaffold();

        $service = app(DiscussionService::class);
        $thread  = $service->createThread($section, $student, [
            'title' => 'Question?', 'body' => 'Body', 'type' => 'question',
        ]);
        $post = $service->reply($thread, $instructor, 'The answer!');

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->postJson("/api/v1/discuss/posts/{$post->id}/answer")
             ->assertOk()
             ->assertJsonPath('is_instructor_answer', true)
             ->assertJsonPath('thread_resolved', true);
    }

    #[Test]
    public function unenrolled_student_cannot_access_forum(): void
    {
        ['tenant' => $tenant, 'section' => $section] = $this->scaffold();

        $outsider = User::factory()->forTenant($tenant)->student()->create();

        $this->actingAs($outsider, 'sanctum')
             ->withHeaders($this->h($tenant))
             ->getJson("/api/v1/discuss/sections/{$section->id}/threads")
             ->assertForbidden();
    }
}
