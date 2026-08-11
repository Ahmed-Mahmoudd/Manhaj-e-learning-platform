<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\Recommendation;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InternBApiTest extends TestCase
{
    use RefreshDatabase;

    private string $token = 'test-internal-secret';

    protected function setUp(): void
    {
        parent::setUp();
        // Set internal token in config for the test run
        config(['app.internal_api_token' => $this->token]);
    }

    private function scaffold(): array
    {
        $tenant  = Tenant::factory()->create();
        $student = User::factory()->forTenant($tenant)->student()->create();
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $course  = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        return compact('tenant', 'student', 'course');
    }

    private function h(Tenant $t): array { return ['X-Tenant-ID' => $t->id]; }

    // ─── ML ingest ────────────────────────────────────────────────────────────

    #[Test]
    public function ml_ingest_requires_valid_token(): void
    {
        $this->postJson('/api/v1/internal/ml/recommendations', [], ['X-Internal-Token' => 'wrong'])
             ->assertUnauthorized();
    }

    #[Test]
    public function ml_ingest_rejects_missing_token(): void
    {
        $this->postJson('/api/v1/internal/ml/recommendations', [])
             ->assertUnauthorized();
    }

    #[Test]
    public function ml_ingest_creates_recommendations(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'course' => $course] = $this->scaffold();

        $this->postJson('/api/v1/internal/ml/recommendations', [
            'tenant_id' => $tenant->id,
            'recommendations' => [
                [
                    'student_id' => $student->id,
                    'course_id'  => $course->id,
                    'score'      => 0.92,
                    'reason'     => 'High match based on activity',
                ],
            ],
        ], ['X-Internal-Token' => $this->token])
             ->assertCreated()
             ->assertJsonPath('upserted', 1);

        $this->assertDatabaseHas('recommendations', [
            'student_id' => $student->id,
            'course_id'  => $course->id,
            'source'     => 'ml',
        ]);
    }

    #[Test]
    public function ml_ingest_upserts_existing_recommendation(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'course' => $course] = $this->scaffold();

        $payload = [
            'tenant_id' => $tenant->id,
            'recommendations' => [[
                'student_id' => $student->id,
                'course_id'  => $course->id,
                'score'      => 0.5,
                'reason'     => 'Initial',
            ]],
        ];

        $this->postJson('/api/v1/internal/ml/recommendations', $payload, ['X-Internal-Token' => $this->token]);

        // Second ingest with updated score
        $payload['recommendations'][0]['score'] = 0.95;
        $payload['recommendations'][0]['reason'] = 'Updated';

        $this->postJson('/api/v1/internal/ml/recommendations', $payload, ['X-Internal-Token' => $this->token])
             ->assertCreated();

        // Should still be 1 record (upserted)
        $this->assertDatabaseCount('recommendations', 1);
        $this->assertDatabaseHas('recommendations', ['score' => 0.95]);
    }

    #[Test]
    public function ml_ingest_validates_score_range(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'course' => $course] = $this->scaffold();

        $this->postJson('/api/v1/internal/ml/recommendations', [
            'tenant_id' => $tenant->id,
            'recommendations' => [[
                'student_id' => $student->id,
                'course_id'  => $course->id,
                'score'      => 1.5, // out of range
            ]],
        ], ['X-Internal-Token' => $this->token])
             ->assertUnprocessable();
    }

    // ─── Webhook ──────────────────────────────────────────────────────────────

    #[Test]
    public function webhook_acknowledges_events(): void
    {
        $this->postJson('/api/v1/internal/webhook', [
            'event'   => 'model.retrained',
            'payload' => ['version' => '2.1.0', 'accuracy' => 0.87],
        ], ['X-Internal-Token' => $this->token])
             ->assertOk()
             ->assertJsonPath('message', "Event 'model.retrained' received.");
    }

    // ─── Student recommendations endpoint ─────────────────────────────────────

    #[Test]
    public function student_can_view_their_recommendations(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'course' => $course] = $this->scaffold();

        Recommendation::create([
            'tenant_id'  => $tenant->id,
            'student_id' => $student->id,
            'course_id'  => $course->id,
            'score'      => 0.88,
            'source'     => 'ml',
            'is_active'  => true,
        ]);

        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/student/recommendations')
             ->assertOk()
             ->assertJsonCount(1, 'recommendations')
             ->assertJsonPath('recommendations.0.score', 0.88);
    }

    #[Test]
    public function student_only_sees_active_recommendations(): void
    {
        ['tenant' => $tenant, 'student' => $student, 'course' => $course] = $this->scaffold();

        Recommendation::create([
            'tenant_id'  => $tenant->id, 'student_id' => $student->id,
            'course_id'  => $course->id, 'score' => 0.9,
            'source' => 'ml', 'is_active' => false,
        ]);

        $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/student/recommendations')
             ->assertOk()
             ->assertJsonCount(0, 'recommendations');
    }

    #[Test]
    public function recommendations_are_sorted_by_score_descending(): void
    {
        ['tenant' => $tenant, 'student' => $student] = $this->scaffold();
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $course2 = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $course1 = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);

        foreach ([[$course1->id, 0.6], [$course2->id, 0.95]] as [$cid, $score]) {
            Recommendation::create([
                'tenant_id' => $tenant->id, 'student_id' => $student->id,
                'course_id' => $cid, 'score' => $score,
                'source' => 'ml', 'is_active' => true,
            ]);
        }

        $resp = $this->actingAs($student, 'sanctum')->withHeaders($this->h($tenant))
                     ->getJson('/api/v1/student/recommendations')
                     ->assertOk();

        $scores = collect($resp->json('recommendations'))->pluck('score');
        $this->assertEquals($scores->sortDesc()->values()->all(), $scores->values()->all());
    }

    #[Test]
    public function non_student_cannot_access_recommendations(): void
    {
        ['tenant' => $tenant] = $this->scaffold();
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();

        $this->actingAs($instructor, 'sanctum')->withHeaders($this->h($tenant))
             ->getJson('/api/v1/student/recommendations')
             ->assertForbidden();
    }
}
