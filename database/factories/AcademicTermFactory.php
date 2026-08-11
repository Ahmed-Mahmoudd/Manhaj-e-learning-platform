<?php

namespace Database\Factories;

use App\Models\AcademicTerm;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<AcademicTerm> */
class AcademicTermFactory extends Factory
{
    protected $model = AcademicTerm::class;

    public function definition(): array
    {
        $start = $this->faker->dateTimeBetween('-1 year', '+6 months');
        $end   = (clone $start)->modify('+4 months');
        $addDrop = (clone $start)->modify('+2 weeks');

        return [
            'tenant_id'         => Tenant::factory(),
            'type'              => $this->faker->randomElement(['semester', 'summer', 'year']),
            'name'              => 'Term ' . $this->faker->year(),
            'starts_at'         => $start->format('Y-m-d'),
            'ends_at'           => $end->format('Y-m-d'),
            'add_drop_deadline' => $addDrop->format('Y-m-d'),
            'is_active'         => false,
        ];
    }

    public function active(): static
    {
        return $this->state(fn() => ['is_active' => true]);
    }

    public function semester(): static
    {
        return $this->state(fn() => ['type' => 'semester']);
    }
}
