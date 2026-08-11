<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Course> */
class CourseFactory extends Factory
{
    protected $model = Course::class;

    public function definition(): array
    {
        return [
            'tenant_id'     => fn(array $attrs) => Department::find($attrs['department_id'])->tenant_id,
            'department_id' => Department::factory(),
            'code'          => strtoupper($this->faker->lexify('??') . $this->faker->numberBetween(100, 499)),
            'title_en'      => $this->faker->randomElement([
                'Introduction to Programming',
                'Data Structures',
                'Algorithms',
                'Database Systems',
                'Operating Systems',
                'Software Engineering',
                'Computer Networks',
                'Calculus I',
            ]),
            'title_ar'      => 'مقرر دراسي',
            'credit_hours'  => $this->faker->randomElement([2, 3, 4]),
            'description'   => $this->faker->sentence(),
            'is_active'     => true,
        ];
    }
}
