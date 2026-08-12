import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMyCourses, fetchSectionLessons, studentKeys } from '@/api/student';
import { AsyncPanel } from '@/components/AsyncPanel';
import { ProgressBar } from '@/components/ProgressBar';
import { TermLedger } from '@/components/TermLedger';
import { useLocale } from '@/i18n/LocaleContext';
import { lessonTypeLabel } from '@/utils/lessonType';
import type { LessonSummary } from '@/types/student';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

export function SectionLessonsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const id = Number(sectionId);
  const { t, locale } = useLocale();

  const coursesQuery = useQuery({
    queryKey: studentKeys.courses(),
    queryFn: fetchMyCourses,
  });

  const lessonsQuery = useQuery({
    queryKey: studentKeys.sectionLessons(id),
    queryFn: () => fetchSectionLessons(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const enrolment = coursesQuery.data?.courses.find(
    (c) => c.section.id === id && c.status === 'enrolled',
  );

  const courseTitle =
    locale === 'ar' && enrolment?.course.title_ar
      ? enrolment.course.title_ar
      : enrolment?.course.title_en;

  const isLoading = lessonsQuery.isLoading || coursesQuery.isLoading;
  const error = lessonsQuery.error ?? coursesQuery.error;
  const modules = lessonsQuery.data?.modules ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/student"
          className="text-sm text-ink/50 transition hover:text-brass"
        >
          ← {t('backToCourses')}
        </Link>
      </div>

      {enrolment && (
        <header className="space-y-4">
          <div>
            <p className="font-mono text-sm text-ink/50">{enrolment.course.code}</p>
            <h1 className="text-xl font-semibold text-ink">{courseTitle}</h1>
            <p className="text-sm text-ink/55">{enrolment.section.instructor.name}</p>
          </div>
          <TermLedger
            variant="page"
            startsAt={enrolment.section.term.starts_at}
            endsAt={enrolment.section.term.ends_at}
            label={enrolment.section.term.name}
          />
          {enrolment.completion_pct != null && (
            <ProgressBar value={enrolment.completion_pct} />
          )}
        </header>
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && modules.length === 0}
        emptyMessage={t('noLessons')}
      >
        <div className="space-y-6">
          {modules.map((mod) => (
            <section key={mod.id} className="border border-ink/10 bg-white">
              <h2 className="border-b border-ink/10 px-4 py-3 text-sm font-medium text-ink">
                {mod.title}
                {!mod.is_available && (
                  <span className="ms-2 text-xs font-normal text-ink/40">
                    ({t('locked')})
                  </span>
                )}
              </h2>
              <ul className="divide-y divide-ink/5">
                {mod.lessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    sectionId={id}
                    disabled={!mod.is_available}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </AsyncPanel>
    </div>
  );
}

function LessonRow({
  lesson,
  sectionId,
  disabled,
}: {
  lesson: LessonSummary;
  sectionId: number;
  disabled: boolean;
}) {
  const pct = lesson.progress?.progress_pct ?? 0;

  const content = (
    <div className="px-4 py-3">
      <div className="flex items-center gap-4">
        <TypeBadge type={lesson.type} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{lesson.title}</p>
          {lesson.duration_seconds ? (
            <p className="font-mono text-xs text-ink/40">
              {formatDuration(lesson.duration_seconds)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2 ps-14">
        <ProgressBar value={pct} size="sm" showLabel={false} />
      </div>
    </div>
  );

  if (disabled) {
    return <li className="opacity-50">{content}</li>;
  }

  return (
    <li>
      <Link
        to={`/student/sections/${sectionId}/lessons/${lesson.id}`}
        className="block transition hover:bg-paper/80"
      >
        {content}
      </Link>
    </li>
  );
}

function TypeBadge({ type }: { type: string }) {
  const { t } = useLocale();
  return (
    <span className="font-mono text-[10px] uppercase tracking-wide text-ink/35 w-10 shrink-0">
      {t(lessonTypeLabel(type))}
    </span>
  );
}
