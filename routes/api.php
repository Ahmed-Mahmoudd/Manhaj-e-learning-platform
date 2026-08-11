<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Admin\CourseAdminController;
use App\Http\Controllers\Api\V1\Admin\DepartmentController;
use App\Http\Controllers\Api\V1\Admin\FacultyController;
use App\Http\Controllers\Api\V1\Admin\SectionAdminController;
use App\Http\Controllers\Api\V1\Admin\TermController;
use App\Http\Controllers\Api\V1\Admin\UserAdminController;
use App\Http\Controllers\Api\V1\CourseCatalogueController;
use App\Http\Controllers\Api\V1\DiscussionController;
use App\Http\Controllers\Api\V1\Instructor\AnnouncementController as InstructorAnnouncementController;
use App\Http\Controllers\Api\V1\Instructor\GradeController;
use App\Http\Controllers\Api\V1\Instructor\InstructorDashboardController;
use App\Http\Controllers\Api\V1\Platform\PlatformUserController;
use App\Http\Controllers\Api\V1\Platform\TenantController;
use App\Http\Controllers\Api\V1\Student\EnrolmentController;
use App\Http\Controllers\Api\V1\Student\StudentAnnouncementController;
use App\Http\Controllers\Api\V1\Student\StudentDashboardController;
use App\Http\Controllers\Api\V1\Student\StudentGradeController;
use App\Http\Controllers\Api\V1\Internal\MlRecommendationController;
use App\Http\Controllers\Api\V1\Student\RecommendationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Version 1
|--------------------------------------------------------------------------
|
| ResolveTenant middleware runs automatically on all API requests
| (registered in bootstrap/app.php as part of the 'api' group).
|
| Route protection layers:
|   auth:sanctum   — valid Bearer token required
|   require.tenant — X-Tenant-ID header required
|   role:X         — specific role required
|
*/

