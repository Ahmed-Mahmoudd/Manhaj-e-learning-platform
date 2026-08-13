import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMyCourses, fetchSectionLessons, studentKeys } from '@/api/student';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { InvalidParamState } from '@/components/InvalidParamState';
import { ProgressBar } from '@/components/ProgressBar';
import { TermLedger } from '@/components/TermLedger';
import { useLocale } from '@/i18n/LocaleContext';
import { formatLessonDuration } from '@/utils/formatDuration';
import { lessonTypeLabel } from '@/utils/lessonType';
import { parseRouteId } from '@/utils/routeParams';
import { completionPctFromModules } from '@/utils/sectionCompletion';
import type { LessonSummary } from '@/types/student';

export function SectionLessonsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const id = parseRouteId(sectionId);
  const { t, locale } = useLocale();

  const coursesQuery = useQuery({
    queryKey: studentKeys.courses(),
    queryFn: fetchMyCourses,
  });

  const lessonsQuery = useQuery({
    queryKey: studentKeys.sectionLessons(id ?? 0),
    queryFn: () => fetchSectionLessons(id!),
    enabled: id !== null,
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
  const liveCompletion = useMemo(
    () => (modules.length > 0 ? completionPctFromModules(modules) : null),
    [modules],
  );
  const completionPct = liveCompletion ?? enrolment?.completion_pct;

  if (id === null) {
    return (
      <InvalidParamState
        message={t('invalidSectionId')}
        backTo="/student"
        backLabel={t('backToCourses')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <BackLink to="/student">{t('backToCourses')}</BackLink>

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
          {completionPct != null && <ProgressBar value={completionPct} />}
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
  const { t } = useLocale();
  const pct = lesson.progress?.progress_pct ?? 0;
  const complete = pct >= 100;

  const content = (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {disabled ? (
          <LockIcon className="size-4 shrink-0 text-ink/30" />
        ) : complete ? (
          <CompleteIcon className="size-4 shrink-0 text-sage" />
        ) : (
          <TypeBadge type={lesson.type} />
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm ${complete ? 'text-ink/70' : 'text-ink'}`}>
            {lesson.title}
          </p>
          {lesson.duration_seconds ? (
            <p className="font-mono text-xs text-ink/40">
              {formatLessonDuration(lesson.duration_seconds, t)}
            </p>
          ) : null}
        </div>
        {!disabled && (
          <span className="font-mono text-xs text-ink/45">
            {complete ? t('complete') : `${Math.round(pct)}%`}
          </span>
        )}
      </div>
      {!disabled && (
        <div className="mt-2 ps-7">
          <ProgressBar value={pct} size="sm" showLabel={false} />
        </div>
      )}
    </div>
  );

  if (disabled) {
    return <li className="bg-ink/[0.02] opacity-60">{content}</li>;
  }

  return (
    <li className={complete ? 'bg-sage/[0.04]' : undefined}>
      <Link
        to={`/student/sections/${sectionId}/lessons/${lesson.id}`}
        className="block transition hover:bg-paper/80"
      >
        {content}
      </Link>
    </li>
  );
}

function CompleteIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden
    >
      <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
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
