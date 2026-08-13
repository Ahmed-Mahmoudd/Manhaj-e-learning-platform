import { useLocale } from '@/i18n/LocaleContext';
import type { ThreadSummary } from '@/types/discussion';
import { threadTypeLabel } from '@/utils/threadType';

interface ThreadBadgesProps {
  thread: Pick<
    ThreadSummary,
    'type' | 'is_pinned' | 'is_locked' | 'is_resolved'
  >;
}

function PinIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M9.5 1.5 8 3 5.5 2 4 3.5v3L2 9.5v1h4.5L6 14h1l.5-3.5H12v-1l-2-3V3.5L9.5 1.5Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

function ResolvedIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <span className="flex size-3.5 items-center justify-center rounded-full bg-brass/20 text-[10px] font-bold leading-none text-brass">
      ?
    </span>
  );
}

export function ThreadBadges({ thread }: ThreadBadgesProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {thread.is_pinned && (
        <span
          className="inline-flex items-center gap-1 rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-brass"
          title={t('pinned')}
        >
          <PinIcon />
          {t('pinned')}
        </span>
      )}
      {thread.is_locked && (
        <span
          className="inline-flex items-center gap-1 rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink/50"
          title={t('locked')}
        >
          <LockIcon />
          {t('locked')}
        </span>
      )}
      {thread.is_resolved && (
        <span
          className="inline-flex items-center gap-1 rounded bg-sage/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-sage"
          title={t('resolved')}
        >
          <ResolvedIcon />
          {t('resolved')}
        </span>
      )}
      {thread.type === 'question' && !thread.is_resolved && (
        <span
          className="inline-flex items-center gap-1 rounded bg-brass/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-brass"
          title={t('threadType_question')}
        >
          <QuestionIcon />
          {t('threadType_question')}
        </span>
      )}
      {thread.type !== 'question' && (
        <span className="text-[10px] uppercase text-ink/35">
          {t(threadTypeLabel(thread.type))}
        </span>
      )}
    </div>
  );
}
