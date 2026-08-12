import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMyCourses, studentKeys } from '@/api/student';
import { AsyncPanel } from '@/components/AsyncPanel';
import { useLocale } from '@/i18n/LocaleContext';

export function DiscussSectionsPage() {
  const { t, locale } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: studentKeys.courses(),
    queryFn: fetchMyCourses,
  });

  const enrolled = (data?.courses ?? []).filter((c) => c.status === 'enrolled');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t('discussion')}</h1>
        <p className="mt-1 text-sm text-ink/60">{t('discussionSubtitle')}</p>
      </header>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && enrolled.length === 0}
        emptyMessage={t('noDiscussionSections')}
      >
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {enrolled.map((item) => {
            const title =
              locale === 'ar' && item.course.title_ar
                ? item.course.title_ar
                : item.course.title_en;
            return (
              <li key={item.section.id}>
                <Link
                  to={`/student/discuss/sections/${item.section.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-paper/50"
                >
                  <div>
                    <span className="font-mono text-sm font-medium text-ink">
                      {item.course.code}
                    </span>
                    <span className="mx-2 text-ink/30">§{item.section.section_number}</span>
                    <p className="mt-1 text-sm text-ink/70">{title}</p>
                  </div>
                  <span className="text-sm text-brass">{t('viewThreads')} →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </AsyncPanel>
    </div>
  );
}
