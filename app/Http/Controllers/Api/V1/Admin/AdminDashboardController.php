<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function __construct(private readonly AdminDashboardService $service) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isUniversityAdmin()) {
            return response()->json([
                'scope'  => 'university',
                'stats'  => $this->service->universityStats(),
            ]);
        }

        if ($user->isFacultyAdmin()) {
            if (! $user->faculty_id) {
                return response()->json(['message' => 'Faculty admin has no faculty assigned.'], 403);
            }

            return response()->json([
                'scope'  => 'faculty',
                'stats'  => $this->service->facultyStats((int) $user->faculty_id),
            ]);
        }

        abort(403);
    }

    public function departments(Request $request): JsonResponse
    {
        $user = $request->user();
        $facultyId = $this->resolveFacultyScope($user, $request);

        return response()->json(
            $this->service->departmentAnalytics($facultyId)
        );
    }

    public function grades(Request $request): JsonResponse
    {
        $user = $request->user();
        $facultyId = $this->resolveFacultyScope($user, $request);

        return response()->json(
            $this->service->gradeAnalytics($facultyId)
        );
    }

    public function export(Request $request)
    {
        $user = $request->user();
        $facultyId = $this->resolveFacultyScope($user, $request);
        $type = $request->string('type', 'departments')->value();

        $csv = $this->service->exportCsv($type, $facultyId);
        $filename = sprintf('manhaj-%s-report-%s.csv', $type, now()->format('Y-m-d'));

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    private function resolveFacultyScope(\App\Models\User $user, Request $request): ?int
    {
        if ($user->isUniversityAdmin() || $user->isPlatformAdmin()) {
            return $request->filled('faculty_id') ? $request->integer('faculty_id') : null;
        }

        if ($user->isFacultyAdmin()) {
            if (! $user->faculty_id) {
                abort(403, 'Faculty admin has no faculty assigned.');
            }
            return (int) $user->faculty_id;
        }

        abort(403);
    }
}

