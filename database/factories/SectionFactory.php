<?php

namespace Database\Factories;

use App\Models\AcademicTerm;
use App\Models\Course;
use App\Models\Section;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Section> */
class SectionFactory extends Factory
{
    protected $model = Section::class;

    public function definition(): array
    {
        return [
            'tenant_id'        => null, // must be supplied explicitly
            'course_id'        => Course::factory(),
            'academic_term_id' => AcademicTerm::factory(),
            'instructor_id'    => User::factory()->instructor(),
            'section_number'   => $this->faker->numberBetween(1, 9),
            'capacity'         => $this->faker->randomElement([25, 30, 40, 50]),
            'schedule'         => null,
            'is_active'        => true,
        ];
    }
}
