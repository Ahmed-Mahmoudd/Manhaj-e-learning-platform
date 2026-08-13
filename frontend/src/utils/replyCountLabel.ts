import type { MessageKey } from '@/i18n/messages';

export function replyCountLabel(
  count: number,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  return count === 1
    ? t('replyCountOne', { count })
    : t('replyCountMany', { count });
}
