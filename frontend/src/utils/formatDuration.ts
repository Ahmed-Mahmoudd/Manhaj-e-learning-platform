import type { MessageKey } from '@/i18n/messages';

export function formatLessonDuration(
  seconds: number | null,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  return t('durationMinutes', { count: minutes });
}
