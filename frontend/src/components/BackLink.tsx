import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/LocaleContext';

export function BackLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { dir } = useLocale();
  const arrow = dir === 'rtl' ? '→' : '←';

  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-amber-600">
      <span className="inline-block transition-transform hover:-translate-x-0.5 rtl:hover:translate-x-0.5">{arrow}</span>
      <span>{children}</span>
    </Link>
  );
}
