import type { MessageKey } from '@/i18n/messages';
import type { AnnouncementType } from '@/types/announcements';

const TYPE_KEYS: Record<AnnouncementType, MessageKey> = {
  general: 'announcementType_general',
  assignment: 'announcementType_assignment',
  exam: 'announcementType_exam',
};

export function announcementTypeLabel(type: string): MessageKey {
  return TYPE_KEYS[type as AnnouncementType] ?? 'announcementType_general';
}
