<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Section;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * EnrolmentService — all enrolment business logic lives here.
 *
 * WHY a service?
 *   Enrolment has rules: prerequisites, capacity, waitlist, add-drop window.
 *   Putting this in a controller would make it impossible to test in isolation.
 *   The service is a plain PHP class that can be tested directly.
 */
class EnrolmentService
{
    /**
     * Attempt to enrol a student in a section.
     *
     * Returns the Enrolment (status: enrolled or waitlisted).
     * Throws on rule violations.
     *
     * @throws \RuntimeException
     */
    public function enrol(User $student, Section $section): Enrolment
    {
        // 1. Check not already enrolled/waitlisted in this section
        $existing = Enrolment::withoutGlobalScope('tenant')
            ->where('student_id', $student->id)
            ->where('section_id', $section->id)
            ->whereIn('status', ['enrolled', 'waitlisted'])
            ->first();

        if ($existing) {
            throw new \RuntimeException('Student is already enrolled or waitlisted in this section.');
        }

        // 2. Check prerequisites
        $this->checkPrerequisites($student, $section->course);

        // 3. Determine status: enrolled or waitlisted
        return DB::transaction(function () use ($student, $section) {
            if ($section->hasCapacity()) {
                return Enrolment::create([
                    'tenant_id'   => $section->tenant_id,
                    'student_id'  => $student->id,
                    'section_id'  => $section->id,
                    'status'      => 'enrolled',
                    'enrolled_at' => now(),
                ]);
            }

            // Section is full — add to waitlist
            return Enrolment::create([
                'tenant_id'         => $section->tenant_id,
                'student_id'        => $student->id,
                'section_id'        => $section->id,
                'status'            => 'waitlisted',
                'waitlist_position' => $section->nextWaitlistPosition(),
            ]);
        });
    }

    /**
     * Drop a student from a section.
     * If a waitlisted student exists, promote them automatically.
     */
    public function drop(Enrolment $enrolment): void
    {
        DB::transaction(function () use ($enrolment) {
            $wasEnrolled = $enrolment->isEnrolled(); // capture BEFORE update

            $enrolment->update([
                'status'     => 'dropped',
                'dropped_at' => now(),
            ]);

            if ($wasEnrolled) {
                $this->promoteFromWaitlist($enrolment->section);
            }
        });
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Check that the student has completed all prerequisite courses.
     *
     * A prerequisite is "completed" when the student has an enrolment
     * with status = 'completed' in any section of that prerequisite course.
     *
     * @throws \RuntimeException
     */
    private function checkPrerequisites(User $student, Course $course): void
    {
        $prerequisites = $course->prerequisites;

        if ($prerequisites->isEmpty()) {
            return;
        }

        foreach ($prerequisites as $prereq) {
            $completed = Enrolment::withoutGlobalScope('tenant')
                ->where('student_id', $student->id)
                ->where('status', 'completed')
                ->whereHas('section', fn($q) => $q->where('course_id', $prereq->id))
                ->exists();

            if (! $completed) {
                throw new \RuntimeException(
                    "Prerequisite not met: {$prereq->code} — {$prereq->title_en}"
                );
            }
        }
    }

    private function promoteFromWaitlist(Section $section): void
    {
        $next = Enrolment::withoutGlobalScope('tenant')
            ->where('section_id', $section->id)
            ->where('status', 'waitlisted')
            ->orderBy('waitlist_position')
            ->first();

        if ($next) {
            $next->update([
                'status'            => 'enrolled',
                'enrolled_at'       => now(),
                'waitlist_position' => null,
            ]);
        }
    }
}
