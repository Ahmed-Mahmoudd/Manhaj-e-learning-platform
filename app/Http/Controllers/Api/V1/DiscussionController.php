<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Discussion\AddPostRequest;
use App\Http\Requests\Discussion\StoreThreadRequest;
use App\Models\DiscussionPost;
use App\Models\DiscussionThread;
use App\Models\Enrolment;
use App\Models\Section;
use App\Services\DiscussionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * DiscussionController — forum threads and posts.
 *
 * Shared across roles: student, instructor, TA.
 * Privileged actions (pin/lock/markAnswer) are gated by role check inside each method.
 *
 * Middleware: auth:sanctum + require.tenant
 * (role checks: student OR instructor OR TA — enforced in routes + in-method gates)
 */
class DiscussionController extends Controller
{
    public function __construct(private readonly DiscussionService $service) {}

    // ─── Thread listing ───────────────────────────────────────────────────────

    /**
     * GET /api/v1/discuss/sections/{section}/threads
     * List all threads for a section (pinned first, then by last activity).
     */
    public function threads(Request $request, Section $section): JsonResponse
    {
        $this->assertAccess($section, $request->user());

        $threads = $section->discussionThreads()
            ->with('author')
            ->withCount('posts')
            ->paginate(20);

        return response()->json([
            'data' => collect($threads->items())->map(fn(DiscussionThread $t) => $this->threadSummary($t)),
            'meta' => [
                'total'        => $threads->total(),
                'current_page' => $threads->currentPage(),
                'last_page'    => $threads->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/v1/discuss/threads/{thread}
     * Show a thread with its top-level posts and nested replies.
     */
    public function show(Request $request, DiscussionThread $thread): JsonResponse
    {
        $this->assertAccess($thread->section, $request->user());

        $thread->load(['author', 'section.course']);

        $posts = $thread->topLevelPosts()
            ->with(['author', 'replies.author'])
            ->get();

        $votedPostIds = \App\Models\DiscussionPostVote::where('user_id', $request->user()->id)
            ->whereIn('post_id', $posts->pluck('id'))
            ->pluck('post_id')
            ->flip();

        return response()->json([
            'thread' => $this->threadDetail($thread),
            'posts'  => $posts->map(fn($p) => $this->postData($p, $votedPostIds)),
        ]);
    }

    // ─── Thread creation ──────────────────────────────────────────────────────

    /**
     * POST /api/v1/discuss/sections/{section}/threads
     */
    public function store(StoreThreadRequest $request, Section $section): JsonResponse
    {
        $this->assertAccess($section, $request->user());

        $thread = $this->service->createThread($section, $request->user(), $request->validated());

        return response()->json(['thread' => $this->threadSummary($thread->load('author'))], 201);
    }

    // ─── Replies ──────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/discuss/threads/{thread}/posts
     */
    public function addPost(AddPostRequest $request, DiscussionThread $thread): JsonResponse
    {
        $this->assertAccess($thread->section, $request->user());

        $validated = $request->validated();

        try {
            $post = $this->service->reply(
                $thread,
                $request->user(),
                $validated['body'],
                $validated['parent_post_id'] ?? null
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['post' => $this->postData($post->load('author'))], 201);
    }

    // ─── Upvote ───────────────────────────────────────────────────────────────

    /**
     * POST /api/v1/discuss/posts/{post}/vote
     * Toggle upvote on a post.
     */
    public function vote(Request $request, DiscussionPost $post): JsonResponse
    {
        $this->assertAccess($post->thread->section, $request->user());

        $result = $this->service->toggleVote($post, $request->user());

        return response()->json($result);
    }

    // ─── Instructor-only actions ──────────────────────────────────────────────

    /**
     * POST /api/v1/discuss/threads/{thread}/pin
     */
    public function pin(Request $request, DiscussionThread $thread): JsonResponse
    {
        $this->assertInstructor($thread->section, $request->user());

        $thread = $this->service->togglePin($thread);

        return response()->json(['is_pinned' => $thread->is_pinned]);
    }

    /**
     * POST /api/v1/discuss/threads/{thread}/lock
     */
    public function lock(Request $request, DiscussionThread $thread): JsonResponse
    {
        $this->assertInstructor($thread->section, $request->user());

        $thread = $this->service->toggleLock($thread);

        return response()->json(['is_locked' => $thread->is_locked]);
    }

    /**
     * POST /api/v1/discuss/posts/{post}/answer
     * Mark as instructor's accepted answer.
     */
    public function markAnswer(Request $request, DiscussionPost $post): JsonResponse
    {
        $this->assertInstructor($post->thread->section, $request->user());

        $post = $this->service->markAnswer($post);

        return response()->json([
            'is_instructor_answer' => $post->is_instructor_answer,
            'thread_resolved'      => $post->thread->fresh()->is_resolved,
        ]);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function assertAccess(Section $section, \App\Models\User $user): void
    {
        $isStaff = $section->instructor_id === $user->id
                || $section->teachingAssistants()->where('user_id', $user->id)->exists();

        if ($isStaff) return;

        $enrolled = Enrolment::where('student_id', $user->id)
            ->where('section_id', $section->id)
            ->where('status', 'enrolled')
            ->exists();

        if (! $enrolled) {
            abort(403, 'You do not have access to this section forum.');
        }
    }

    private function assertInstructor(Section $section, \App\Models\User $user): void
    {
        $isStaff = $section->instructor_id === $user->id
                || $section->teachingAssistants()->where('user_id', $user->id)->exists();

        if (! $isStaff) {
            abort(403, 'Only instructors can perform this action.');
        }
    }

    private function threadSummary(DiscussionThread $t): array
    {
        return [
            'id'               => $t->id,
            'title'            => $t->title,
            'type'             => $t->type,
            'is_pinned'        => $t->is_pinned,
            'is_locked'        => $t->is_locked,
            'is_resolved'      => $t->is_resolved,
            'replies_count'    => $t->replies_count,
            'last_activity_at' => $t->last_activity_at,
            'created_at'       => $t->created_at,
            'author'           => $t->relationLoaded('author') ? [
                'id'   => $t->author->id,
                'name' => $t->author->name,
            ] : null,
        ];
    }

    private function threadDetail(DiscussionThread $t): array
    {
        return array_merge($this->threadSummary($t), ['body' => $t->body]);
    }

    private function postData(DiscussionPost $p, $votedIds = null): array
    {
        $voted = $votedIds ? $votedIds->has($p->id) : false;

        $data = [
            'id'                   => $p->id,
            'body'                 => $p->body,
            'upvotes_count'        => $p->upvotes_count,
            'is_instructor_answer' => $p->is_instructor_answer,
            'has_voted'            => $voted,
            'created_at'           => $p->created_at,
            'author' => $p->relationLoaded('author') ? [
                'id'   => $p->author->id,
                'name' => $p->author->name,
            ] : null,
        ];

        if ($p->relationLoaded('replies')) {
            $data['replies'] = $p->replies->map(fn($r) => $this->postData($r));
        }

        return $data;
    }
}
