import type { ReactNode } from 'react';

type StatChipVariant = 'neutral' | 'brass' | 'sage' | 'brick';

const VARIANT_CLASS: Record<StatChipVariant, string> = {
  neutral: 'bg-ink/5 text-ink/60',
  brass: 'bg-brass/10 text-brass',
  sage: 'bg-sage/10 text-sage',
  brick: 'bg-brick/10 text-brick',
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
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </span>
  );
}
