import type { ReactNode } from 'react';

type StatChipVariant = 'neutral' | 'brass' | 'sage' | 'brick';

const VARIANT_CLASS: Record<StatChipVariant, string> = {
  neutral: 'bg-paper text-ink/70 border border-ink/10',
  brass: 'bg-brass/10 text-brass border border-brass/20',
  sage: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  brick: 'bg-brick/10 text-brick border border-brick/20',
};

export function StatChip({
  children,
  variant = 'neutral',
}: {
  children: ReactNode;
  variant?: StatChipVariant;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </span>
  );
}
