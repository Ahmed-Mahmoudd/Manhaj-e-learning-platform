<?php

namespace App\Services;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Department;
use App\Models\Enrolment;
use App\Models\Faculty;
use App\Models\Programme;
use App\Models\Section;
use App\Models\User;
use App\Tenancy\TenantContext;

class AdminDashboardService
{
    public function universityStats(): array
    {
        $tenantId = TenantContext::require()->id;

        $activeTerm = AcademicTerm::query()
            ->where('is_active', true)
            ->first(['id', 'name', 'starts_at', 'ends_at']);

        $faculties = Faculty::query()
            ->withCount('departments')
            ->get(['id', 'name_en', 'name_ar', 'code']);

        $facultySummaries = $faculties->map(function (Faculty $faculty) {
            $departmentIds = Department::query()
                ->where('faculty_id', $faculty->id)
                ->pluck('id');

            $programmeCount = Programme::query()
                ->whereIn('department_id', $departmentIds)
                ->count();

            $courseIds = Course::query()
                ->whereIn('department_id', $departmentIds)
                ->pluck('id');

            $sectionIds = Section::query()
                ->whereIn('course_id', $courseIds)
                ->pluck('id');

            $studentCount = Enrolment::query()
                ->whereIn('section_id', $sectionIds)
                ->where('status', 'enrolled')
                ->distinct('student_id')
                ->count('student_id');

            return [
                'id'                => $faculty->id,
                'name_en'           => $faculty->name_en,
                'name_ar'           => $faculty->name_ar,
                'code'              => $faculty->code,
                'departments_count' => $faculty->departments_count,
                'programmes_count'  => $programmeCount,
                'courses_count'     => $courseIds->count(),
                'students_count'    => $studentCount,
            ];
        });

        return [
            'total_students'     => User::query()->where('role', 'student')->count(),
            'total_faculties'    => $faculties->count(),
            'total_departments'  => Department::query()->count(),
            'total_programmes'   => Programme::query()->count(),
            'total_enrolments'   => Enrolment::query()->where('status', 'enrolled')->count(),
            'active_term'        => $activeTerm ? [
                'id'         => $activeTerm->id,
                'name'       => $activeTerm->name,
                'starts_at'  => $activeTerm->starts_at,
                'ends_at'    => $activeTerm->ends_at,
            ] : null,
            'faculty_summaries'  => $facultySummaries,
        ];
    }

    public function facultyStats(int $facultyId): array
    {
        $faculty = Faculty::query()->findOrFail($facultyId);

        $departmentIds = Department::query()
            ->where('faculty_id', $facultyId)
            ->pluck('id');

        $courseIds = Course::query()
            ->whereIn('department_id', $departmentIds)
            ->pluck('id');

        $activeSections = Section::query()
            ->whereIn('course_id', $courseIds)
            ->where('is_active', true)
            ->count();

        $sectionIds = Section::query()
            ->whereIn('course_id', $courseIds)
            ->pluck('id');

        $enrolmentCount = Enrolment::query()
            ->whereIn('section_id', $sectionIds)
            ->where('status', 'enrolled')
            ->count();

        $studentCount = Enrolment::query()
            ->whereIn('section_id', $sectionIds)
            ->where('status', 'enrolled')
            ->distinct('student_id')
            ->count('student_id');

        $activeTerm = AcademicTerm::query()
            ->where('is_active', true)
            ->first(['id', 'name']);

        return [
            'faculty' => [
                'id'      => $faculty->id,
                'name_en' => $faculty->name_en,
                'name_ar' => $faculty->name_ar,
                'code'    => $faculty->code,
            ],
            'students_count'        => $studentCount,
            'departments_count'     => $departmentIds->count(),
            'programmes_count'      => Programme::query()->whereIn('department_id', $departmentIds)->count(),
            'courses_count'         => $courseIds->count(),
            'active_sections_count' => $activeSections,
            'enrolments_count'      => $enrolmentCount,
            'active_term'           => $activeTerm ? [
                'id'   => $activeTerm->id,
                'name' => $activeTerm->name,
            ] : null,
        ];
    }

    public function departmentAnalytics(?int $facultyId = null): array
    {
        $query = Department::query()->with('faculty');

        if ($facultyId !== null) {
            $query->where('faculty_id', $facultyId);
        }

        $departments = $query->get();

        $data = $departments->map(function (Department $dept) {
            $programmeCount = Programme::query()->where('department_id', $dept->id)->count();
            $courseIds = Course::query()->where('department_id', $dept->id)->pluck('id');
            $sections = Section::query()->whereIn('course_id', $courseIds)->where('is_active', true)->get();

            $totalCapacity = $sections->sum('capacity');
            $enrolledCount = Enrolment::query()
                ->whereIn('section_id', $sections->pluck('id'))
                ->where('status', 'enrolled')
                ->count();

            $fillRate = $totalCapacity > 0 ? round(($enrolledCount / $totalCapacity) * 100, 1) : 0.0;

            return [
                'id'                => $dept->id,
                'code'              => $dept->code,
                'name_en'           => $dept->name_en,
                'name_ar'           => $dept->name_ar,
                'faculty'           => $dept->faculty ? [
                    'id'      => $dept->faculty->id,
                    'name_en' => $dept->faculty->name_en,
                    'name_ar' => $dept->faculty->name_ar,
                ] : null,
                'programmes_count'  => $programmeCount,
                'courses_count'     => $courseIds->count(),
                'sections_count'    => $sections->count(),
                'capacity'          => $totalCapacity,
                'enrolled_count'    => $enrolledCount,
                'fill_rate_pct'     => $fillRate,
            ];
        });

        return [
            'departments' => $data,
        ];
    }

