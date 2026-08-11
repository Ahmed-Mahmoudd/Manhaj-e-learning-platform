<?php

namespace App\Providers;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->registerGates();
    }

    /**
     * Register platform-wide Gates.
     *
     * WHY Gates (not just Policies)?
     *   Policies are great for model-level authorization (can this user edit THIS course?).
     *   Gates handle broad capability checks (can this user type access the admin panel at all?).
     *   We use BOTH: Gates for role-level access, Policies for record-level access.
     *
     * Platform Admin bypasses all gates automatically via the `before` callback.
     */
    private function registerGates(): void
    {
        // Platform Admin bypasses every gate check
        Gate::before(function (User $user, string $ability) {
            if ($user->isPlatformAdmin()) {
                return true;
            }
        });

        // ── Administrative gates ──────────────────────────────────────────────

        Gate::define('manage-tenants', fn(User $user) =>
            $user->isPlatformAdmin()
        );

        Gate::define('manage-university', fn(User $user) =>
            $user->hasAnyRole(Role::UniversityAdmin)
        );

        Gate::define('manage-faculty', fn(User $user) =>
            $user->hasAnyRole(Role::UniversityAdmin, Role::FacultyAdmin)
        );

        // ── Academic content gates ────────────────────────────────────────────

        Gate::define('manage-courses', fn(User $user) =>
            $user->hasAnyRole(Role::UniversityAdmin, Role::FacultyAdmin, Role::Instructor)
        );

        Gate::define('manage-sections', fn(User $user) =>
            $user->hasAnyRole(Role::UniversityAdmin, Role::FacultyAdmin, Role::Instructor)
        );

        Gate::define('teach', fn(User $user) =>
            $user->hasAnyRole(Role::Instructor, Role::TeachingAssistant)
        );

        // ── Student gates ─────────────────────────────────────────────────────

        Gate::define('enrol', fn(User $user) =>
            $user->isStudent()
        );

        Gate::define('view-content', fn(User $user) =>
            $user->hasAnyRole(Role::Student, Role::Instructor, Role::TeachingAssistant, Role::Guest)
        );

        // ── Grading gates ─────────────────────────────────────────────────────

        Gate::define('grade-submissions', fn(User $user) =>
            $user->hasAnyRole(Role::Instructor, Role::TeachingAssistant)
        );

        Gate::define('publish-grades', fn(User $user) =>
            $user->isInstructor()
        );

        Gate::define('view-grades', fn(User $user) =>
            $user->hasAnyRole(Role::Student, Role::Instructor, Role::TeachingAssistant,
                              Role::FacultyAdmin, Role::UniversityAdmin)
        );

        // ── User management gates ─────────────────────────────────────────────

        Gate::define('manage-users', fn(User $user) =>
            $user->isAdministrative()
        );

        Gate::define('import-students', fn(User $user) =>
            $user->hasAnyRole(Role::UniversityAdmin, Role::FacultyAdmin)
        );
    }
}
