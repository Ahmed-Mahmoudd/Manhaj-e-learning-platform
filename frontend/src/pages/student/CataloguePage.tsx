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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t('catalogue')}</h1>
        <p className="mt-1 text-sm text-ink/60">{t('catalogueSubtitle')}</p>
      </header>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="min-w-0 flex-1 border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-brass"
        />
        <button
          type="submit"
          className="bg-ink px-4 py-2 text-sm text-white transition hover:bg-ink/90"
        >
          {t('search')}
        </button>
      </form>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && courses.length === 0}
        emptyMessage={t('noCatalogueResults')}
      >
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                to={`/student/catalogue/${course.id}`}
                className="block px-5 py-4 transition hover:bg-paper/80"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-sm font-medium text-ink">
                      {course.code}
                    </span>
                    <h2 className="mt-0.5 text-base text-ink">
                      {courseTitle(course, locale)}
                    </h2>
                    {course.department && (
                      <p className="mt-1 text-xs text-ink/45">
                        {course.department.name_en}
                      </p>
                    )}
                  </div>
                  <div className="text-end">
                    <span className="font-mono text-sm text-ink/55">
                      {course.credit_hours} {t('credits')}
                    </span>
                    <p className="text-xs text-ink/40">
                      {course.active_sections ?? 0} {t('activeSections')}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {data?.meta && (
          <PaginationBar
            currentPage={data.meta.current_page}
            lastPage={data.meta.last_page}
            onPageChange={setPage}
          />
        )}
      </AsyncPanel>
    </div>
  );
}
