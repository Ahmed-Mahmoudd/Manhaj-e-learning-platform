<?php

namespace App\Http\Controllers\Api\V1\Internal;

use App\Http\Controllers\Controller;
use App\Http\Requests\MlRecommendation\IngestRecommendationsRequest;
use App\Http\Requests\MlRecommendation\WebhookRequest;
use App\Models\Recommendation;
use Illuminate\Http\JsonResponse;

/**
 * Internal endpoint consumed by the INTERN B FastAPI ML service.
 * Protected by a shared secret header (X-Internal-Token) instead of Sanctum.
 */
class MlRecommendationController extends Controller
{
    /**
     * POST /api/v1/internal/ml/recommendations
     *
     * Expected payload:
     * {
     *   "tenant_id": 1,
     *   "recommendations": [
     *     { "student_id": 5, "course_id": 12, "score": 0.92, "reason": "Matches past activity" },
     *     ...
     *   ]
     * }
     */
    public function ingest(IngestRecommendationsRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $tenantId = $validated['tenant_id'];
        $upserted = 0;

        foreach ($validated['recommendations'] as $rec) {
            Recommendation::updateOrCreate(
                [
                    'tenant_id'  => $tenantId,
                    'student_id' => $rec['student_id'],
                    'course_id'  => $rec['course_id'],
                    'source'     => 'ml',
                ],
                [
                    'score'     => $rec['score'],
                    'reason'    => $rec['reason'] ?? null,
                    'is_active' => true,
                ]
            );
            $upserted++;
        }

        return response()->json([
            'message'  => "Ingested {$upserted} recommendations for tenant {$tenantId}.",
            'upserted' => $upserted,
        ], 201);
    }

    /**
     * POST /api/v1/internal/webhook
     * Generic event webhook from INTERN B — log and acknowledge.
     */
    public function webhook(WebhookRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // For now: acknowledge. Future: dispatch event-specific jobs.
        \Illuminate\Support\Facades\Log::info('[INTERN-B webhook]', [
            'event'   => $validated['event'],
            'payload' => $validated['payload'] ?? [],
        ]);

        return response()->json(['message' => "Event '{$validated['event']}' received."], 200);
    }
}
