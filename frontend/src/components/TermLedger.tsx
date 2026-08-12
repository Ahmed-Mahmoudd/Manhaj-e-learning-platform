import { useMemo } from 'react';
import { useLocale } from '@/i18n/LocaleContext';

interface TermLedgerProps {
  startsAt: string | null;
  endsAt: string | null;
  /** Term name, e.g. "Fall 2025/2026" */
  label?: string;
  /** page = section header; inline = demoted row on course cards */
  variant?: 'page' | 'inline';
}

const TOTAL_WEEKS = 16;

function computeWeekPosition(startsAt: string | null, endsAt: string | null): number {
  if (!startsAt || !endsAt) return 0;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return TOTAL_WEEKS - 1;
  const ratio = (now - start) / (end - start);
  return Math.min(TOTAL_WEEKS - 1, Math.floor(ratio * TOTAL_WEEKS));
}

function isTermEnding(endsAt: string | null, currentWeek: number): boolean {
  if (currentWeek >= TOTAL_WEEKS - 1) return true;
  if (!endsAt) return false;
  const daysLeft = (new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft <= 14 && daysLeft >= 0;
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden
    >
      <rect x="2" y="3" width="12" height="11" rx="1" />
      <path d="M2 6.5h12M5 1.5v2M11 1.5v2" />
    </svg>
  );
}

/**
 * Academic-term *time* indicator — not content completion.
 * Text-first; visually distinct from ProgressBar (no fill bar).
 */
export function TermLedger({
  startsAt,
  endsAt,
  label,
  variant = 'page',
}: TermLedgerProps) {
  const { t } = useLocale();
  const currentWeek = useMemo(
    () => computeWeekPosition(startsAt, endsAt),
    [startsAt, endsAt],
  );
  const ending = isTermEnding(endsAt, currentWeek);

  const weekText = ending
    ? t('termWeekEnding', { current: currentWeek + 1, total: TOTAL_WEEKS })
    : t('termWeekProgress', { current: currentWeek + 1, total: TOTAL_WEEKS });

  if (variant === 'inline') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink/45">
        <CalendarIcon className="size-3.5 shrink-0 text-ink/30" />
        <span>
          {label && <span className="text-ink/55">{label} · </span>}
          {weekText}
        </span>
      </p>
    );
  }

  return (
    <div className="border border-ink/10 border-dashed bg-paper/50 px-4 py-3">
      <div className="flex items-start gap-2">
        <CalendarIcon className="mt-0.5 size-4 shrink-0 text-ink/35" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink/40">{t('termCalendar')}</p>
          {label && (
            <p className="mt-0.5 text-sm font-medium text-ink/70">{label}</p>
          )}
          <p className="mt-1 font-mono text-xs text-ink/55">{weekText}</p>
        </div>
      </div>
    </div>
  );
}
