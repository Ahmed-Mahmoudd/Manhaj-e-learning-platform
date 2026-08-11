<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Faculty;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Department> */
class DepartmentFactory extends Factory
{
    protected $model = Department::class;

    public function definition(): array
    {
        $names = [
            ['en' => 'Computer Engineering',      'ar' => 'هندسة الحاسبات'],
            ['en' => 'Civil Engineering',         'ar' => 'الهندسة المدنية'],
            ['en' => 'Mathematics',               'ar' => 'الرياضيات'],
            ['en' => 'Physics',                   'ar' => 'الفيزياء'],
            ['en' => 'Accounting',                'ar' => 'المحاسبة'],
            ['en' => 'Business Administration',   'ar' => 'إدارة الأعمال'],
        ];

        $pick = $this->faker->randomElement($names);

        return [
            'tenant_id'  => fn(array $attrs) => Faculty::find($attrs['faculty_id'])->tenant_id,
            'faculty_id' => Faculty::factory(),
            'name_en'    => $pick['en'],
            'name_ar'    => $pick['ar'],
            'code'       => strtoupper($this->faker->lexify('????')),
            'is_active'  => true,
        ];
    }
}
