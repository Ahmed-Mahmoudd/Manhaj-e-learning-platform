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
      className={`ms-1.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-xs ${
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
    <div className="min-h-screen animate-fade-rise flex flex-col">
      <header className="bg-ink text-white shadow-sm border-b border-ink/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <NavLink to="/student" className="group flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brass text-sm font-bold text-white shadow-xs transition-transform group-hover:scale-105">
                M
              </span>
              <span className="text-base font-bold tracking-widest text-white">
                MANHAJ
              </span>
            </NavLink>

            {user && (
              <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-white/90">{user.name}</span>
                <span className="text-white/30">•</span>
                <span className="font-mono text-white/60 text-[11px]">
                  {displayRole(user.role, locale)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 hover:border-white/40 hover:text-white"
            >
              {t('logout')}
            </button>
          </div>
        </div>

        <div className="border-t border-white/10 bg-ink/60">
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
            {NAV.map(({ to, labelKey, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative border-b-2 py-2.5 px-3 text-xs font-medium uppercase tracking-wider transition whitespace-nowrap ${
                    isActive
                      ? 'border-brass text-white'
                      : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
    </div>
  );
}
