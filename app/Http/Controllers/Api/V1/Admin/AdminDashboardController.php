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
}
