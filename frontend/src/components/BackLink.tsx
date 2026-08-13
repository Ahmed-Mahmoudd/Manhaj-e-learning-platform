import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/LocaleContext';

export function BackLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { dir } = useLocale();
  const arrow = dir === 'rtl' ? '→' : '←';

  return (
    <Link to={to} className="text-sm text-ink/50 transition hover:text-brass">
      {dir === 'rtl' ? (
        <>
          {children} {arrow}
        </>
      ) : (
        <>
          {arrow} {children}
        </>
      )}
    </Link>
  );
}
