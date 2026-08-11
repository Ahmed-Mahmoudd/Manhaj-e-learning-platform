<?php

namespace Database\Factories;

use App\Models\Faculty;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Faculty> */
class FacultyFactory extends Factory
{
    protected $model = Faculty::class;

    public function definition(): array
    {
        $names = [
            ['en' => 'Faculty of Engineering',         'ar' => 'كلية الهندسة'],
            ['en' => 'Faculty of Science',             'ar' => 'كلية العلوم'],
            ['en' => 'Faculty of Commerce',            'ar' => 'كلية التجارة'],
            ['en' => 'Faculty of Arts',                'ar' => 'كلية الآداب'],
            ['en' => 'Faculty of Medicine',            'ar' => 'كلية الطب'],
            ['en' => 'Faculty of Computer Science',    'ar' => 'كلية علوم الحاسب'],
        ];

        $pick = $this->faker->randomElement($names);

        return [
            'tenant_id' => Tenant::factory(),
            'name_en'   => $pick['en'],
            'name_ar'   => $pick['ar'],
            'code'      => strtoupper($this->faker->lexify('???')),
            'is_active' => true,
        ];
    }
}
