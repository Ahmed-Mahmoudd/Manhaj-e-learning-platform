import type { MessageKey } from '@/i18n/messages';

const REASON_KEYS: Record<string, MessageKey> = {
  'You are already enrolled in this section.': 'eligibilityAlreadyEnrolled',
  'You are already on the waitlist for this section.': 'eligibilityAlreadyWaitlisted',
  'This section is not currently accepting enrolments.': 'eligibilitySectionInactive',
  'Prerequisites not met.': 'eligibilityPrerequisitesNotMet',
  'Section is full — you will be placed on the waitlist.': 'eligibilitySectionFullWaitlist',
};

export function eligibilityReasonText(
  reason: string | null | undefined,
  t: (key: MessageKey) => string,
): string | null {
  if (!reason) return null;
  const key = REASON_KEYS[reason];
  return key ? t(key) : reason;
}
