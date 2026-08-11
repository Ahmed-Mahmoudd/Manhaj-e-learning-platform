<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tenant>
 */
class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        return [
            'name'           => $this->faker->company() . ' University',
            'subdomain'      => $this->faker->unique()->slug(2),
            'logo'           => null,
            'locale'         => $this->faker->randomElement(['en', 'ar']),
            'timezone'       => $this->faker->randomElement(['UTC', 'Africa/Cairo', 'Asia/Riyadh']),
            'grading_system' => $this->faker->randomElement(['credit_gpa', 'year_percentage']),
            'settings'       => null,
            'is_active'      => true,
        ];
    }
}
