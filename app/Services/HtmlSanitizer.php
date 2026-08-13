<?php

namespace App\Services;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * Server-side HTML sanitization for instructor-authored lesson content.
 * Mirrors the allow-list used by the frontend DOMPurify config.
 */
class HtmlSanitizer
{
    private HTMLPurifier $purifier;

    public function __construct()
    {
        $config = HTMLPurifier_Config::createDefault();
        $config->set(
            'HTML.Allowed',
            'p,strong,em,b,i,u,ul,ol,li,a[href|title|class],h1,h2,h3,h4,h5,h6,br,blockquote,code,pre,img[src|alt|title|class],span[class],div[class]',
        );
        $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true]);
        $config->set('HTML.Nofollow', true);

        $this->purifier = new HTMLPurifier($config);
    }

    public function sanitize(?string $html): ?string
    {
        if ($html === null || $html === '') {
            return $html;
        }

        return $this->purifier->purify($html);
    }
}
