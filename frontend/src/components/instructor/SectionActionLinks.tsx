import { Link, useLocation } from 'react-router-dom';
import { useLocale } from '@/i18n/LocaleContext';

export function SectionActionLinks({ sectionId }: { sectionId: number }) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const base = `/instructor/sections/${sectionId}`;

  const links = [
    { to: base, label: t('viewRoster'), exact: true },
    { to: `${base}/grades`, label: t('manageGrades'), exact: false },
    { to: `${base}/announcements`, label: t('manageAnnouncements'), exact: false },
    { to: `${base}/discuss`, label: t('moderateDiscussion'), exact: false },
    { to: `${base}/analytics`, label: t('sectionAnalytics'), exact: false },
  ];

  return (
    <nav aria-label="Section Navigation" className="flex flex-wrap gap-2 pt-1">
      {links.map(({ to, label, exact }) => {
        const isActive = exact ? pathname === to : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              isActive
                ? 'bg-brass text-white shadow-xs'
                : 'bg-paper/70 text-ink/70 hover:bg-paper hover:text-ink border border-ink/10'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
