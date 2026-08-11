<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Version 1
|--------------------------------------------------------------------------
|
| All routes are prefixed /api/v1 (Laravel adds /api, we add v1 below).
|
*/

Route::prefix('v1')->group(function () {

    // ── Public auth endpoints ─────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('login',  [AuthController::class, 'login']);
    });

    // ── Protected endpoints (Sanctum token required) ──────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        Route::prefix('auth')->group(function () {
            Route::get('me',      [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
        });

    });
});
