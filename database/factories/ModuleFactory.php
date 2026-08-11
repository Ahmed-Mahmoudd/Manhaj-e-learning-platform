<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Module> */
class ModuleFactory extends Factory
{
    protected $model = Module::class;

    public function definition(): array
    {
        return [
            'tenant_id'               => null, // must be supplied explicitly
            'course_id'               => Course::factory(),
            'title'                   => $this->faker->randomElement([
                'Introduction', 'Core Concepts', 'Advanced Topics',
                'Practical Applications', 'Review & Assessment',
            ]),
            'description'             => $this->faker->sentence(),
            'order'                   => $this->faker->numberBetween(1, 10),
            'release_at'              => null,
            'release_after_module_id' => null,
            'is_published'            => true,
        ];
    }

    public function unpublished(): static
    {
        return $this->state(fn() => ['is_published' => false]);
    }
}
