import { ApiError } from '@/api/client';
import type { MessageKey } from '@/i18n/messages';

const KNOWN_MESSAGE_KEYS: Record<string, MessageKey> = {
  'Not enrolled in this section.': 'errorNotEnrolledSection',
  'Not enrolled in this course.': 'errorNotEnrolledCourse',
  'This module is not yet available.': 'errorModuleNotAvailable',
  'This lesson is not yet available.': 'errorLessonNotAvailable',
};

/** Safe user-facing message — hides raw 500 bodies; maps known API strings when possible. */
export function apiErrorMessage(
  err: Error,
  networkError: string,
  serverError: string,
  translate?: (key: MessageKey) => string,
): string {
  if (err instanceof ApiError) {
    if (translate && err.serverMessage) {
      const key = KNOWN_MESSAGE_KEYS[err.serverMessage];
      if (key) return translate(key);
    }
    return err.userMessage(networkError, serverError);
  }
  return networkError;
}
