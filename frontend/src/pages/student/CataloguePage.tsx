import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogueKeys, fetchCatalogueCourses } from '@/api/catalogue';
import { AsyncPanel } from '@/components/AsyncPanel';
import { PaginationBar } from '@/components/PaginationBar';
import { useLocale } from '@/i18n/LocaleContext';
import { courseTitle } from '@/utils/courseTitle';

export function CataloguePage() {
  const { t, locale } = useLocale();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filters = { search: search || undefined, page };

  const { data, isLoading, error } = useQuery({
    queryKey: catalogueKeys.list(filters),
    queryFn: () => fetchCatalogueCourses(filters),
  });

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const courses = data?.data ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('catalogue')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('catalogueSubtitle')}</p>
      </header>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800 cursor-pointer"
        >
          🔍 {t('search')}
        </button>
      </form>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && courses.length === 0}
        emptyMessage={t('noCatalogueResults')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/student/catalogue/${course.id}`}
              className="group block rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-amber-500/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-xs">
                  {course.code}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {course.credit_hours} {t('credits')}
                </span>
              </div>

              <h2 className="mt-3 text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                {courseTitle(course, locale)}
              </h2>

              {course.department && (
                <p className="mt-1 text-xs text-slate-400">
                  {course.department.name_en}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {course.active_sections ?? 0} {t('activeSections')}
                </span>
                <span className="font-semibold text-amber-600 group-hover:translate-x-1 transition-transform">
                  {locale === 'ar' ? 'عرض المقرر' : 'View course'} →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {data?.meta && (
          <div className="pt-2">
            <PaginationBar
              currentPage={data.meta.current_page}
              lastPage={data.meta.last_page}
              onPageChange={setPage}
            />
          </div>
        )}
      </AsyncPanel>
    </div>
  );
}
