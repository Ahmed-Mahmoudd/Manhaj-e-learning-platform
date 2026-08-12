import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { displayRole } from '@/auth/roles';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLocale } from '@/i18n/LocaleContext';

export function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const { user, logout } = useAuth();
  const { t, locale } = useLocale();

  return (
    <div className="min-h-screen bg-paper animate-fade-rise">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold tracking-widest text-white">
              MANHAJ
            </Link>
            <span className="hidden text-white/50 sm:inline">|</span>
            <span className="hidden text-sm text-white/80 sm:inline">{title}</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {user && (
              <div className="hidden text-end text-xs text-white/70 md:block">
                <div>{user.name}</div>
                <div className="font-mono text-white/50">
                  {displayRole(user.role, locale)}
                  {user.tenant_id !== null && (
                    <span className="ms-2">#{user.tenant_id}</span>
                  )}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="border border-white/25 px-3 py-1.5 text-sm text-white/90 transition hover:border-white/50 hover:text-white"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
