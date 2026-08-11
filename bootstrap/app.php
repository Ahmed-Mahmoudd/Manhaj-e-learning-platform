<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role'           => \App\Http\Middleware\EnsureRole::class,
            'tenant'         => \App\Http\Middleware\ResolveTenant::class,
            'require.tenant' => \App\Http\Middleware\RequireTenant::class,
        ]);

        // Resolve tenant on every API request (optional header, no-op if absent)
        $middleware->appendToGroup('api', \App\Http\Middleware\ResolveTenant::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
