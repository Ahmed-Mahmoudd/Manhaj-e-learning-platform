import { useLocale } from '@/i18n/LocaleContext';

interface PaginationBarProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ currentPage, lastPage, onPageChange }: PaginationBarProps) {
  const { t } = useLocale();

  if (lastPage <= 1) return null;

  return (
    <nav
      className="flex items-center justify-between border border-ink/10 bg-white px-4 py-3 text-sm"
      aria-label={t('pagination')}
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="text-ink/60 transition hover:text-brass disabled:opacity-30"
      >
        {t('prevPage')}
      </button>
      <span className="font-mono text-xs text-ink/50">
        {t('pageOf', { current: currentPage, total: lastPage })}
      </span>
      <button
        type="button"
        disabled={currentPage >= lastPage}
        onClick={() => onPageChange(currentPage + 1)}
        className="text-ink/60 transition hover:text-brass disabled:opacity-30"
      >
        {t('nextPage')}
      </button>
    </nav>
  );
}
