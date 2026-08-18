import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { catalogueKeys, dropEnrolment, enrolmentKeys } from '@/api/catalogue';
import {
  fetchMyCourses,
  fetchStudentDashboardSummary,
  fetchStudentRecommendations,
  studentKeys,
} from '@/api/student';
import { AsyncPanel } from '@/components/AsyncPanel';
import { MarginNote } from '@/components/MarginNote';
import { ProgressBar } from '@/components/ProgressBar';
import { TermLedger } from '@/components/TermLedger';
import { useLocale } from '@/i18n/LocaleContext';
import type { EnrolledCourse, RecommendationItem } from '@/types/student';
import { apiErrorMessage } from '@/utils/apiError';

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

  const summaryQuery = useQuery({
    queryKey: studentKeys.summary(),
    queryFn: fetchStudentDashboardSummary,
  });

  const recsQuery = useQuery({
    queryKey: studentKeys.recommendations(),
    queryFn: fetchStudentRecommendations,
  });

  const courses = data?.courses ?? [];
  const primaryTerm = courses.find((c) => c.status === 'enrolled')?.section.term;
  const continueItem = summaryQuery.data?.continue_learning;
  const recommendations = recsQuery.data?.recommendations ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('myCourses')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('myCoursesSubtitle')}</p>
        </div>
        {summaryQuery.data && (
          <div className="flex items-center gap-3">
            <div className="rounded border border-ink/10 bg-white px-3 py-1.5 text-xs text-ink/70">
              <span className="font-semibold text-ink">{summaryQuery.data.enrolled_courses_count}</span>{' '}
              {t('enrolledCourses')}
            </div>
            <div className="rounded border border-ink/10 bg-white px-3 py-1.5 text-xs text-ink/70">
              <span className="font-semibold text-ink">{summaryQuery.data.average_progress_pct}%</span>{' '}
              {t('overallAverageProgress')}
            </div>
          </div>
        )}
      </header>

      {/* Continue Learning Hero Card */}
      {continueItem && (
        <div className="relative overflow-hidden rounded-lg border border-brass/30 bg-gradient-to-r from-brass/10 via-brass/5 to-transparent p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block rounded bg-brass/20 px-2 py-0.5 font-mono text-xs font-semibold text-ink">
                  {t('continueLearning')}
                </span>
                <span className="text-xs text-ink/60">
                  {continueItem.course_code} • {continueItem.module_title}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-ink">{continueItem.title}</h2>
              <div className="flex items-center gap-3 pt-1">
                <div className="h-1.5 w-32 overflow-hidden rounded bg-ink/10">
                  <div
                    className="h-full bg-brass"
                    style={{ width: `${continueItem.progress_pct}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-ink/60">
                  {continueItem.progress_pct}% {t('completed')}
                </span>
              </div>
            </div>

            <Link
              to={`/student/sections/${continueItem.section_id}/lessons/${continueItem.lesson_id}`}
              className="inline-flex items-center gap-2 rounded bg-brass px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brass-hover"
            >
              {t('resumeLesson')} →
            </Link>
          </div>
        </div>
      )}

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

      {/* Recommended Courses Section */}
      {recommendations.length > 0 && (
        <div className="space-y-4 pt-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t('recommendedForYou')}</h2>
            <p className="text-xs text-ink/60">{t('recommendedForYouSubtitle')}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.slice(0, 3).map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} locale={locale} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  rec,
  locale,
}: {
  rec: RecommendationItem;
  locale: 'en' | 'ar';
}) {
  const { t } = useLocale();
  const course = rec.course;
  const title = locale === 'ar' && course.title_ar ? course.title_ar : course.title_en;
  const dept =
    course.department
      ? locale === 'ar' && course.department.name_ar
        ? course.department.name_ar
        : course.department.name_en
      : null;

  return (
    <div className="flex flex-col justify-between rounded border border-ink/10 bg-white p-5 shadow-sm transition hover:border-brass/40">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-brass">{course.code}</span>
          <span className="rounded bg-paper px-2 py-0.5 text-xs text-ink/60">
            {course.credit_hours} {t('creditHours')}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-ink line-clamp-1">{title}</h3>
        {dept && <p className="text-xs text-ink/50">{dept}</p>}
        {rec.reason && (
          <p className="text-xs text-ink/70 italic bg-paper/60 p-2 rounded line-clamp-2">
            💡 {rec.reason}
          </p>
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-ink/10">
        <Link
          to={`/student/catalogue/${course.id}`}
          className="text-xs font-medium text-brass hover:text-brass-hover"
        >
          {t('viewInCatalogue')} →
        </Link>
      </div>
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
      queryClient.invalidateQueries({ queryKey: catalogueKeys.all });
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
      {dropMutation.error && (
        <p className="mt-1 text-xs text-brick">
          {apiErrorMessage(dropMutation.error, t('networkError'), t('serverError'))}
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
