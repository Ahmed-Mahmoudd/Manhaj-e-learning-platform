<?php

namespace App\Models;

use App\Enums\Role;
use App\Tenancy\BelongsToTenant;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
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
            'role'              => Role::class,  // auto-cast string → Role enum
        ];
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
}
