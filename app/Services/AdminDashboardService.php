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
}
