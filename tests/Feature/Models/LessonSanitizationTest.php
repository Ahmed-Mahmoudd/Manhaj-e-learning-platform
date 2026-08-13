<?php

namespace Tests\Feature\Models;

use App\Models\Course;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Tenant;
use App\Tenancy\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class LessonSanitizationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    private function scaffoldModule(): array
    {
        $tenant  = Tenant::factory()->create();
        $faculty = Faculty::factory()->create(['tenant_id' => $tenant->id]);
        $dept    = Department::factory()->create(['tenant_id' => $tenant->id, 'faculty_id' => $faculty->id]);
        $course  = Course::factory()->create(['tenant_id' => $tenant->id, 'department_id' => $dept->id]);
        $module  = Module::factory()->create(['tenant_id' => $tenant->id, 'course_id' => $course->id]);

        return compact('tenant', 'module');
    }

    #[Test]
    public function text_lesson_body_is_sanitized_on_save(): void
    {
        ['tenant' => $tenant, 'module' => $module] = $this->scaffoldModule();

        $lesson = Lesson::factory()->create([
            'tenant_id' => $tenant->id,
            'module_id' => $module->id,
            'type'      => 'text',
            'body'      => '<p>Safe</p><script>alert("xss")</script>',
        ]);

        $this->assertStringContainsString('Safe', $lesson->body);
        $this->assertStringNotContainsString('script', $lesson->body);
    }

    #[Test]
    public function non_text_lessons_are_not_sanitized(): void
    {
        ['tenant' => $tenant, 'module' => $module] = $this->scaffoldModule();

        $url = 'https://example.com/video';

        $lesson = Lesson::factory()->video()->create([
            'tenant_id' => $tenant->id,
            'module_id' => $module->id,
            'url'       => $url,
        ]);

        $this->assertSame($url, $lesson->url);
    }
}
