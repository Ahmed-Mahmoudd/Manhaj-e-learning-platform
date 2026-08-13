import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { displayRole } from '@/auth/roles';
import { announcementKeys, fetchAnnouncements } from '@/api/announcements';
import { fetchMyGrades, studentKeys } from '@/api/student';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLocale } from '@/i18n/LocaleContext';
import type { MessageKey } from '@/i18n/messages';
import { countUnseenGrades, getGradesLastSeenAt } from '@/utils/gradesSeen';

type NavBadge = 'announcements' | 'grades';

const NAV: { to: string; labelKey: MessageKey; end: boolean; badge?: NavBadge }[] = [
  { to: '/student', labelKey: 'navMyCourses', end: true },
  { to: '/student/catalogue', labelKey: 'navCatalogue', end: false },
  { to: '/student/grades', labelKey: 'navGrades', end: false, badge: 'grades' },
  { to: '/student/announcements', labelKey: 'navAnnouncements', end: false, badge: 'announcements' },
  { to: '/student/discuss', labelKey: 'navDiscuss', end: false },
];

function NavBadgePill({
  count,
  urgent,
  ariaLabel,
}: {
  count: number;
  urgent?: boolean;
  ariaLabel: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={`ms-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-semibold leading-none text-white ${
        urgent ? 'bg-brick' : 'bg-brass'
      }`}
      aria-label={ariaLabel}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function StudentShell() {
  const { user, logout } = useAuth();
  const { t, locale } = useLocale();
  const location = useLocation();

  const { data: announcementsData } = useQuery({
    queryKey: announcementKeys.list(),
    queryFn: fetchAnnouncements,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const { data: gradesData } = useQuery({
    queryKey: studentKeys.grades(),
    queryFn: fetchMyGrades,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const unreadAnnouncements = announcementsData?.unread_count ?? 0;
  const hasUnreadUrgent = (announcementsData?.announcements ?? []).some(
    (a) => !a.is_read && a.is_urgent,
  );

  const lastSeen = user ? getGradesLastSeenAt(user.id) : null;
  const unseenGrades =
    location.pathname === '/student/grades' || !user || !gradesData
      ? 0
      : countUnseenGrades(gradesData.grades, lastSeen);

  return (
    <div className="min-h-screen bg-paper animate-fade-rise">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <NavLink to="/student" className="font-semibold tracking-widest text-white">
              MANHAJ
            </NavLink>
            {user && (
              <span className="hidden font-mono text-xs text-white/40 sm:inline">
                {displayRole(user.role, locale)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => logout()}
              className="border border-white/25 px-3 py-1.5 text-sm text-white/90 transition hover:border-white/50"
            >
              {t('logout')}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-0">
          {NAV.map(({ to, labelKey, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative border-b-2 px-3 py-2 text-sm transition whitespace-nowrap ${
                  isActive
                    ? 'border-brass text-white'
                    : 'border-transparent text-white/70 hover:text-white'
                }`
              }
            >
              {t(labelKey)}
              {badge === 'announcements' && (
                <NavBadgePill
                  count={unreadAnnouncements}
                  urgent={hasUnreadUrgent}
                  ariaLabel={t('unreadAnnouncementsNav', { count: unreadAnnouncements })}
                />
              )}
              {badge === 'grades' && (
                <NavBadgePill
                  count={unseenGrades}
                  ariaLabel={t('newGradesNav', { count: unseenGrades })}
                />
              )}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
    </div>
  );
}
