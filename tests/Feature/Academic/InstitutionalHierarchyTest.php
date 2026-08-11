<?php

namespace Tests\Feature\Academic;

use App\Models\AcademicTerm;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\Programme;
use App\Models\Tenant;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Institutional Hierarchy Tests
 *
 * Verifies: University → Faculty → Department → Programme chain,
 * tenant isolation on each level, and AcademicTerm behaviour.
 */
class InstitutionalHierarchyTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    #[Test]
    public function can_create_full_hierarchy_under_a_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        TenantContext::set($tenant);

        $faculty = Faculty::factory()->create([
            'tenant_id' => $tenant->id,
            'name_en'   => 'Faculty of Engineering',
        ]);

        $dept = Department::factory()->create([
            'tenant_id'  => $tenant->id,
            'faculty_id' => $faculty->id,
            'name_en'    => 'Computer Engineering',
        ]);

        $prog = Programme::factory()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
            'name_en'       => 'BSc Computer Engineering',
        ]);

        // Assert relationships
        $this->assertEquals($faculty->id, $dept->faculty_id);
        $this->assertEquals($dept->id, $prog->department_id);
        $this->assertEquals($tenant->id, $prog->tenant_id);
    }

    #[Test]
    public function faculty_is_isolated_by_tenant(): void
    {
        $tenantA = Tenant::factory()->create(['subdomain' => 'hier-a']);
        $tenantB = Tenant::factory()->create(['subdomain' => 'hier-b']);

        Faculty::factory()->create(['tenant_id' => $tenantA->id, 'name_en' => 'Faculty A']);
        Faculty::factory()->create(['tenant_id' => $tenantB->id, 'name_en' => 'Faculty B']);

        TenantContext::set($tenantA);
        $results = Faculty::all();

        $this->assertCount(1, $results);
        $this->assertEquals('Faculty A', $results->first()->name_en);
    }

    #[Test]
    public function department_is_isolated_by_tenant(): void
    {
        $tenantA  = Tenant::factory()->create(['subdomain' => 'dept-a']);
        $tenantB  = Tenant::factory()->create(['subdomain' => 'dept-b']);
        $facultyA = Faculty::factory()->create(['tenant_id' => $tenantA->id]);
        $facultyB = Faculty::factory()->create(['tenant_id' => $tenantB->id]);

        Department::factory()->create(['tenant_id' => $tenantA->id, 'faculty_id' => $facultyA->id]);
        Department::factory()->create(['tenant_id' => $tenantB->id, 'faculty_id' => $facultyB->id]);

        TenantContext::set($tenantA);

        $this->assertCount(1, Department::all());
    }

    #[Test]
    public function programme_grading_type_helpers_work(): void
    {
        $tenant = Tenant::factory()->create();
        $dept   = Department::factory()->create(['tenant_id' => $tenant->id]);

        $creditProg = Programme::factory()->creditGpa()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
        ]);

        $yearProg = Programme::factory()->yearPercentage()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
        ]);

        $this->assertTrue($creditProg->usesCreditGpa());
        $this->assertFalse($creditProg->usesYearPercentage());

        $this->assertTrue($yearProg->usesYearPercentage());
        $this->assertFalse($yearProg->usesCreditGpa());
    }

    #[Test]
    public function academic_term_active_scope_filters_correctly(): void
    {
        $tenant = Tenant::factory()->create();
        TenantContext::set($tenant);

        AcademicTerm::factory()->create(['tenant_id' => $tenant->id, 'is_active' => false]);
        AcademicTerm::factory()->active()->create(['tenant_id' => $tenant->id]);

        $active = AcademicTerm::active()->get();

        $this->assertCount(1, $active);
        $this->assertTrue($active->first()->is_active);
    }

    #[Test]
    public function academic_term_add_drop_check(): void
    {
        $tenant = Tenant::factory()->create();

        $openTerm = AcademicTerm::factory()->create([
            'tenant_id'         => $tenant->id,
            'starts_at'         => now()->subDays(10),
            'ends_at'           => now()->addMonths(4),
            'add_drop_deadline' => now()->addDays(5), // still open
        ]);

        $closedTerm = AcademicTerm::factory()->create([
            'tenant_id'         => $tenant->id,
            'starts_at'         => now()->subDays(30),
            'ends_at'           => now()->addMonths(3),
            'add_drop_deadline' => now()->subDays(1), // already passed
        ]);

        $this->assertTrue($openTerm->isWithinAddDropPeriod());
        $this->assertFalse($closedTerm->isWithinAddDropPeriod());
    }

    #[Test]
    public function academic_term_is_isolated_by_tenant(): void
    {
        $tenantA = Tenant::factory()->create(['subdomain' => 'term-a']);
        $tenantB = Tenant::factory()->create(['subdomain' => 'term-b']);

        AcademicTerm::factory()->active()->create(['tenant_id' => $tenantA->id]);
        AcademicTerm::factory()->active()->create(['tenant_id' => $tenantB->id]);

        TenantContext::set($tenantA);

        $this->assertCount(1, AcademicTerm::all());
        $this->assertCount(1, AcademicTerm::active()->get());
    }
}
