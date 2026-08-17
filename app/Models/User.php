<?php

namespace App\Models;

use App\Enums\Role;
use App\Notifications\ResetPasswordNotification;
use App\Tenancy\BelongsToTenant;
use Database\Factories\UserFactory;
use Illuminate\Auth\Passwords\CanResetPassword;
use Illuminate\Contracts\Auth\CanResetPassword as CanResetPasswordContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements CanResetPasswordContract
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, BelongsToTenant, CanResetPassword;

    protected $fillable = [
        'tenant_id',
        'faculty_id',
        'role',
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'role'              => Role::class,
        ];
    }

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    // ─── Role helpers ─────────────────────────────────────────────────────────

    public function hasRole(Role $role): bool
    {
        return $this->role === $role;
    }

    public function hasAnyRole(Role ...$roles): bool
    {
        return in_array($this->role, $roles);
    }

    public function isPlatformAdmin(): bool
    {
        return $this->role === Role::PlatformAdmin;
    }

    public function isUniversityAdmin(): bool
    {
        return $this->role === Role::UniversityAdmin;
    }

    public function isFacultyAdmin(): bool
    {
        return $this->role === Role::FacultyAdmin;
    }

    public function isInstructor(): bool
    {
        return $this->role === Role::Instructor;
    }

    public function isTeachingAssistant(): bool
    {
        return $this->role === Role::TeachingAssistant;
    }

    public function isStudent(): bool
    {
        return $this->role === Role::Student;
    }

    public function isAdministrative(): bool
    {
        return $this->role->isAdministrative();
    }

    public function isTeachingStaff(): bool
    {
        return $this->role->isTeachingStaff();
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
