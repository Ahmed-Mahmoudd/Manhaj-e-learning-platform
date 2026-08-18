import { useLocale } from '@/i18n/LocaleContext';

interface PaginationBarProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({ currentPage, lastPage, onPageChange }: PaginationBarProps) {
  const { t, dir } = useLocale();

  if (lastPage <= 1) return null;

  return (
    <nav
      className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white px-5 py-3.5 text-sm shadow-xs"
      aria-label={t('pagination')}
    >
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="inline-flex items-center gap-1.5 font-semibold text-slate-700 transition hover:text-amber-600 disabled:opacity-30 disabled:hover:text-slate-700 cursor-pointer disabled:cursor-not-allowed"
      >
        <span>{dir === 'rtl' ? '→' : '←'}</span>
        <span>{t('prevPage')}</span>
      </button>

      <span className="font-mono text-xs font-semibold text-slate-400">
        {t('pageOf', { current: currentPage, total: lastPage })}
      </span>

      <button
        type="button"
        disabled={currentPage >= lastPage}
        onClick={() => onPageChange(currentPage + 1)}
        className="inline-flex items-center gap-1.5 font-semibold text-slate-700 transition hover:text-amber-600 disabled:opacity-30 disabled:hover:text-slate-700 cursor-pointer disabled:cursor-not-allowed"
      >
        <span>{t('nextPage')}</span>
        <span>{dir === 'rtl' ? '←' : '→'}</span>
      </button>
    </nav>
  );
}
