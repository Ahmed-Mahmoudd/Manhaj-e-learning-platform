import { LessonType } from '@/types/student';
import { MessageKey } from '@/i18n/messages';

const TYPE_KEYS: Record<LessonType, MessageKey> = {
  video: 'lessonType_video',
  text: 'lessonType_text',
  pdf: 'lessonType_pdf',
  link: 'lessonType_link',
  download: 'lessonType_download',
};

export function lessonTypeLabel(type: string): MessageKey {
  return TYPE_KEYS[type as LessonType] ?? 'lessonType_text';
}
