<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\Enrolment;
use App\Models\Section;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * AnnouncementService — all announcement business logic.
 *
 * Responsibilities:
 *   - Create a draft or publish-immediately announcement
 *   - Publish a draft
 *   - Mark an announcement as read by a student
 *   - Fetch a student's unread count across all their sections
 *   - Fetch all published announcements for a student (with read status)
 */
class AnnouncementService
{
    /**
     * Create a new announcement for a section.
     * If $publishNow is true, set is_published=true and published_at=now().
     */
    public function create(
        Section $section,
        User    $author,
        array   $data,
        bool    $publishNow = true
    ): Announcement {
        return Announcement::create([
            'tenant_id'    => $section->tenant_id,
            'section_id'   => $section->id,
            'author_id'    => $author->id,
            'type'         => $data['type'] ?? 'general',
            'title'        => $data['title'],
            'body'         => $data['body'],
            'is_published' => $publishNow,
            'published_at' => $publishNow ? now() : null,
        ]);
    }

    /**
     * Publish a draft announcement.
     *
     * @throws \RuntimeException if already published
     */
    public function publish(Announcement $announcement): Announcement
    {
        if ($announcement->is_published) {
            throw new \RuntimeException('Announcement is already published.');
        }

        $announcement->update([
            'is_published' => true,
            'published_at' => now(),
        ]);

        return $announcement->fresh();
    }

    /**
     * Mark an announcement as read by the given student.
     * Idempotent — does nothing if already read.
     */
    public function markRead(Announcement $announcement, User $student): AnnouncementRead
    {
        return AnnouncementRead::firstOrCreate(
            [
                'announcement_id' => $announcement->id,
                'user_id'         => $student->id,
            ],
            ['read_at' => now()]
        );
    }

    /**
     * Get all published announcements for a student's enrolled sections,
     * newest first, with a `is_read` boolean for each.
     *
     * @return Collection<Announcement>
     */
    public function forStudent(User $student): Collection
    {
        // Get all section IDs the student is actively enrolled in
        $sectionIds = Enrolment::where('student_id', $student->id)
            ->where('status', 'enrolled')
            ->pluck('section_id');

        // Get all published announcements for those sections
        $announcements = Announcement::withoutGlobalScope('tenant')
            ->whereIn('section_id', $sectionIds)
            ->where('is_published', true)
            ->with(['author', 'section.course'])
            ->latest('published_at')
            ->get();

        // Load read records for this student in one query
        $readIds = AnnouncementRead::where('user_id', $student->id)
            ->whereIn('announcement_id', $announcements->pluck('id'))
            ->pluck('announcement_id')
            ->flip();

        return $announcements->map(function (Announcement $a) use ($readIds) {
            $a->setAttribute('is_read', $readIds->has($a->id));
            return $a;
        });
    }

    /**
     * Count unread announcements for a student across all enrolled sections.
     */
    public function unreadCount(User $student): int
    {
        $sectionIds = Enrolment::where('student_id', $student->id)
            ->where('status', 'enrolled')
            ->pluck('section_id');

        $allPublishedIds = Announcement::withoutGlobalScope('tenant')
            ->whereIn('section_id', $sectionIds)
            ->where('is_published', true)
            ->pluck('id');

        $readCount = AnnouncementRead::where('user_id', $student->id)
            ->whereIn('announcement_id', $allPublishedIds)
            ->count();

        return max(0, $allPublishedIds->count() - $readCount);
    }
}