    public function gradeAnalytics(?int $facultyId = null): array
    {
        $courseQuery = Course::query();

        if ($facultyId !== null) {
            $departmentIds = Department::query()->where('faculty_id', $facultyId)->pluck('id');
            $courseQuery->whereIn('department_id', $departmentIds);
        }

        $courseIds = $courseQuery->pluck('id');
        $sectionIds = Section::query()->whereIn('course_id', $courseIds)->pluck('id');

        $gradeItemIds = \App\Models\GradeItem::query()
            ->whereIn('section_id', $sectionIds)
            ->where('is_published', true)
            ->pluck('id');

        $grades = \App\Models\StudentGrade::query()
            ->whereIn('grade_item_id', $gradeItemIds)
            ->with('gradeItem')
            ->get();

        $totalCount = $grades->count();
        $percentages = $grades->map(fn($g) => $g->scorePercentage());
        $avgScore = $totalCount > 0 ? round($percentages->avg(), 1) : 0.0;
        $passingCount = $grades->filter(fn($g) => $g->scorePercentage() >= 60.0)->count();
        $passRate = $totalCount > 0 ? round(($passingCount / $totalCount) * 100, 1) : 0.0;

        $distribution = [
            'A' => 0,
            'B' => 0,
            'C' => 0,
            'D' => 0,
            'F' => 0,
        ];

        foreach ($grades as $grade) {
            $letter = $grade->letterGrade();
            $base = substr($letter, 0, 1);
            if (isset($distribution[$base])) {
                $distribution[$base]++;
            }
        }

        return [
            'total_grades'          => $totalCount,
            'published_grade_items' => $gradeItemIds->count(),
            'average_score_pct'     => $avgScore,
            'passing_rate_pct'      => $passRate,
            'grade_distribution'    => $distribution,
        ];
    }

    public function exportCsv(string $type, ?int $facultyId = null): string
    {
        $handle = fopen('php://temp', 'r+');

        if ($type === 'departments') {
            fputcsv($handle, ['ID', 'Code', 'Name (EN)', 'Name (AR)', 'Faculty', 'Programmes', 'Courses', 'Sections', 'Capacity', 'Enrolled', 'Fill Rate %']);
            $analytics = $this->departmentAnalytics($facultyId);
            foreach ($analytics['departments'] as $d) {
                fputcsv($handle, [
                    $d['id'],
                    $d['code'],
                    $d['name_en'],
                    $d['name_ar'],
                    $d['faculty']['name_en'] ?? '',
                    $d['programmes_count'],
                    $d['courses_count'],
                    $d['sections_count'],
                    $d['capacity'],
                    $d['enrolled_count'],
                    $d['fill_rate_pct'] . '%',
                ]);
            }
        } elseif ($type === 'courses') {
            fputcsv($handle, ['ID', 'Code', 'Title (EN)', 'Title (AR)', 'Department', 'Credit Hours', 'Active Sections']);
            $courseQuery = Course::query()->with('department');
            if ($facultyId !== null) {
                $deptIds = Department::query()->where('faculty_id', $facultyId)->pluck('id');
                $courseQuery->whereIn('department_id', $deptIds);
            }
            $courses = $courseQuery->withCount(['sections' => fn($q) => $q->where('is_active', true)])->get();
            foreach ($courses as $c) {
                fputcsv($handle, [
                    $c->id,
                    $c->code,
                    $c->title_en,
                    $c->title_ar,
                    $c->department?->name_en ?? '',
                    $c->credit_hours,
                    $c->sections_count,
                ]);
            }
        } else {
            // Default: Sections report
            fputcsv($handle, ['ID', 'Section Number', 'Course Code', 'Course Title', 'Term', 'Instructor', 'Capacity', 'Enrolled', 'Waitlisted']);
            $sectionQuery = Section::query()->with(['course', 'term', 'instructor']);
            if ($facultyId !== null) {
                $deptIds = Department::query()->where('faculty_id', $facultyId)->pluck('id');
                $courseIds = Course::query()->whereIn('department_id', $deptIds)->pluck('id');
                $sectionQuery->whereIn('course_id', $courseIds);
            }
            $sections = $sectionQuery->get();
            foreach ($sections as $s) {
                fputcsv($handle, [
                    $s->id,
                    $s->section_number,
                    $s->course->code,
                    $s->course->title_en,
                    $s->term->name,
                    $s->instructor?->name ?? 'Unassigned',
                    $s->capacity,
                    $s->enrolledCount(),
                    $s->enrolments()->where('status', 'waitlisted')->count(),
                ]);
            }
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv ?: '';
    }
}

