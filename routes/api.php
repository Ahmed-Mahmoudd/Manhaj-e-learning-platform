<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\DiscussionController;
use App\Http\Controllers\Api\V1\Instructor\AnnouncementController as InstructorAnnouncementController;
use App\Http\Controllers\Api\V1\Instructor\GradeController;
use App\Http\Controllers\Api\V1\Instructor\InstructorDashboardController;
use App\Http\Controllers\Api\V1\Student\StudentAnnouncementController;
use App\Http\Controllers\Api\V1\Student\StudentDashboardController;
use App\Http\Controllers\Api\V1\Student\StudentGradeController;
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

            // Student dashboard
            Route::middleware('role:student')->prefix('student')->group(function () {
                Route::get('courses',                         [StudentDashboardController::class, 'myCourses']);
                Route::get('sections/{section}/lessons',      [StudentDashboardController::class, 'sectionLessons']);
                Route::post('lessons/{lesson}/progress',      [StudentDashboardController::class, 'updateProgress']);
                Route::get('grades',                          [StudentGradeController::class, 'myGrades']);
                Route::get('announcements',                   [StudentAnnouncementController::class, 'index']);
                Route::post('announcements/{announcement}/read', [StudentAnnouncementController::class, 'markRead']);
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

        });
    });
});
