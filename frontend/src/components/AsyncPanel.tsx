import { ReactNode } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { apiErrorMessage } from '@/utils/apiError';

interface AsyncPanelProps {
  isLoading: boolean;
  error: Error | null;
  isEmpty?: boolean;
  emptyMessage: string;
  emptyAction?: ReactNode;
  children: ReactNode;
}

export function AsyncPanel({
  isLoading,
  error,
  isEmpty,
  emptyMessage,
  emptyAction,
  children,
}: AsyncPanelProps) {
  const { t } = useLocale();

  if (isLoading) {
    return (
      <div className="border border-ink/10 bg-white px-6 py-12 text-center">
        <p className="text-sm text-ink/50">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    const message = apiErrorMessage(error, t('networkError'), t('serverError'), t);
    return (
      <div
        className="border border-brick/30 bg-brick/5 px-6 py-8"
        role="alert"
      >
        <p className="text-sm text-brick">{message}</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="border border-ink/10 bg-white px-6 py-12 text-center">
        <p className="text-sm text-ink/60">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return <>{children}</>;
}
