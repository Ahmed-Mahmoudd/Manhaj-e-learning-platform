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
    <div className="min-h-screen bg-paper animate-fade-rise">
      <header className="bg-ink text-white">
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6">
          <div className="absolute start-4 top-5 sm:start-6 sm:top-6">
            <LanguageSwitcher />
          </div>

          <div className="px-12 text-center sm:px-16">
            <h1 className="text-2xl font-semibold tracking-[0.25em] sm:text-3xl">
              {t('appName')}
            </h1>
            <p className="mt-2 text-sm text-white/60">{t('appTagline')}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-12">
        <div className="border border-ink/10 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          <p className="mt-1.5 text-sm text-ink/60">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 border-t border-ink/10 pt-5">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
