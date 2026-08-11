<?php

namespace App\Enums;

/**
 * Role — all possible user roles in the MANHAJ platform.
 *
 * WHY an enum?
 *   PHP 8.1 backed enums give us type safety everywhere — casting in Eloquent,
 *   switch/match exhaustiveness, and IDE autocomplete. No magic strings.
 *
 * HOW it fits:
 *   The `users.role` column stores the string value (e.g. "student").
 *   The User model casts `role` to this enum automatically.
 */
enum Role: string
{
    case PlatformAdmin     = 'platform_admin';
    case UniversityAdmin   = 'university_admin';
    case FacultyAdmin      = 'faculty_admin';
    case Instructor        = 'instructor';
    case TeachingAssistant = 'teaching_assistant';
    case Student           = 'student';
    case Guest             = 'guest';

    // ─── Convenience helpers ──────────────────────────────────────────────────

    /** Roles that can manage institutional structure */
    public function isAdministrative(): bool
    {
        return in_array($this, [
            self::PlatformAdmin,
            self::UniversityAdmin,
            self::FacultyAdmin,
        ]);
    }

    /** Roles that can deliver content */
    public function isTeachingStaff(): bool
    {
        return in_array($this, [
            self::Instructor,
            self::TeachingAssistant,
        ]);
    }

    public function isStudent(): bool
    {
        return $this === self::Student;
    }

    public function isPlatformAdmin(): bool
    {
        return $this === self::PlatformAdmin;
    }

    /** Human-readable label */
    public function label(): string
    {
        return match($this) {
            self::PlatformAdmin     => 'Platform Admin',
            self::UniversityAdmin   => 'University Admin',
            self::FacultyAdmin      => 'Faculty Admin',
            self::Instructor        => 'Instructor',
            self::TeachingAssistant => 'Teaching Assistant',
            self::Student           => 'Student',
            self::Guest             => 'Guest / Auditor',
        };
    }
}
