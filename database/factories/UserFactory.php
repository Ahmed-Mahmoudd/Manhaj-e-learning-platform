<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'tenant_id'         => null,
            'role'              => Role::Student->value,
            'name'              => fake()->name(),
            'email'             => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password'          => static::$password ??= Hash::make('password'),
            'remember_token'    => Str::random(10),
        ];
    }

    // ─── Tenant state ──────────────────────────────────────────────────────────

    public function forTenant(Tenant $tenant): static
    {
        return $this->state(fn (array $attributes) => [
            'tenant_id' => $tenant->id,
        ]);
    }

    // ─── Role states ───────────────────────────────────────────────────────────

    public function platformAdmin(): static
    {
        return $this->state(fn () => ['role' => Role::PlatformAdmin->value, 'tenant_id' => null]);
    }

    public function universityAdmin(): static
    {
        return $this->state(fn () => ['role' => Role::UniversityAdmin->value]);
    }

    public function facultyAdmin(): static
    {
        return $this->state(fn () => ['role' => Role::FacultyAdmin->value]);
    }

    public function instructor(): static
    {
        return $this->state(fn () => ['role' => Role::Instructor->value]);
    }

    public function teachingAssistant(): static
    {
        return $this->state(fn () => ['role' => Role::TeachingAssistant->value]);
    }

    public function student(): static
    {
        return $this->state(fn () => ['role' => Role::Student->value]);
    }

    public function guest(): static
    {
        return $this->state(fn () => ['role' => Role::Guest->value]);
    }

    // ─── Other states ──────────────────────────────────────────────────────────

    public function unverified(): static
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }
}
