<?php

namespace App\Http\Controllers\Api\V1\Instructor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Announcement\StoreAnnouncementRequest;
use App\Models\Announcement;
use App\Models\Section;
use App\Services\AnnouncementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AnnouncementController (instructor side) — create and manage section announcements.
 *
 * Middleware: auth:sanctum + require.tenant + role:instructor,teaching_assistant
 */
class AnnouncementController extends Controller
{
    public function __construct(private readonly AnnouncementService $service) {}

    /**
     * GET /api/v1/instructor/sections/{section}/announcements
     * List all announcements (draft + published) for a section.
     */
    public function index(Request $request, Section $section): JsonResponse
    {
        $this->assertOwns($section, $request->user());

        $announcements = $section->announcements()
            ->withCount('reads')
            ->with('author')
            ->get();

        return response()->json([
            'announcements' => $announcements->map(fn(Announcement $a) => $this->format($a, true)),
        ]);
    }

    /**
     * POST /api/v1/instructor/sections/{section}/announcements
     * Create and optionally publish an announcement immediately.
     */
    public function store(StoreAnnouncementRequest $request, Section $section): JsonResponse
    {
        $this->assertOwns($section, $request->user());

        $announcement = $this->service->create(
            $section,
            $request->user(),
            $request->validated(),
            $request->boolean('publish_now', true)
        );

        return response()->json([
            'announcement' => $this->format($announcement->load('author')),
        ], 201);
    }

    /**
     * POST /api/v1/instructor/announcements/{announcement}/publish
     * Publish a draft announcement.
     */
    public function publish(Request $request, Announcement $announcement): JsonResponse
    {
        $this->assertOwns($announcement->section, $request->user());

        try {
            $announcement = $this->service->publish($announcement);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'announcement' => $this->format($announcement->load('author')),
        ]);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function format(Announcement $a, bool $withStats = false): array
    {
        $data = [
            'id'           => $a->id,
            'title'        => $a->title,
            'body'         => $a->body,
            'type'         => $a->type,
            'is_published' => $a->is_published,
            'published_at' => $a->published_at,
            'created_at'   => $a->created_at,
            'author'       => $a->relationLoaded('author') ? [
                'id'   => $a->author->id,
                'name' => $a->author->name,
            ] : null,
        ];

        if ($withStats) {
            $data['reads_count'] = $a->getAttribute('reads_count') ?? 0;
        }

        return $data;
    }

    private function assertOwns(Section $section, \App\Models\User $user): void
    {
        $owns = $section->instructor_id === $user->id
             || $section->teachingAssistants()->where('user_id', $user->id)->exists();

        if (! $owns) {
            abort(403, 'Access denied.');
        }
    }
}
