import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLocale } from '@/i18n/LocaleContext';

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useLocale();

  return (
    <ErrorBoundary
      title={t('errorBoundaryTitle')}
      message={t('errorBoundaryMessage')}
      retryLabel={t('errorBoundaryRetry')}
    >
      {children}
    </ErrorBoundary>
  );
}
