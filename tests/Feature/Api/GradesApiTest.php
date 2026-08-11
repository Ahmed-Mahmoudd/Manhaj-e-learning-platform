<?php

namespace Tests\Feature\Api;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\GradeItem;
use App\Models\Section;
use App\Models\StudentGrade;
use App\Models\Tenant;
use App\Models\User;
use App\Services\GradeService;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GradesApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    // ─── Shared setup ─────────────────────────────────────────────────────────

    private function scaffold(): array
    {
        $tenant     = Tenant::factory()->create();
        $faculty    = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept       = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $term       = AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);
        $course     = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $instructor = User::factory()->forTenant($tenant)->instructor()->create();
        $section    = Section::factory()->create([
            'tenant_id'        => $tenant->id,
            'course_id'        => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $instructor->id,
            'capacity'         => 30,
        ]);
        $student = User::factory()->forTenant($tenant)->student()->create();
        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'student_id'  => $student->id,
            'section_id'  => $section->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        return compact('tenant', 'instructor', 'section', 'student', 'course');
    }

    private function headers(Tenant $tenant): array
    {
        return ['X-Tenant-ID' => $tenant->id];
    }

    // ─── GradeService unit tests ──────────────────────────────────────────────

    #[Test]
    public function enter_grade_creates_record(): void
    {
        ['tenant' => $tenant, 'section' => $section, 'instructor' => $instructor, 'student' => $student] =
            $this->scaffold();

        $item = GradeItem::create([
            'tenant_id'  => $tenant->id,
            'section_id' => $section->id,
            'name'       => 'Midterm',
            'type'       => 'midterm',
            'max_score'  => 100,
        ]);

        $service = app(GradeService::class);
        $grade   = $service->enterGrade($item, $student, 85.0, $instructor, 'Good work');

        $this->assertEquals(85.0, $grade->score);
        $this->assertEquals('Good work', $grade->feedback);
        $this->assertFalse($grade->is_published);
        $this->assertDatabaseHas('student_grades', [
            'grade_item_id' => $item->id,
            'student_id'    => $student->id,
            'score'         => 85.0,
        ]);
    }

    #[Test]
    public function enter_grade_throws_if_score_exceeds_max(): void
    {
        ['tenant' => $tenant, 'section' => $section, 'instructor' => $instructor, 'student' => $student] =
            $this->scaffold();

        $item = GradeItem::create([
            'tenant_id'  => $tenant->id,
            'section_id' => $section->id,
            'name'       => 'Quiz 1',
            'type'       => 'quiz',
            'max_score'  => 20,
        ]);

        $this->expectException(\InvalidArgumentException::class);
        app(GradeService::class)->enterGrade($item, $student, 25.0, $instructor);
    }

    #[Test]
    public function enter_grade_is_idempotent_upsert(): void
    {
        ['tenant' => $tenant, 'section' => $section, 'instructor' => $instructor, 'student' => $student] =
            $this->scaffold();

        $item = GradeItem::create([
            'tenant_id'  => $tenant->id,
            'section_id' => $section->id,
            'name'       => 'Assignment 1',
            'type'       => 'assignment',
            'max_score'  => 50,
        ]);

        $service = app(GradeService::class);
        $service->enterGrade($item, $student, 40.0, $instructor);
        $service->enterGrade($item, $student, 45.0, $instructor, 'Revised');

        $this->assertDatabaseCount('student_grades', 1);
        $this->assertDatabaseHas('student_grades', ['score' => 45.0]);
    }

    #[Test]
    public function publish_grade_item_marks_grades_visible(): void
    {
        ['tenant' => $tenant, 'section' => $section, 'instructor' => $instructor, 'student' => $student] =
            $this->scaffold();

        $item = GradeItem::create([
            'tenant_id'  => $tenant->id,
            'section_id' => $section->id,
            'name'       => 'Final',
            'type'       => 'final',
            'max_score'  => 100,
        ]);

        $service = app(GradeService::class);
        $service->enterGrade($item, $student, 78.0, $instructor);
        $service->publishGradeItem($item);

        $this->assertDatabaseHas('student_grades', ['is_published' => true]);
        $this->assertTrue($item->fresh()->is_published);
    }

    #[Test]
    public function weighted_section_grade_calculates_correctly(): void
    {
        ['tenant' => $tenant, 'section' => $section, 'instructor' => $instructor, 'student' => $student] =
            $this->scaffold();

        $service = app(GradeService::class);

        // Midterm: weight 40%, score 80/100 → 80%  → contributes 32
        $midterm = GradeItem::create([
            'tenant_id'  => $tenant->id, 'section_id' => $section->id,
            'name'       => 'Midterm', 'type' => 'midterm',
            'max_score'  => 100, 'weight' => 40, 'is_published' => true,
        ]);
        $g1 = $service->enterGrade($midterm, $student, 80.0, $instructor);
        $g1->update(['is_published' => true]);

        // Final: weight 60%, score 90/100 → 90% → contributes 54
        $final = GradeItem::create([
            'tenant_id'  => $tenant->id, 'section_id' => $section->id,
            'name'       => 'Final', 'type' => 'final',
            'max_score'  => 100, 'weight' => 60, 'is_published' => true,
        ]);
        $g2 = $service->enterGrade($final, $student, 90.0, $instructor);
        $g2->update(['is_published' => true]);

        // Expected: (80*40 + 90*60) / (40+60) = (3200+5400)/100 = 86 → B
        $summary = $service->sectionGradeSummary($student, $section);

        $this->assertEquals(86.0, $summary['percentage']);
        $this->assertEquals('B', $summary['letter']);
        $this->assertEquals(2, $summary['items_graded']);
    }

    #[Test]
    public function letter_grade_mapping_is_correct(): void
    {
        $service = app(GradeService::class);

        $this->assertEquals('A',  $service->percentageToLetter(95));
        $this->assertEquals('A-', $service->percentageToLetter(90));
        $this->assertEquals('B+', $service->percentageToLetter(88));
        $this->assertEquals('B',  $service->percentageToLetter(83));
        $this->assertEquals('F',  $service->percentageToLetter(55));
    }

    // ─── Instructor API tests ──────────────────────────────────────────────────

    #[Test]
    public function instructor_can_create_grade_item(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section] = $this->scaffold();

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/sections/{$section->id}/grade-items", [
                 'name'      => 'Midterm Exam',
                 'type'      => 'midterm',
                 'max_score' => 100,
                 'weight'    => 40,
             ])
             ->assertCreated()
             ->assertJsonPath('grade_item.name', 'Midterm Exam')
             ->assertJsonPath('grade_item.type', 'midterm');
    }

    #[Test]
    public function grade_item_creation_validates_type(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section] = $this->scaffold();

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/sections/{$section->id}/grade-items", [
                 'name'      => 'Mystery',
                 'type'      => 'invalid_type',
                 'max_score' => 100,
             ])
             ->assertUnprocessable()
             ->assertJsonValidationErrors(['type']);
    }

    #[Test]
    public function instructor_can_enter_and_view_grades(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section, 'student' => $student] =
            $this->scaffold();

        $item = GradeItem::create([
            'tenant_id'  => $tenant->id, 'section_id' => $section->id,
            'name'       => 'Quiz 1', 'type' => 'quiz', 'max_score' => 20,
        ]);

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/grade-items/{$item->id}/grades/{$student->id}", [
                 'score'    => 18,
                 'feedback' => 'Well done!',
             ])
             ->assertOk()
             ->assertJsonPath('grade.score', 18)
             ->assertJsonPath('grade.score_pct', 90)
             ->assertJsonPath('grade.letter', 'A-');
    }

    #[Test]
    public function instructor_can_publish_grade_item(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section, 'student' => $student] =
            $this->scaffold();

        $item = GradeItem::create([
            'tenant_id'  => $tenant->id, 'section_id' => $section->id,
            'name'       => 'Assignment 1', 'type' => 'assignment', 'max_score' => 100,
        ]);

        StudentGrade::create([
            'tenant_id'     => $tenant->id,
            'grade_item_id' => $item->id,
            'student_id'    => $student->id,
            'graded_by'     => $instructor->id,
            'score'         => 90,
            'graded_at'     => now(),
        ]);

        $this->actingAs($instructor, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/grade-items/{$item->id}/publish")
             ->assertOk()
             ->assertJsonPath('is_published', true)
             ->assertJsonPath('grades_updated', 1);
    }

    #[Test]
    public function other_instructor_cannot_enter_grades(): void
    {
        ['tenant' => $tenant, 'section' => $section, 'student' => $student] = $this->scaffold();

        $outsider = User::factory()->forTenant($tenant)->instructor()->create();
        $item     = GradeItem::create([
            'tenant_id'  => $tenant->id, 'section_id' => $section->id,
            'name'       => 'Final', 'type' => 'final', 'max_score' => 100,
        ]);

        $this->actingAs($outsider, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->postJson("/api/v1/instructor/grade-items/{$item->id}/grades/{$student->id}", ['score' => 70])
             ->assertForbidden();
    }

    // ─── Student API tests ────────────────────────────────────────────────────

    #[Test]
    public function student_can_view_published_grades(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section, 'student' => $student] =
            $this->scaffold();

        $item = GradeItem::create([
            'tenant_id'  => $tenant->id, 'section_id' => $section->id,
            'name'       => 'Midterm', 'type' => 'midterm',
            'max_score'  => 100, 'weight' => 50, 'is_published' => true,
        ]);

        StudentGrade::create([
            'tenant_id'     => $tenant->id,
            'grade_item_id' => $item->id,
            'student_id'    => $student->id,
            'graded_by'     => $instructor->id,
            'score'         => 88,
            'is_published'  => true,
            'graded_at'     => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->getJson('/api/v1/student/grades')
             ->assertOk()
             ->assertJsonCount(1, 'grades')
             ->assertJsonCount(1, 'grades.0.items')
             ->assertJsonPath('grades.0.items.0.score', 88)
             ->assertJsonPath('grades.0.items.0.letter', 'B+');
    }

    #[Test]
    public function student_cannot_see_unpublished_grades(): void
    {
        ['tenant' => $tenant, 'instructor' => $instructor, 'section' => $section, 'student' => $student] =
            $this->scaffold();

        $item = GradeItem::create([
            'tenant_id'  => $tenant->id, 'section_id' => $section->id,
            'name'       => 'Secret Quiz', 'type' => 'quiz',
            'max_score'  => 100, 'is_published' => false,
        ]);

        StudentGrade::create([
            'tenant_id'     => $tenant->id,
            'grade_item_id' => $item->id,
            'student_id'    => $student->id,
            'graded_by'     => $instructor->id,
            'score'         => 95,
            'is_published'  => false,  // NOT published
            'graded_at'     => now(),
        ]);

        $this->actingAs($student, 'sanctum')
             ->withHeaders($this->headers($tenant))
             ->getJson('/api/v1/student/grades')
             ->assertOk()
             ->assertJsonCount(0, 'grades.0.items'); // nothing visible
    }
}
