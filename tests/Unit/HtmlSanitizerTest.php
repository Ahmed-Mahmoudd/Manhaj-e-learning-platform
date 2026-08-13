<?php

namespace Tests\Unit;

use App\Services\HtmlSanitizer;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HtmlSanitizerTest extends TestCase
{
    #[Test]
    public function it_strips_script_tags(): void
    {
        $sanitizer = new HtmlSanitizer();

        $clean = $sanitizer->sanitize('<p>Hello</p><script>alert(1)</script>');

        $this->assertStringContainsString('Hello', $clean);
        $this->assertStringNotContainsString('script', $clean);
    }

    #[Test]
    public function it_strips_onclick_handlers(): void
    {
        $sanitizer = new HtmlSanitizer();

        $clean = $sanitizer->sanitize('<p onclick="alert(1)">Click</p>');

        $this->assertStringNotContainsString('onclick', $clean);
        $this->assertStringContainsString('Click', $clean);
    }

    #[Test]
    public function it_allows_safe_formatting_tags(): void
    {
        $sanitizer = new HtmlSanitizer();

        $clean = $sanitizer->sanitize('<h2>Title</h2><p><strong>Bold</strong></p>');

        $this->assertStringContainsString('<h2>', $clean);
        $this->assertStringContainsString('<strong>', $clean);
    }
}
