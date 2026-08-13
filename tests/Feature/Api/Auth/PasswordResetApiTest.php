<?php

namespace Tests\Feature\Api\Auth;

use App\Models\Tenant;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PasswordResetApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function forgot_password_returns_generic_message(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'missing@test.com',
        ]);

        $response->assertOk()
                 ->assertJsonPath('message', 'If an account exists for that email, a password reset link has been sent.');

        Notification::assertNothingSent();
    }

    #[Test]
    public function forgot_password_sends_notification_for_existing_user(): void
    {
        Notification::fake();

        $tenant = Tenant::factory()->create();
        $user   = User::factory()->forTenant($tenant)->student()->create([
            'email' => 'student@test.com',
        ]);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'student@test.com',
        ])->assertOk();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    #[Test]
    public function user_can_reset_password_with_valid_token(): void
    {
        Notification::fake();

        $tenant = Tenant::factory()->create();
        $user   = User::factory()->forTenant($tenant)->student()->create([
            'email'    => 'student@test.com',
            'password' => bcrypt('old-password'),
        ]);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'student@test.com',
        ])->assertOk();

        $token = null;
        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        $this->assertNotNull($token);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email'                 => 'student@test.com',
            'token'                 => $token,
            'password'              => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ]);

        $response->assertOk()
                 ->assertJsonPath('message', 'Your password has been reset.');

        $user->refresh();
        $this->assertTrue(Hash::check('new-password-123', $user->password));
    }

    #[Test]
    public function reset_password_rejects_invalid_token(): void
    {
        $tenant = Tenant::factory()->create();
        User::factory()->forTenant($tenant)->student()->create([
            'email' => 'student@test.com',
        ]);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'email'                 => 'student@test.com',
            'token'                 => 'invalid-token',
            'password'              => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ]);

        $response->assertUnprocessable()
                 ->assertJsonValidationErrors(['email']);
    }
}
