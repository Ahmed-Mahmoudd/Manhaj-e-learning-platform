import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '@/utils/sanitizeHtml';

describe('sanitizeHtml', () => {
  it('strips script tags and inline event handlers', () => {
    const dirty =
      '<p>Hello</p><script>alert(1)</script><img src="x" onerror="alert(1)" alt="x">';
    const clean = sanitizeHtml(dirty);

    expect(clean).not.toMatch(/script/i);
    expect(clean).not.toMatch(/onerror/i);
    expect(clean).toContain('Hello');
    expect(clean).toMatch(/<img[^>]*src="x"[^>]*alt="x"/);
  });

  it('preserves common formatting tags', () => {
    const dirty = '<p>Intro</p><strong>bold</strong> and <em>italic</em>';
    const clean = sanitizeHtml(dirty);

    expect(clean).toBe('<p>Intro</p><strong>bold</strong> and <em>italic</em>');
  });

  it('blocks javascript: links', () => {
    const dirty = '<a href="javascript:alert(1)">click</a>';
    const clean = sanitizeHtml(dirty);

    expect(clean).not.toMatch(/javascript:/i);
  });
});
