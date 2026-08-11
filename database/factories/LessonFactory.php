<?php

namespace Database\Factories;

use App\Models\Lesson;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Lesson> */
class LessonFactory extends Factory
{
    protected $model = Lesson::class;

    public function definition(): array
    {
        return [
            'tenant_id'    => null, // must be supplied explicitly
            'module_id'    => Module::factory(),
            'title'        => $this->faker->sentence(4),
            'type'         => 'text',
            'body'         => $this->faker->paragraphs(3, true),
            'url'          => null,
            'file_path'    => null,
            'duration_seconds' => null,
            'order'        => $this->faker->numberBetween(1, 20),
            'release_at'   => null,
            'is_published' => true,
            'is_previewable' => false,
        ];
    }

    public function video(): static
    {
        return $this->state(fn() => [
            'type'             => 'video',
            'url'              => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'duration_seconds' => $this->faker->numberBetween(300, 3600),
            'body'             => null,
        ]);
    }

    public function pdf(): static
    {
        return $this->state(fn() => [
            'type'      => 'pdf',
            'file_path' => 'lessons/sample.pdf',
            'body'      => null,
        ]);
    }

    public function unpublished(): static
    {
        return $this->state(fn() => ['is_published' => false]);
    }
}
