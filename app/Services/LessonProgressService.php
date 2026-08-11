<?php

namespace App\Services;

use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\User;

/**
 * LessonProgressService — tracks how far a student has progressed through a lesson.
 *
 * WHY a service?
 *   Progress tracking has rules: completion threshold, seconds accumulation,
 *   idempotent "view" recording. Controllers should not own these decisions.
 *
 * All methods are safe to call multiple times (idempotent).
 */
class LessonProgressService
{
    /**
     * Record that a user viewed/opened a lesson.
     * Creates the progress record if it doesn't exist.
     * Updates last_accessed_at each call.
     */
    public function recordView(User $user, Lesson $lesson): LessonProgress
    {
        /** @var LessonProgress $progress */
        $progress = LessonProgress::withoutGlobalScope('tenant')
            ->firstOrCreate(
                ['user_id' => $user->id, 'lesson_id' => $lesson->id],
                [
                    'tenant_id'        => $lesson->tenant_id,
                    'seconds_spent'    => 0,
                    'progress_pct'     => 0,
                    'last_accessed_at' => now(),
                ]
            );

        // Always update last_accessed_at on each view
        $progress->update(['last_accessed_at' => now()]);

        return $progress;
    }

    /**
     * Update video/content progress.
     *
     * @param  int  $secondsSpent  Total seconds spent (cumulative, not delta)
     * @param  int  $progressPct   0–100 percentage watched/read
     */
    public function updateProgress(
        User $user,
        Lesson $lesson,
        int $secondsSpent,
        int $progressPct
    ): LessonProgress {
        $progressPct = max(0, min(100, $progressPct)); // clamp 0-100

        $progress = $this->recordView($user, $lesson);

        $data = [
            'seconds_spent' => max($progress->seconds_spent, $secondsSpent), // never go backwards
            'progress_pct'  => max($progress->progress_pct, $progressPct),   // never go backwards
        ];

        // Auto-complete when progress reaches 100%
        if ($progressPct >= 100 && $progress->completed_at === null) {
            $data['completed_at'] = now();
        }

        $progress->update($data);

        return $progress->fresh();
    }

    /**
     * Mark a lesson as manually completed (e.g. text/PDF/link lessons).
     * For these types, there is no percentage — the student marks it done.
     */
    public function markComplete(User $user, Lesson $lesson): LessonProgress
    {
        return $this->updateProgress($user, $lesson, 0, 100);
    }

    /**
     * Calculate the overall completion percentage for a course section's content
     * for a given user — how many published lessons have been completed.
     *
     * Returns a float 0.0–100.0
     */
    public function courseCompletionPct(User $user, int $courseId): float
    {
        // All published lessons in this course
        $total = Lesson::withoutGlobalScope('tenant')
            ->whereHas('module', fn($q) => $q->where('course_id', $courseId)->where('is_published', true))
            ->where('is_published', true)
            ->count();

        if ($total === 0) {
            return 0.0;
        }

        $completed = LessonProgress::withoutGlobalScope('tenant')
            ->where('user_id', $user->id)
            ->whereNotNull('completed_at')
            ->whereHas('lesson', fn($q) =>
                $q->where('is_published', true)
                  ->whereHas('module', fn($q2) => $q2->where('course_id', $courseId))
            )
            ->count();

        return round(($completed / $total) * 100, 1);
    }
}
