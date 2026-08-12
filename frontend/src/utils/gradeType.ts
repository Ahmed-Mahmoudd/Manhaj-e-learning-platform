import type { GradeItemType } from '@/types/grades';
import type { MessageKey } from '@/i18n/messages';

const GRADE_TYPE_KEYS: Record<GradeItemType, MessageKey> = {
  assignment: 'gradeType_assignment',
  quiz: 'gradeType_quiz',
  midterm: 'gradeType_midterm',
  final: 'gradeType_final',
  project: 'gradeType_project',
  lab: 'gradeType_lab',
  attendance: 'gradeType_attendance',
};

export function gradeTypeLabel(type: string): MessageKey {
  return GRADE_TYPE_KEYS[type as GradeItemType] ?? 'gradeType_other';
}
