<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Programme;
use App\Models\Section;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * DatabaseSeeder — realistic demo data for MANHAJ.
 *
 * Creates:
 *   2 universities (tenants)
 *   → faculties, departments, programmes
 *   → academic terms
 *   → courses with prerequisites
 *   → sections with instructors + TAs
 *   → students enrolled in sections
 *   → modules + lessons with content
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Platform Admin (no tenant) ────────────────────────────────────────
        User::factory()->platformAdmin()->create([
            'name'  => 'Platform Admin',
            'email' => 'admin@manhaj.app',
        ]);

        // ── University A: Cairo University of Technology ───────────────────────
        $uniA = Tenant::factory()->create([
            'name'           => 'Cairo University of Technology',
            'subdomain'      => 'cut',
            'locale'         => 'ar',
            'timezone'       => 'Africa/Cairo',
            'grading_system' => 'credit_gpa',
        ]);

        $this->seedUniversity($uniA, 'CUT');

        // ── University B: Alexandria Institute of Science ──────────────────────
        $uniB = Tenant::factory()->create([
            'name'           => 'Alexandria Institute of Science',
            'subdomain'      => 'ais',
            'locale'         => 'en',
            'timezone'       => 'Africa/Cairo',
            'grading_system' => 'credit_gpa',
        ]);

        $this->seedUniversity($uniB, 'AIS');

        $this->command->info('✅ Demo data seeded successfully.');
        $this->command->info('   Platform Admin → admin@manhaj.app / password');
        $this->command->info('   CUT Admin      → admin@cut.manhaj.app / password');
        $this->command->info('   AIS Admin      → admin@ais.manhaj.app / password');
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function seedUniversity(Tenant $tenant, string $prefix): void
    {
        // University Admin
        $uniAdmin = User::factory()->forTenant($tenant)->universityAdmin()->create([
            'name'  => "{$prefix} University Admin",
            'email' => "admin@" . strtolower($prefix) . ".manhaj.app",
        ]);

        // ── Faculty of Computer Science ───────────────────────────────────────
        $faculty = Faculty::factory()->create([
            'tenant_id' => $tenant->id,
            'name_en'   => 'Faculty of Computer Science',
            'name_ar'   => 'كلية علوم الحاسب',
            'code'      => 'CS',
        ]);

        $dept = Department::factory()->create([
            'tenant_id'  => $tenant->id,
            'faculty_id' => $faculty->id,
            'name_en'    => 'Computer Science',
            'name_ar'    => 'علوم الحاسب',
            'code'       => 'CS',
        ]);

        Programme::factory()->creditGpa()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
            'name_en'       => 'BSc Computer Science',
            'name_ar'       => 'بكالوريوس علوم الحاسب',
            'code'          => 'BSCS',
            'duration_years'=> 4,
        ]);

        // ── Active academic term ───────────────────────────────────────────────
        $term = AcademicTerm::factory()->active()->create([
            'tenant_id'         => $tenant->id,
            'type'              => 'semester',
            'name'              => 'Fall 2025/2026',
            'starts_at'         => '2025-09-15',
            'ends_at'           => '2026-01-31',
            'add_drop_deadline' => '2025-09-29',
        ]);

        // ── Courses ───────────────────────────────────────────────────────────
        $cs101 = Course::factory()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
            'code'          => "{$prefix}-CS101",
            'title_en'      => 'Introduction to Programming',
            'title_ar'      => 'مقدمة في البرمجة',
            'credit_hours'  => 3,
        ]);

        $cs201 = Course::factory()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
            'code'          => "{$prefix}-CS201",
            'title_en'      => 'Data Structures',
            'title_ar'      => 'هياكل البيانات',
            'credit_hours'  => 3,
        ]);

        // CS201 requires CS101 as prerequisite
        $cs201->prerequisites()->attach($cs101->id);

        $cs301 = Course::factory()->create([
            'tenant_id'     => $tenant->id,
            'department_id' => $dept->id,
            'code'          => "{$prefix}-CS301",
            'title_en'      => 'Algorithms',
            'title_ar'      => 'الخوارزميات',
            'credit_hours'  => 3,
        ]);
        $cs301->prerequisites()->attach($cs201->id);

        // ── Instructor + TA ───────────────────────────────────────────────────
        $instructor = User::factory()->forTenant($tenant)->instructor()->create([
            'name'  => "{$prefix} Dr. Ahmed Hassan",
            'email' => "instructor@" . strtolower($prefix) . ".manhaj.app",
        ]);

        $ta = User::factory()->forTenant($tenant)->teachingAssistant()->create([
            'name'  => "{$prefix} TA Sara",
            'email' => "ta@" . strtolower($prefix) . ".manhaj.app",
        ]);

        // ── Section for CS101 ─────────────────────────────────────────────────
        $section = Section::factory()->create([
            'tenant_id'        => $tenant->id,
            'course_id'        => $cs101->id,
            'academic_term_id' => $term->id,
            'instructor_id'    => $instructor->id,
            'section_number'   => '01',
            'capacity'         => 40,
            'schedule'         => [
                ['day' => 'Sunday',    'time' => '10:00', 'room' => 'A101'],
                ['day' => 'Tuesday',   'time' => '10:00', 'room' => 'A101'],
                ['day' => 'Thursday',  'time' => '10:00', 'room' => 'A101'],
            ],
        ]);
        $section->teachingAssistants()->attach($ta->id);

        // ── Students ──────────────────────────────────────────────────────────
        $students = User::factory()->count(10)->forTenant($tenant)->student()->create();

        foreach ($students as $student) {
            Enrolment::create([
                'tenant_id'   => $tenant->id,
                'student_id'  => $student->id,
                'section_id'  => $section->id,
                'status'      => 'enrolled',
                'enrolled_at' => now(),
            ]);
        }

        // Named demo student for easy login
        $demoStudent = User::factory()->forTenant($tenant)->student()->create([
            'name'  => "{$prefix} Demo Student",
            'email' => "student@" . strtolower($prefix) . ".manhaj.app",
        ]);
        Enrolment::create([
            'tenant_id'   => $tenant->id,
            'student_id'  => $demoStudent->id,
            'section_id'  => $section->id,
            'status'      => 'enrolled',
            'enrolled_at' => now(),
        ]);

        // ── Modules + Lessons for CS101 ───────────────────────────────────────
        $module1 = Module::factory()->create([
            'tenant_id'    => $tenant->id,
            'course_id'    => $cs101->id,
            'title'        => 'Module 1: Getting Started',
            'description'  => 'Introduction to programming concepts and environment setup.',
            'order'        => 1,
            'is_published' => true,
        ]);

        Lesson::factory()->create([
            'tenant_id'    => $tenant->id,
            'module_id'    => $module1->id,
            'title'        => 'Welcome to the Course',
            'type'         => 'text',
            'body'         => '<h2>Welcome!</h2><p>In this course you will learn the fundamentals of programming using Python. By the end, you will be able to write simple programs and understand core CS concepts.</p>',
            'order'        => 1,
            'is_published' => true,
        ]);

        Lesson::factory()->video()->create([
            'tenant_id'    => $tenant->id,
            'module_id'    => $module1->id,
            'title'        => 'Course Overview Video',
            'url'          => 'https://www.youtube.com/watch?v=rfscVS0vtbw',
            'order'        => 2,
            'is_published' => true,
            'duration_seconds' => 1800,
        ]);

        Lesson::factory()->pdf()->create([
            'tenant_id'    => $tenant->id,
            'module_id'    => $module1->id,
            'title'        => 'Course Syllabus',
            'file_path'    => 'lessons/syllabus.pdf',
            'order'        => 3,
            'is_published' => true,
        ]);

        $module2 = Module::factory()->create([
            'tenant_id'    => $tenant->id,
            'course_id'    => $cs101->id,
            'title'        => 'Module 2: Variables & Data Types',
            'order'        => 2,
            'is_published' => true,
        ]);

        Lesson::factory()->create([
            'tenant_id'    => $tenant->id,
            'module_id'    => $module2->id,
            'title'        => 'What are Variables?',
            'type'         => 'text',
            'body'         => '<p>A variable is a named container for storing data values...</p>',
            'order'        => 1,
            'is_published' => true,
        ]);

        Lesson::factory()->video()->create([
            'tenant_id'    => $tenant->id,
            'module_id'    => $module2->id,
            'title'        => 'Data Types Explained',
            'url'          => 'https://www.youtube.com/watch?v=Z1Yd7upQsXY',
            'order'        => 2,
            'is_published' => true,
            'duration_seconds' => 900,
        ]);

        $this->command->info("   Seeded: {$tenant->name}");
    }
}
