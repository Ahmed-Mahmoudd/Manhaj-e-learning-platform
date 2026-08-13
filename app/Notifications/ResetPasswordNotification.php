<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontend = rtrim((string) config('app.frontend_url'), '/');
        $email    = urlencode($notifiable->getEmailForPasswordReset());
        $url      = "{$frontend}/reset-password?token={$this->token}&email={$email}";

        $expire = (int) config('auth.passwords.users.expire', 60);

        return (new MailMessage)
            ->subject('Reset your password')
            ->line('You are receiving this email because we received a password reset request for your account.')
            ->action('Reset password', $url)
            ->line("This link expires in {$expire} minutes.")
            ->line('If you did not request a password reset, no further action is required.');
    }
}
