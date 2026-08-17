<?php

namespace App\Services;

use App\Models\DiscussionPost;
use App\Models\DiscussionPostVote;
use App\Models\DiscussionThread;
use App\Models\Section;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * DiscussionService — all forum business logic.
 *
 * Responsibilities:
 *   - Create a thread
 *   - Reply to a thread (or nest under a post)
 *   - Pin / unpin a thread (instructor only)
 *   - Lock / unlock a thread (instructor only)
 *   - Mark a post as the instructor's answer
 *   - Resolve a question thread
 *   - Upvote / un-upvote a post (toggle)
 */
class DiscussionService
{
    /**
     * Create a new thread in a section.
     */
    public function createThread(Section $section, User $author, array $data): DiscussionThread
    {
        return DiscussionThread::create([
            'tenant_id'        => $section->tenant_id,
            'section_id'       => $section->id,
            'author_id'        => $author->id,
            'type'             => $data['type'] ?? 'general',
            'title'            => $data['title'],
            'body'             => $data['body'],
            'last_activity_at' => now(),
        ]);
    }

    /**
     * Add a reply to a thread.
     *
     * @throws \RuntimeException if thread is locked
     */
    public function reply(
        DiscussionThread $thread,
        User             $author,
        string           $body,
        ?int             $parentPostId = null
    ): DiscussionPost {
        if ($thread->is_locked) {
            throw new \RuntimeException('This thread is locked and no longer accepts replies.');
        }

        return DB::transaction(function () use ($thread, $author, $body, $parentPostId) {
            $post = DiscussionPost::create([
                'tenant_id'      => $thread->tenant_id,
                'thread_id'      => $thread->id,
                'author_id'      => $author->id,
                'parent_post_id' => $parentPostId,
                'body'           => $body,
            ]);

            $thread->touchActivity();

            return $post;
        });
    }

    /**
     * Edit the body of a post.
     *
     * @throws \RuntimeException if the user is not the author, or the post is deleted
     */
    public function updatePost(DiscussionPost $post, User $user, string $body): DiscussionPost
    {
        if ($post->author_id !== $user->id) {
            throw new \RuntimeException('You can only edit your own posts.');
        }

        if ($post->trashed()) {
            throw new \RuntimeException('This post has been deleted.');
        }

        $post->update(['body' => $body]);

        return $post;
    }

    /**
     * Soft-delete a post. Replies are preserved (not cascaded) since the
     * row stays — only its content is hidden from the API response.
     *
     * @throws \RuntimeException if the user is not the author
     */
    public function deletePost(DiscussionPost $post, User $user): void
    {
        if ($post->author_id !== $user->id) {
            throw new \RuntimeException('You can only delete your own posts.');
        }

        DB::transaction(function () use ($post) {
            $post->delete();
            $post->thread->decrement('replies_count');
        });
    }

    /**
     * Toggle pin state on a thread.
     */
    public function togglePin(DiscussionThread $thread): DiscussionThread
    {
        $thread->update(['is_pinned' => ! $thread->is_pinned]);
        return $thread->fresh();
    }

    /**
     * Toggle lock state on a thread.
     */
    public function toggleLock(DiscussionThread $thread): DiscussionThread
    {
        $thread->update(['is_locked' => ! $thread->is_locked]);
        return $thread->fresh();
    }

    /**
     * Mark a post as the instructor's accepted answer (for question threads).
     * Unmarks any previously marked answer on the same thread.
     */
    public function markAnswer(DiscussionPost $post): DiscussionPost
    {
        return DB::transaction(function () use ($post) {
            // Unmark previous answer on this thread
            DiscussionPost::where('thread_id', $post->thread_id)
                ->where('is_instructor_answer', true)
                ->update(['is_instructor_answer' => false]);

            $post->update(['is_instructor_answer' => true]);

            // Auto-resolve the thread
            $post->thread->update(['is_resolved' => true]);

            return $post->fresh();
        });
    }

    /**
     * Toggle upvote on a post.
     * Returns ['voted' => bool, 'upvotes_count' => int].
     */
    public function toggleVote(DiscussionPost $post, User $user): array
    {
        $existing = DiscussionPostVote::where('post_id', $post->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            $existing->delete();
            $post->decrement('upvotes_count');
            return ['voted' => false, 'upvotes_count' => $post->fresh()->upvotes_count];
        }

        DiscussionPostVote::create([
            'post_id'  => $post->id,
            'user_id'  => $user->id,
            'voted_at' => now(),
        ]);
        $post->increment('upvotes_count');

        return ['voted' => true, 'upvotes_count' => $post->fresh()->upvotes_count];
    }
}
