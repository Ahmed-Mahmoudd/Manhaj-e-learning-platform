<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\AcademicTerm;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\GradeItem;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Programme;
use App\Models\Section;
use App\Models\StudentGrade;
use App\Models\Tenant;
use App\Models\User;
use App\Services\DiscussionService;
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
        $this->command->info('   CUT Student    → student@cut.manhaj.app / password');
        $this->command->info('   CUT Instructor → instructor@cut.manhaj.app / password');
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
            'tenant_id'               => $tenant->id,
            'course_id'               => $cs101->id,
            'title'                   => 'Module 2: Variables & Data Types',
            'order'                   => 2,
            'is_published'            => true,
            'release_after_module_id' => $module1->id,
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

        $this->seedPublishedGrades($tenant, $section, $instructor, $demoStudent);
        $this->seedDemoAnnouncements($tenant, $section, $instructor, $demoStudent);
        $this->seedDemoDiscussion($section, $instructor, $demoStudent, $ta);

        $this->command->info("   Seeded: {$tenant->name}");
    }

    /**
     * Published grade items + scores for the named demo student (grades UI testing).
     */
    private function seedPublishedGrades(
        Tenant $tenant,
        Section $section,
        User $instructor,
        User $demoStudent,
    ): void {
        $items = [
            [
                'name'      => 'Assignment 1: Hello Python',
                'type'      => 'assignment',
                'max_score' => 100,
                'weight'    => 20,
                'order'     => 1,
                'score'     => 92,
                'feedback'  => 'Clean code and good variable naming. Watch spacing in loops.',
            ],
            [
                'name'      => 'Quiz 1: Syntax Basics',
                'type'      => 'quiz',
                'max_score' => 20,
                'weight'    => 10,
                'order'     => 2,
                'score'     => 18,
                'feedback'  => null,
            ],
            [
                'name'      => 'Midterm Exam',
                'type'      => 'midterm',
                'max_score' => 100,
                'weight'    => 30,
                'order'     => 3,
                'score'     => 88,
                'feedback'  => 'Strong on control flow; review list comprehensions.',
            ],
            [
                'name'      => 'Final Project',
                'type'      => 'project',
                'max_score' => 100,
                'weight'    => 40,
                'order'     => 4,
                'score'     => 95,
                'feedback'  => 'Excellent capstone — well-structured modules and tests.',
            ],
        ];

        foreach ($items as $row) {
            $item = GradeItem::create([
                'tenant_id'    => $tenant->id,
                'section_id'   => $section->id,
                'name'         => $row['name'],
                'type'         => $row['type'],
                'max_score'    => $row['max_score'],
                'weight'       => $row['weight'],
                'order'        => $row['order'],
                'is_published' => true,
            ]);

            StudentGrade::create([
                'tenant_id'     => $tenant->id,
                'grade_item_id' => $item->id,
                'student_id'    => $demoStudent->id,
                'graded_by'     => $instructor->id,
                'score'         => $row['score'],
                'feedback'      => $row['feedback'],
                'is_published'  => true,
                'graded_at'     => now(),
            ]);
        }
    }

    /**
     * Published announcements for the demo student's enrolled section (announcements UI testing).
     */
    private function seedDemoAnnouncements(
        Tenant $tenant,
        Section $section,
        User $instructor,
        User $demoStudent,
    ): void {
        $rows = [
            [
                'type'         => 'general',
                'is_urgent'    => true,
                'title'        => 'Thursday lab moved to Room B204',
                'body'         => "This week's lab session on Thursday has been moved from A101 to **B204** due to maintenance.\n\nPlease arrive 10 minutes early so we can start on time. Bring your laptop and the Week 3 worksheet.",
                'published_at' => now()->subHours(3),
                'mark_read'    => false,
            ],
            [
                'type'         => 'assignment',
                'title'        => 'Assignment 2 posted — due Oct 18',
                'body'         => "Assignment 2: Functions & Loops is now available under Module 2.\n\n- Submit a single `.py` file via the course portal\n- Due: **Oct 18, 11:59 PM**\n- Late submissions lose 10% per day\n\nOffice hours: Sunday 2–4 PM if you need help.",
                'published_at' => now()->subDays(1),
                'mark_read'    => false,
            ],
            [
                'type'         => 'exam',
                'title'        => 'Midterm exam — scope & format',
                'body'         => "The midterm covers Modules 1–2 (variables, types, control flow, functions).\n\n**Format:** 60 minutes, closed book, one handwritten cheat sheet (A4, both sides).\n\nSample questions will be posted next week. Review Lectures 1–6 and Lab 1–3.",
                'published_at' => now()->subDays(3),
                'mark_read'    => true,
            ],
            [
                'type'         => 'general',
                'title'        => 'Welcome to Introduction to Programming',
                'body'         => "Welcome to the course! This term we'll use Python 3.12.\n\nPlease install VS Code + the Python extension before our first lab. Join the section forum if you have questions — TAs monitor it daily.\n\nGood luck!",
                'published_at' => now()->subWeeks(2),
                'mark_read'    => true,
            ],
            [
                'type'         => 'general',
                'title'        => 'Course materials available on the portal',
                'body'         => "All lecture slides, lab sheets, and recorded sessions are under **My courses → Section lessons**.\n\nNew content unlocks each Sunday at 8 AM. Let us know if anything is missing.",
                'published_at' => now()->subWeeks(1),
                'mark_read'    => false,
            ],
        ];

        foreach ($rows as $row) {
            $announcement = Announcement::create([
                'tenant_id'    => $tenant->id,
                'section_id'   => $section->id,
                'author_id'    => $instructor->id,
                'type'         => $row['type'],
                'is_urgent'    => $row['is_urgent'] ?? false,
                'title'        => $row['title'],
                'body'         => $row['body'],
                'is_published' => true,
                'published_at' => $row['published_at'],
            ]);

            if ($row['mark_read']) {
                AnnouncementRead::create([
                    'announcement_id' => $announcement->id,
                    'user_id'         => $demoStudent->id,
                    'read_at'         => $row['published_at']->copy()->addHours(2),
                ]);
            }
        }
    }

    /**
     * Sample forum threads for the demo section (discussion UI testing).
     */
    private function seedDemoDiscussion(
        Section $section,
        User $instructor,
        User $demoStudent,
        User $ta,
    ): void {
        $discussion = app(DiscussionService::class);

        $question = $discussion->createThread($section, $demoStudent, [
            'type'  => 'question',
            'title' => 'How do I submit Assignment 1?',
            'body'  => 'I finished Hello Python but I cannot find the upload link. Do we submit on the portal or by email?',
        ]);
        $discussion->togglePin($question);

        $answer = $discussion->reply(
            $question,
            $instructor,
            'Upload via **My courses → Section lessons → Assignment 1**. Use a single `.py` file named `a1_yourid.py`. Email submissions are not accepted.',
        );
        $discussion->markAnswer($answer);

        $discussion->reply(
            $question,
            $ta,
            'If the upload button is missing, try a hard refresh. I can help in office hours Sunday 2 PM.',
        );

        $studyGroup = $discussion->createThread($section, $ta, [
            'type'  => 'general',
            'title' => 'Study group for midterm prep',
            'body'  => 'Planning a review session this Saturday 3 PM in the library. Reply if you want to join — we will cover loops, functions, and past quiz questions.',
        ]);

        $discussion->reply(
            $studyGroup,
            $demoStudent,
            'Count me in! Can we also go over list comprehensions?',
        );

        $discussion->createThread($section, $instructor, [
            'type'  => 'resource',
            'title' => 'Official Python 3.12 documentation',
            'body'  => "Bookmark these while working on assignments:\n\nhttps://docs.python.org/3/\n\nThe tutorial sections on data structures and modules are especially useful for Assignment 2.",
        ]);
    }
}
