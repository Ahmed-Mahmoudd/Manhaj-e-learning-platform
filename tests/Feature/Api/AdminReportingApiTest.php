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
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AdminReportingApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    private function setupUniversityData(): array
    {
        $tenant   = Tenant::factory()->create();
        $uniAdmin = User::factory()->forTenant($tenant)->universityAdmin()->create();

        $faculty1 = Faculty::factory()->create(['tenant_id' => $tenant->id, 'name_en' => 'Faculty of Science']);
        $faculty2 = Faculty::factory()->create(['tenant_id' => $tenant->id, 'name_en' => 'Faculty of Engineering']);

        $facAdmin1 = User::factory()->forTenant($tenant)->facultyAdmin()->create(['faculty_id' => $faculty1->id]);

        $dept1 = Department::factory()->create([
            'tenant_id'  => $tenant->id,
            'faculty_id' => $faculty1->id,
            'name_en'    => 'Computer Science',
            'name_ar'    => 'علوم الحاسب',
        ]);

        $dept2 = Department::factory()->create([
            'tenant_id'  => $tenant->id,
            'faculty_id' => $faculty2->id,
            'name_en'    => 'Civil Engineering',
        ]);

        $term = AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);

        $course = Course::factory()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept1->id,
            'code'          => 'CS101',
        ]);

        $instructor = User::factory()->forTenant($tenant)->instructor()->create();
        $student    = User::factory()->forTenant($tenant)->student()->create();

        $section = Section::factory()->create([
            'tenant_id'        => $tenant->id,
            'course_id'        => $course->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $instructor->id,
            'capacity'         => 50,
        ]);

        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'section_id'  => $section->id,
            'student_id'  => $student->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        $gradeItem = GradeItem::create([
            'tenant_id'    => $tenant->id,
            'section_id'   => $section->id,
            'name'         => 'Final Exam',
            'type'         => 'exam',
            'max_score'    => 100,
            'weight'       => 50,
            'is_published' => true,
        ]);

        StudentGrade::create([
            'tenant_id'     => $tenant->id,
            'grade_item_id' => $gradeItem->id,
            'student_id'    => $student->id,
            'graded_by'     => $instructor->id,
            'score'         => 88,
            'is_published'  => true,
            'graded_at'     => now(),
        ]);

        return compact('tenant', 'uniAdmin', 'facAdmin1', 'faculty1', 'faculty2', 'dept1', 'dept2', 'student');
    }

    #[Test]
    public function university_admin_can_access_all_department_analytics(): void
    {
        $data = $this->setupUniversityData();

        $response = $this->actingAs($data['uniAdmin'], 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->getJson('/api/v1/admin/analytics/departments');

        $response->assertOk()
            ->assertJsonCount(2, 'departments')
            ->assertJsonPath('departments.0.name_en', 'Computer Science')
            ->assertJsonPath('departments.0.enrolled_count', 1);
    }

    #[Test]
    public function faculty_admin_is_scoped_to_own_faculty_departments(): void
    {
        $data = $this->setupUniversityData();

        $response = $this->actingAs($data['facAdmin1'], 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->getJson('/api/v1/admin/analytics/departments');

        $response->assertOk()
            ->assertJsonCount(1, 'departments')
            ->assertJsonPath('departments.0.id', $data['dept1']->id);
    }

    #[Test]
    public function admin_can_access_grade_analytics(): void
    {
        $data = $this->setupUniversityData();

        $response = $this->actingAs($data['uniAdmin'], 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->getJson('/api/v1/admin/analytics/grades');

        $response->assertOk()
            ->assertJsonPath('total_grades', 1)
            ->assertJsonPath('average_score_pct', 88)
            ->assertJsonPath('passing_rate_pct', 100)
            ->assertJsonPath('grade_distribution.B', 1);
    }

    #[Test]
    public function admin_can_export_csv_report(): void
    {
        $data = $this->setupUniversityData();

        $response = $this->actingAs($data['uniAdmin'], 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->get('/api/v1/admin/reports/export?type=departments');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $this->assertStringContainsString('Computer Science', $response->getContent());
    }

    #[Test]
    public function student_cannot_access_admin_reporting(): void
    {
        $data = $this->setupUniversityData();

        $this->actingAs($data['student'], 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $data['tenant']->id])
            ->getJson('/api/v1/admin/analytics/departments')
            ->assertForbidden();
    }
}
