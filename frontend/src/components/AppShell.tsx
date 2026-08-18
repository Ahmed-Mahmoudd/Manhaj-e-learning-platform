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
    <div className="min-h-screen bg-paper animate-fade-rise flex flex-col">
      <header className="bg-ink text-white shadow-sm border-b border-ink/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="group flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brass text-sm font-bold text-white shadow-xs transition-transform group-hover:scale-105">
                M
              </span>
              <span className="text-base font-bold tracking-widest text-white">
                MANHAJ
              </span>
            </Link>
            <span className="hidden text-white/30 sm:inline">|</span>
            <span className="hidden text-xs font-medium text-white/70 sm:inline">{title}</span>
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageSwitcher />
            {user && (
              <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-white/90">{user.name}</span>
                <span className="text-white/30">•</span>
                <span className="font-mono text-white/60 text-[11px]">
                  {displayRole(user.role, locale)}
                  {user.tenant_id !== null && (
                    <span className="ms-1.5 text-white/40">#{user.tenant_id}</span>
                  )}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 hover:border-white/40 hover:text-white"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
