import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { dropEnrolment, enrolmentKeys } from '@/api/catalogue';
import { fetchMyCourses, studentKeys } from '@/api/student';
import { AsyncPanel } from '@/components/AsyncPanel';
import { MarginNote } from '@/components/MarginNote';
import { ProgressBar } from '@/components/ProgressBar';
import { TermLedger } from '@/components/TermLedger';
import { useLocale } from '@/i18n/LocaleContext';
import type { EnrolledCourse } from '@/types/student';

function courseTitle(course: EnrolledCourse['course'], locale: 'en' | 'ar'): string {
  if (locale === 'ar' && course.title_ar) return course.title_ar;
  return course.title_en;
}

export function MyCoursesPage() {
  const { t, locale } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: studentKeys.courses(),
    queryFn: fetchMyCourses,
  });

  const courses = data?.courses ?? [];
  const primaryTerm = courses.find((c) => c.status === 'enrolled')?.section.term;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t('myCourses')}</h1>
        <p className="mt-1 text-sm text-ink/60">{t('myCoursesSubtitle')}</p>
      </header>

      {primaryTerm && (
        <TermLedger
          variant="page"
          startsAt={primaryTerm.starts_at}
          endsAt={primaryTerm.ends_at}
          label={primaryTerm.name}
        />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && courses.length === 0}
        emptyMessage={t('noCourses')}
        emptyAction={
          <Link
            to="/student/catalogue"
            className="inline-block text-sm text-brass underline hover:text-brass-hover"
          >
            {t('browseCatalogue')}
          </Link>
        }
      >
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {courses.map((item) => (
            <CourseRow key={item.enrolment_id} item={item} locale={locale} />
          ))}
        </ul>
      </AsyncPanel>
    </div>
  );
}

function CourseRow({
  item,
  locale,
}: {
  item: EnrolledCourse;
  locale: 'en' | 'ar';
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { section, course, status, waitlist_position, completion_pct, enrolment_id } = item;
  const title = courseTitle(course, locale);
  const canEnter = status === 'enrolled';

  const dropMutation = useMutation({
    mutationFn: () => dropEnrolment(enrolment_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.courses() });
      queryClient.invalidateQueries({ queryKey: enrolmentKeys.all });
    },
  });

  const dropButton = (status === 'enrolled' || status === 'waitlisted') && (
    <div className="mt-3">
      <button
        type="button"
        disabled={dropMutation.isPending}
        onClick={() => dropMutation.mutate()}
        className="text-xs text-brick underline hover:text-brick/80 disabled:opacity-50"
      >
        {dropMutation.isPending
          ? t('processing')
          : status === 'waitlisted'
            ? t('leaveWaitlist')
            : t('dropSection')}
      </button>
      {dropMutation.error instanceof ApiError && (
        <p className="mt-1 text-xs text-brick">
          {dropMutation.error.serverMessage ?? dropMutation.error.message}
        </p>
      )}
    </div>
  );

  const meta = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm font-medium text-ink">{course.code}</span>
        <span className="text-xs text-ink/40">§{section.section_number}</span>
      </div>
      <h2 className="mt-1 text-base font-medium text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink/55">{section.instructor.name}</p>
    </div>
  );

  if (!canEnter) {
    return (
      <li className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">{meta}</div>
        <div className="mt-2">
          <TermLedger
            variant="inline"
            startsAt={section.term.starts_at}
            endsAt={section.term.ends_at}
            label={section.term.name}
          />
        </div>
        {status === 'waitlisted' && waitlist_position != null && (
          <div className="mt-3">
            <MarginNote tone="brick">
              {t('waitlistNote', { position: waitlist_position })}
            </MarginNote>
          </div>
        )}
        {dropButton}
      </li>
    );
  }

  return (
    <li className="px-5 py-5">
      <Link
        to={`/student/sections/${section.id}`}
        className="-mx-2 block rounded-sm px-2 py-1 transition hover:bg-paper/50"
      >
        {meta}
        <div className="mt-4">
          <ProgressBar value={completion_pct} size="md" />
        </div>
        <div className="mt-3">
          <TermLedger
            variant="inline"
            startsAt={section.term.starts_at}
            endsAt={section.term.ends_at}
            label={section.term.name}
          />
        </div>
      </Link>
      {dropButton}
    </li>
  );
}
