import type { ReactNode } from 'react';

/** Small annotated margin note for at-risk / waitlist / attention states */
export function MarginNote({
  children,
  tone = 'brick',
}: {
  children: ReactNode;
  tone?: 'brick' | 'sage';
}) {
  const color = tone === 'sage' ? 'text-sage border-sage/40' : 'text-brick border-brick/40';
  return (
    <aside
      className={`border-s-2 ps-2 text-xs leading-snug ${color}`}
      aria-label="Note"
    >
      {children}
    </aside>
  );
}
