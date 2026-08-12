import type { MessageKey } from '@/i18n/messages';
import type { ThreadType } from '@/types/discussion';

const TYPE_KEYS: Record<ThreadType, MessageKey> = {
  general: 'threadType_general',
  question: 'threadType_question',
  resource: 'threadType_resource',
};

export function threadTypeLabel(type: string): MessageKey {
  return TYPE_KEYS[type as ThreadType] ?? 'threadType_general';
}
