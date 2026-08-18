import type { ReactNode } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLocale } from '@/i18n/LocaleContext';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen animate-fade-rise flex flex-col justify-between">
      <header className="bg-ink text-white shadow-sm border-b border-ink/40">
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6">
          <div className="absolute start-4 top-5 sm:start-6 sm:top-6">
            <LanguageSwitcher />
          </div>

          <div className="px-12 text-center sm:px-16 flex flex-col items-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brass text-lg font-bold text-white shadow-md shadow-brass/30">
                M
              </span>
              <span className="text-2xl font-bold tracking-[0.25em] sm:text-3xl text-white">
                {t('appName')}
              </span>
            </div>
            <p className="text-xs text-white/60 font-medium tracking-wide uppercase">{t('appTagline')}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-10 sm:px-6 sm:py-14 flex-1 flex flex-col justify-center">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1.5 text-xs text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 border-t border-slate-100 pt-5">{footer}</div>}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} MANHAJ — Academic Learning Platform
      </footer>
    </div>
  );
}
