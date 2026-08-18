<?php

namespace App\Http\Controllers\Api\V1\Admin\Concerns;

use App\Models\Course;
use App\Models\Department;
use App\Models\Programme;
use App\Models\Section;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait ScopesFacultyAdmin
{
    protected function requireFacultyId(User $user): int
    {
        if (! $user->isFacultyAdmin()) {
            abort(403, 'Faculty scope required.');
        }

        if (! $user->faculty_id) {
            abort(403, 'Faculty admin has no faculty assigned.');
        }

        return (int) $user->faculty_id;
    }

    protected function assertDepartmentInFaculty(
        Department $department,
        User $user
    ): void {
        if (
            $user->isFacultyAdmin()
            && (int) $department->faculty_id !== $this->requireFacultyId($user)
        ) {
            abort(403, 'Access denied.');
        }
    }

    protected function assertCourseInFaculty(
        Course $course,
        User $user
    ): void {
        $course->loadMissing('department');

        if (
            $user->isFacultyAdmin()
            && (int) $course->department->faculty_id !== $this->requireFacultyId($user)
        ) {
            abort(403, 'Access denied.');
        }
    }

    protected function assertProgrammeInFaculty(
        Programme $programme,
        User $user
    ): void {
        $programme->loadMissing('department');

        if (
            $user->isFacultyAdmin()
            && (int) $programme->department->faculty_id !== $this->requireFacultyId($user)
        ) {
            abort(403, 'Access denied.');
        }
    }

    protected function assertSectionInFaculty(
        Section $section,
        User $user
    ): void {
        $section->loadMissing('course.department');

        if (
            $user->isFacultyAdmin()
            && (int) $section->course->department->faculty_id !== $this->requireFacultyId($user)
        ) {
            abort(403, 'Access denied.');
        }
    }

    protected function assertUserInFaculty(
        User $target,
        User $admin
    ): void {
        if (! $admin->isFacultyAdmin()) {
            return;
        }

        if ((int) $target->faculty_id !== $this->requireFacultyId($admin)) {
            abort(403, 'Access denied.');
        }

        $targetRole = $target->role instanceof Role ? $target->role->value : $target->role;
        if (! in_array($targetRole, ['instructor', 'teaching_assistant', 'student'], true)) {
            abort(403, 'Cannot access or manage administrative accounts.');
        }
    }

    protected function departmentsQuery(User $user): Builder
    {
        $query = Department::with('faculty');

        if ($user->isFacultyAdmin()) {
            $query->where(
                'faculty_id',
                $this->requireFacultyId($user)
            );
        }

        return $query;
    }

    protected function programmesQuery(User $user): Builder
    {
        $query = Programme::with('department');

        if ($user->isFacultyAdmin()) {
            $query->whereHas(
                'department',
                fn(Builder $q) => $q->where(
                    'faculty_id',
                    $this->requireFacultyId($user)
                )
            );
        }

        return $query;
    }

    protected function coursesQuery(User $user): Builder
    {
        $query = Course::with('department');

        if ($user->isFacultyAdmin()) {
            $query->whereHas(
                'department',
                fn(Builder $q) => $q->where(
                    'faculty_id',
                    $this->requireFacultyId($user)
                )
            );
        }

        return $query;
    }

    protected function sectionsQuery(User $user): Builder
    {
        $query = Section::with([
            'course',
            'term',
            'instructor',
        ]);

        if ($user->isFacultyAdmin()) {
            $query->whereHas(
                'course.department',
                fn(Builder $q) => $q->where(
                    'faculty_id',
                    $this->requireFacultyId($user)
                )
            );
        }

        return $query;
    }
}
