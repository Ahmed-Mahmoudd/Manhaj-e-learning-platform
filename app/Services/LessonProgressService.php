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
     * @param  int       $secondsSpent  Total seconds spent (cumulative, not delta)
     * @param  int|null  $progressPct   Client hint for lessons without duration_seconds (text/PDF/link)
     */
    public function updateProgress(
        User $user,
        Lesson $lesson,
        int $secondsSpent,
        ?int $progressPct = null,
    ): LessonProgress {
        $progress = $this->recordView($user, $lesson);

        if ($lesson->isVideo()) {
            // Video: position-based — progress follows the scrubber (can go up or down).
            $secondsSpent = max(0, $secondsSpent);

            if ($progressPct !== null) {
                $finalPct = max(0, min(100, $progressPct));
                if ($finalPct >= 100 && $lesson->duration_seconds > 0) {
                    $secondsSpent = $lesson->duration_seconds;
                }
            } elseif ($lesson->duration_seconds > 0) {
                $finalPct = (int) min(100, round($secondsSpent / $lesson->duration_seconds * 100));
            } else {
                $finalPct = $progress->progress_pct;
            }
        } else {
            $secondsSpent = max($progress->seconds_spent, $secondsSpent);

            if ($lesson->duration_seconds > 0) {
                $computedPct = (int) min(100, round($secondsSpent / $lesson->duration_seconds * 100));
            } elseif ($progressPct !== null) {
                $computedPct = max(0, min(100, $progressPct));
            } else {
                $computedPct = $progress->progress_pct;
            }

            $finalPct = max($progress->progress_pct, $computedPct);
        }

        $data = [
            'seconds_spent' => $secondsSpent,
            'progress_pct'  => $finalPct,
        ];

        // Auto-complete when progress reaches 100%
        if ($finalPct >= 100 && $progress->completed_at === null) {
            $data['completed_at'] = now();
        }

        $progress->update($data);

        return $progress->fresh();
    }

    /**
     * Reset lesson progress to zero so the student can start again.
     */
    public function resetProgress(User $user, Lesson $lesson): LessonProgress
    {
        $progress = $this->recordView($user, $lesson);

        $progress->update([
            'seconds_spent' => 0,
            'progress_pct'  => 0,
            'completed_at'  => null,
        ]);

        return $progress->fresh();
    }

    /**
     * Mark a lesson as manually completed (e.g. text/PDF/link lessons).
     * For these types, there is no percentage — the student marks it done.
     */
    public function markComplete(User $user, Lesson $lesson): LessonProgress
    {
        $seconds = ($lesson->isVideo() && $lesson->duration_seconds > 0)
            ? $lesson->duration_seconds
            : 0;

        return $this->updateProgress($user, $lesson, $seconds, 100);
    }

    /**
     * Overall course completion for a student.
     *
     * Formula: average of each published lesson's progress_pct (equal weight per lesson).
     * Lessons with no progress record count as 0%. Partial video/text progress therefore
     * moves the course bar proportionally — not only fully-completed lessons.
     *
     * Returns a float 0.0–100.0
     */
    public function courseCompletionPct(User $user, int $courseId): float
    {
        $lessonIds = Lesson::withoutGlobalScope('tenant')
            ->whereHas('module', fn ($q) => $q->where('course_id', $courseId)->where('is_published', true))
            ->where('is_published', true)
            ->pluck('id');

        if ($lessonIds->isEmpty()) {
            return 0.0;
        }

        $progressByLesson = LessonProgress::withoutGlobalScope('tenant')
            ->where('user_id', $user->id)
            ->whereIn('lesson_id', $lessonIds)
            ->pluck('progress_pct', 'lesson_id');

        $sum = $lessonIds->sum(fn ($lessonId) => (int) ($progressByLesson[$lessonId] ?? 0));

        return round($sum / $lessonIds->count(), 1);
    }
}
