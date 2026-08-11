<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Programme;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Programme> */
class ProgrammeFactory extends Factory
{
    protected $model = Programme::class;

    public function definition(): array
    {
        return [
            'tenant_id'      => fn(array $attrs) => Department::find($attrs['department_id'])->tenant_id,
            'department_id'  => Department::factory(),
            'name_en'        => $this->faker->randomElement([
                'Bachelor of Computer Science',
                'Bachelor of Electrical Engineering',
                'Bachelor of Business Administration',
                'Bachelor of Science in Mathematics',
            ]),
            'name_ar'        => $this->faker->randomElement([
                'بكالوريوس علوم الحاسب',
                'بكالوريوس الهندسة الكهربائية',
                'بكالوريوس إدارة الأعمال',
                'بكالوريوس العلوم في الرياضيات',
            ]),
            'code'           => strtoupper($this->faker->lexify('???')),
            'grading_type'   => $this->faker->randomElement(['credit_gpa', 'year_percentage']),
            'duration_years' => $this->faker->randomElement([3, 4, 5]),
            'is_active'      => true,
        ];
    }

    public function creditGpa(): static
    {
        return $this->state(fn() => ['grading_type' => 'credit_gpa']);
    }

    public function yearPercentage(): static
    {
        return $this->state(fn() => ['grading_type' => 'year_percentage']);
    }
}
