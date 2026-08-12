import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { displayRole } from '@/auth/roles';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLocale } from '@/i18n/LocaleContext';

const NAV = [
  { to: '/student', labelKey: 'navMyCourses' as const, end: true },
  { to: '/student/catalogue', labelKey: 'navCatalogue' as const, end: false },
  { to: '/student/grades', labelKey: 'navGrades' as const, end: false },
  { to: '/student/announcements', labelKey: 'navAnnouncements' as const, end: false },
  { to: '/student/discuss', labelKey: 'navDiscuss' as const, end: false },
];

export function StudentShell() {
  const { user, logout } = useAuth();
  const { t, locale } = useLocale();

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
          {NAV.map(({ to, labelKey, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `border-b-2 px-3 py-2 text-sm transition whitespace-nowrap ${
                  isActive
                    ? 'border-brass text-white'
                    : 'border-transparent text-white/70 hover:text-white'
                }`
              }
            >
              {t(labelKey)}
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
