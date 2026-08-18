import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMyCourses, studentKeys } from '@/api/student';
import { AsyncPanel } from '@/components/AsyncPanel';
import { useLocale } from '@/i18n/LocaleContext';
import { courseTitle } from '@/utils/courseTitle';

export function DiscussSectionsPage() {
  const { t, locale, dir } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: studentKeys.courses(),
    queryFn: fetchMyCourses,
  });

  const enrolled = (data?.courses ?? []).filter((c) => c.status === 'enrolled');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('discussion')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('discussionSubtitle')}</p>
      </header>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && enrolled.length === 0}
        emptyMessage={t('noDiscussionSections')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {enrolled.map((item) => (
            <Link
              key={item.section.id}
              to={`/student/discuss/sections/${item.section.id}`}
              className="group block rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-amber-500/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-xs">
                    {item.course.code}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                    §{item.section.section_number}
                  </span>
                </div>
              </div>

              <h2 className="mt-3 text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                {courseTitle(item.course, locale)}
              </h2>

              <p className="mt-1 text-xs text-slate-400">👤 {item.section.instructor.name}</p>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-400">💬 {t('discussion')}</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600">
                  <span>{t('viewThreads')}</span>
                  <span className="inline-block transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                    {dir === 'rtl' ? '←' : '→'}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </AsyncPanel>
    </div>
  );
}
