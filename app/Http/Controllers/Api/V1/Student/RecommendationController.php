<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Recommendation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RecommendationController extends Controller
{
    /**
     * GET /api/v1/student/recommendations
     * Returns active ML recommendations for the authenticated student,
     * sorted by score descending.
     */
    public function index(Request $request): JsonResponse
    {
        $student = Auth::user();

        $recs = Recommendation::with(['course.department'])
            ->where('student_id', $student->id)
            ->where('is_active', true)
            ->orderByDesc('score')
            ->limit(20)
            ->get();

        return response()->json([
            'recommendations' => $recs->map(fn($r) => [
                'id'     => $r->id,
                'score'  => round($r->score, 4),
                'reason' => $r->reason,
                'source' => $r->source,
                'course' => [
                    'id'           => $r->course->id,
                    'code'         => $r->course->code,
                    'title_en'     => $r->course->title_en,
                    'credit_hours' => $r->course->credit_hours,
                    'department'   => $r->course->department
                        ? ['id' => $r->course->department->id, 'name_en' => $r->course->department->name_en]
                        : null,
                ],
            ]),
        ]);
    }
}
