<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Services\AnnouncementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * StudentAnnouncementController — student's view of their announcements.
 *
 * Students only see published announcements for sections they are enrolled in.
 * Middleware: auth:sanctum + require.tenant + role:student
 */
class StudentAnnouncementController extends Controller
{
    public function __construct(private readonly AnnouncementService $service) {}

    /**
     * GET /api/v1/student/announcements
     *
     * Returns all published announcements across enrolled sections,
     * newest first, with is_read flag and unread_count summary.
     */
    public function index(Request $request): JsonResponse
    {
        $student       = $request->user();
        $announcements = $this->service->forStudent($student);
        $unreadCount   = $this->service->unreadCount($student);

        return response()->json([
            'unread_count'  => $unreadCount,
            'announcements' => $announcements->map(fn(Announcement $a) => [
                'id'           => $a->id,
                'title'        => $a->title,
                'body'         => $a->body,
                'type'         => $a->type,
                'is_read'      => $a->getAttribute('is_read'),
                'published_at' => $a->published_at,
                'author' => [
                    'id'   => $a->author->id,
                    'name' => $a->author->name,
                ],
                'section' => [
                    'id'          => $a->section->id,
                    'course_code' => $a->section->course->code,
                ],
            ]),
        ]);
    }

    /**
     * POST /api/v1/student/announcements/{announcement}/read
     *
     * Mark a specific announcement as read by the authenticated student.
     * Idempotent — returns 200 even if already read.
     */
    public function markRead(Request $request, Announcement $announcement): JsonResponse
    {
        // Verify the announcement is published
        if (! $announcement->is_published) {
            return response()->json(['message' => 'Announcement not found.'], 404);
        }

        $this->service->markRead($announcement, $request->user());

        return response()->json([
            'message'         => 'Marked as read.',
            'announcement_id' => $announcement->id,
            'unread_count'    => $this->service->unreadCount($request->user()),
        ]);
    }
}
