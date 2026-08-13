import DOMPurify, { type Config } from 'dompurify';

/** Tags allowed in instructor-authored lesson HTML. */
const ALLOWED_TAGS = [
  'p',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'br',
  'blockquote',
  'code',
  'pre',
  'img',
  'span',
  'div',
];

/** Attributes kept on allowed tags (`src`/`href` only — no event handlers). */
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class'];

const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Sanitize untrusted HTML before rendering with `dangerouslySetInnerHTML`.
 * Strips scripts, event handlers, javascript: URLs, and embedded objects.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG);
}
