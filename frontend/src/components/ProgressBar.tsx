import { useLocale } from '@/i18n/LocaleContext';

interface ProgressBarProps {
  /** 0–100 completion value */
  value: number;
  /** Accessible label; defaults to "completion" translation */
  label?: string;
  /** Show numeric label row above the bar */
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Chronological / completion progress — fill grows from inline-start (LTR: left, RTL: right).
 */
export function ProgressBar({
  value,
  label,
  showLabel = true,
  size = 'md',
}: ProgressBarProps) {
  const { t } = useLocale();
  const clamped = Math.min(100, Math.max(0, value));
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-ink/70">
            {label ?? t('contentProgress')}
          </span>
          <span className="font-mono text-sm text-ink">{clamped}%</span>
        </div>
      )}
      <div
        className={`flex ${height} w-full overflow-hidden bg-ink/10`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? t('contentProgress')}
      >
        <div
          className="h-full shrink-0 bg-sage transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
