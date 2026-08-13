import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLocale } from '@/i18n/LocaleContext';

export function PlatformShell() {
  const { user, logout } = useAuth();
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-paper animate-fade-rise">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <NavLink to="/platform/tenants" className="font-semibold tracking-widest text-white">
              MANHAJ
            </NavLink>
            <span className="hidden text-xs text-white/40 sm:inline">{t('platformConsole')}</span>
            {user && (
              <span className="hidden text-xs text-white/40 md:inline">{user.email}</span>
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
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-0">
          <NavLink
            to="/platform/tenants"
            end
            className={({ isActive }) =>
              `border-b-2 px-3 py-2 text-sm transition ${
                isActive
                  ? 'border-brass text-white'
                  : 'border-transparent text-white/70 hover:text-white'
              }`
            }
          >
            {t('navTenants')}
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </main>
    </div>
  );
}