Route::prefix('v1')->group(function () {

    // ── Public: auth ──────────────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('login', [AuthController::class, 'login']);
    });

    // ── Protected: all authenticated users ───────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        Route::prefix('auth')->group(function () {
            Route::get('me',      [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
        });

        // ── Tenant-scoped routes (X-Tenant-ID required) ──────────────────
        Route::middleware('require.tenant')->group(function () {

            // ── Course Catalogue (any authenticated user) ─────────────────
            Route::prefix('catalogue')->group(function () {
                Route::get('courses',                       [CourseCatalogueController::class, 'index']);
                Route::get('courses/{course}',              [CourseCatalogueController::class, 'show']);
                Route::get('sections/{section}/availability',[CourseCatalogueController::class, 'sectionAvailability']);
            });

            // Student dashboard
            Route::middleware('role:student')->prefix('student')->group(function () {
                Route::get('courses',                              [StudentDashboardController::class, 'myCourses']);
                Route::get('sections/{section}/lessons',           [StudentDashboardController::class, 'sectionLessons']);
                Route::post('lessons/{lesson}/progress',           [StudentDashboardController::class, 'updateProgress']);
                Route::get('grades',                               [StudentGradeController::class, 'myGrades']);
                Route::get('announcements',                        [StudentAnnouncementController::class, 'index']);
                Route::post('announcements/{announcement}/read',   [StudentAnnouncementController::class, 'markRead']);
                // Enrolment self-service
                Route::get('enrolments',                           [EnrolmentController::class, 'index']);
                Route::get('sections/{section}/eligibility',       [EnrolmentController::class, 'eligibility']);
                Route::post('sections/{section}/enrol',            [EnrolmentController::class, 'enrol']);
                Route::post('enrolments/{enrolment}/drop',         [EnrolmentController::class, 'drop']);
                // ML Recommendations
                Route::get('recommendations',                       [RecommendationController::class, 'index']);
            });

            // Instructor / TA dashboard
            Route::middleware('role:instructor,teaching_assistant')
                 ->prefix('instructor')
                 ->group(function () {
                     Route::get('sections',                                    [InstructorDashboardController::class, 'mySections']);
                     Route::get('sections/{section}/enrolments',               [InstructorDashboardController::class, 'sectionEnrolments']);
                     // Grade items
                     Route::get('sections/{section}/grade-items',              [GradeController::class, 'index']);
                     Route::post('sections/{section}/grade-items',             [GradeController::class, 'store']);
                     // Individual grades
                     Route::post('grade-items/{item}/grades/{student}',        [GradeController::class, 'enterGrade']);
                     Route::get('grade-items/{item}/grades',                   [GradeController::class, 'grades']);
                     Route::post('grade-items/{item}/publish',                 [GradeController::class, 'publish']);
                     // Announcements
                     Route::get('sections/{section}/announcements',            [InstructorAnnouncementController::class, 'index']);
                     Route::post('sections/{section}/announcements',           [InstructorAnnouncementController::class, 'store']);
                     Route::post('announcements/{announcement}/publish',       [InstructorAnnouncementController::class, 'publish']);
                 });

            // ── Discussion forum — shared (student + instructor + TA) ─────────
            Route::middleware('role:student,instructor,teaching_assistant')
                 ->prefix('discuss')
                 ->group(function () {
                     // Thread list & view
                     Route::get('sections/{section}/threads',   [DiscussionController::class, 'threads']);
                     Route::get('threads/{thread}',             [DiscussionController::class, 'show']);
                     // Create thread / reply
                     Route::post('sections/{section}/threads',  [DiscussionController::class, 'store']);
                     Route::post('threads/{thread}/posts',      [DiscussionController::class, 'addPost']);
                     // Upvote (toggle)
                     Route::post('posts/{post}/vote',           [DiscussionController::class, 'vote']);
                     // Instructor-gated (assertInstructor() inside controller)
                     Route::post('threads/{thread}/pin',        [DiscussionController::class, 'pin']);
                     Route::post('threads/{thread}/lock',       [DiscussionController::class, 'lock']);
                     Route::post('posts/{post}/answer',         [DiscussionController::class, 'markAnswer']);
                 });

            // ── University Admin ──────────────────────────────────────────────
            Route::middleware('role:university_admin')
                 ->prefix('admin')
                 ->group(function () {
                     Route::get('faculties',              [FacultyController::class, 'index']);
                     Route::post('faculties',             [FacultyController::class, 'store']);
                     Route::get('faculties/{faculty}',    [FacultyController::class, 'show']);
                     Route::patch('faculties/{faculty}',  [FacultyController::class, 'update']);
                     Route::delete('faculties/{faculty}', [FacultyController::class, 'destroy']);

                     Route::get('departments',               [DepartmentController::class, 'index']);
                     Route::post('departments',              [DepartmentController::class, 'store']);
                     Route::get('departments/{department}',  [DepartmentController::class, 'show']);
                     Route::patch('departments/{department}',[DepartmentController::class, 'update']);
                     Route::delete('departments/{department}',[DepartmentController::class, 'destroy']);

                     Route::get('terms',          [TermController::class, 'index']);
                     Route::post('terms',         [TermController::class, 'store']);
                     Route::get('terms/{term}',   [TermController::class, 'show']);
                     Route::patch('terms/{term}', [TermController::class, 'update']);
                     Route::post('terms/{term}/activate',   [TermController::class, 'activate']);
                     Route::post('terms/{term}/deactivate', [TermController::class, 'deactivate']);

                     Route::get('courses',            [CourseAdminController::class, 'index']);
                     Route::post('courses',           [CourseAdminController::class, 'store']);
                     Route::get('courses/{course}',   [CourseAdminController::class, 'show']);
                     Route::patch('courses/{course}', [CourseAdminController::class, 'update']);
                     Route::delete('courses/{course}',[CourseAdminController::class, 'destroy']);

                     Route::get('sections',             [SectionAdminController::class, 'index']);
                     Route::post('sections',            [SectionAdminController::class, 'store']);
                     Route::get('sections/{section}',   [SectionAdminController::class, 'show']);
                     Route::patch('sections/{section}', [SectionAdminController::class, 'update']);
                     Route::delete('sections/{section}',[SectionAdminController::class, 'destroy']);

                     Route::get('users',               [UserAdminController::class, 'index']);
                     Route::post('users',              [UserAdminController::class, 'store']);
                     Route::get('users/{user}',        [UserAdminController::class, 'show']);
                     Route::patch('users/{user}/role', [UserAdminController::class, 'updateRole']);
                 });

        });
    });
});

// ─── Platform Admin Routes (no tenant scope needed) ─────────────────────────
Route::prefix('v1/platform')
     ->middleware(['auth:sanctum', 'role:platform_admin'])
     ->group(function () {
         Route::get('tenants',                       [TenantController::class, 'index']);
         Route::post('tenants',                      [TenantController::class, 'store']);
         Route::get('tenants/{tenant}',              [TenantController::class, 'show']);
         Route::patch('tenants/{tenant}',            [TenantController::class, 'update']);
         Route::post('tenants/{tenant}/activate',    [TenantController::class, 'activate']);
         Route::post('tenants/{tenant}/deactivate',  [TenantController::class, 'deactivate']);
         Route::get('tenants/{tenant}/stats',        [TenantController::class, 'stats']);

         Route::get('users',                         [PlatformUserController::class, 'index']);
         Route::post('users',                        [PlatformUserController::class, 'store']);
         Route::get('users/{user}',                  [PlatformUserController::class, 'show']);
         Route::post('users/{user}/impersonate',     [PlatformUserController::class, 'impersonate']);
     });

// ─── INTERN B — Internal ML integration (machine-to-machine) ───────────────
Route::prefix('v1/internal')
     ->middleware('internal.token')
     ->group(function () {
         Route::post('ml/recommendations', [MlRecommendationController::class, 'ingest']);
         Route::post('webhook',            [MlRecommendationController::class, 'webhook']);
     });
