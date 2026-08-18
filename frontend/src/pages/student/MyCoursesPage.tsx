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
            <div className="rounded-lg border border-ink/10 bg-white px-3.5 py-2 text-xs text-ink/70 shadow-xs">
              <span className="font-bold text-ink">{summaryQuery.data.enrolled_courses_count}</span>{' '}
              {t('enrolledCourses')}
            </div>
            <div className="rounded-lg border border-ink/10 bg-white px-3.5 py-2 text-xs text-ink/70 shadow-xs">
              <span className="font-bold text-emerald-700">{summaryQuery.data.average_progress_pct}%</span>{' '}
              {t('overallAverageProgress')}
            </div>
          </div>
        )}
      </header>

      {/* Continue Learning Hero Card */}
      {continueItem && (
        <div className="relative overflow-hidden rounded-xl border border-brass/40 bg-gradient-to-r from-brass/15 via-brass/5 to-white p-6 shadow-xs transition-all hover:shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-md bg-brass px-2.5 py-0.5 font-mono text-xs font-semibold text-white">
                  {t('continueLearning')}
                </span>
                <span className="font-mono text-xs font-medium text-ink/70">
                  {continueItem.course_code} • {continueItem.module_title}
                </span>
              </div>
              <h2 className="text-lg font-bold text-ink">{continueItem.title}</h2>
              <div className="flex items-center gap-3 pt-1">
                <div className="h-2 w-36 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full bg-brass rounded-full"
                    style={{ width: `${continueItem.progress_pct}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-semibold text-ink/70">
                  {continueItem.progress_pct}% {t('completed')}
                </span>
              </div>
            </div>

            <Link
              to={`/student/sections/${continueItem.section_id}/lessons/${continueItem.lesson_id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-brass px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brass-hover"
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
        <div className="space-y-4">
          {courses.map((item) => (
            <CourseCard key={item.enrolment_id} item={item} locale={locale} />
          ))}
        </div>
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
    <div className="flex flex-col justify-between rounded-xl border border-ink/10 bg-white p-5 shadow-xs transition-all hover:border-brass/40 hover:shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-brass">{course.code}</span>
          <span className="rounded bg-paper px-2 py-0.5 text-xs text-ink/60">
            {course.credit_hours} {t('creditHours')}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-ink line-clamp-1">{title}</h3>
        {dept && <p className="text-xs text-ink/50">{dept}</p>}
        {rec.reason && (
          <p className="text-xs text-ink/70 italic bg-paper/60 p-2 rounded-md line-clamp-2">
            💡 {rec.reason}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-ink/10">
        <Link
          to={`/student/catalogue/${course.id}`}
          className="text-xs font-semibold text-brass hover:text-brass-hover inline-flex items-center gap-1"
        >
          {t('viewInCatalogue')} →
        </Link>
      </div>
    </div>
  );
}

function CourseCard({
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
    <button
      type="button"
      disabled={dropMutation.isPending}
      onClick={(e) => {
        e.preventDefault();
        dropMutation.mutate();
      }}
      className="text-xs text-brick hover:underline disabled:opacity-50"
    >
      {dropMutation.isPending
        ? t('processing')
        : status === 'waitlisted'
          ? t('leaveWaitlist')
          : t('dropSection')}
    </button>
  );

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-xs transition-all hover:border-brass/30 hover:shadow-sm">
      {canEnter ? (
        <Link to={`/student/sections/${section.id}`} className="group block space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-ink">{course.code}</span>
                <span className="rounded bg-paper px-2 py-0.5 font-mono text-xs text-ink/50">
                  §{section.section_number}
                </span>
              </div>
              <h2 className="text-base font-semibold text-ink group-hover:text-brass transition-colors">
                {title}
              </h2>
              <p className="text-xs text-ink/60">{section.instructor.name}</p>
            </div>

            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brass">
              {t('enterGrades')} →
            </span>
          </div>

          <div>
            <ProgressBar value={completion_pct} size="md" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-ink/5 text-xs">
            <TermLedger
              variant="inline"
              startsAt={section.term.starts_at}
              endsAt={section.term.ends_at}
              label={section.term.name}
            />
            {dropButton}
          </div>
        </Link>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-ink">{course.code}</span>
                <span className="rounded bg-paper px-2 py-0.5 font-mono text-xs text-ink/50">
                  §{section.section_number}
                </span>
              </div>
              <h2 className="text-base font-semibold text-ink">{title}</h2>
              <p className="text-xs text-ink/60">{section.instructor.name}</p>
            </div>
          </div>

          {status === 'waitlisted' && waitlist_position != null && (
            <MarginNote tone="brick">
              {t('waitlistNote', { position: waitlist_position })}
            </MarginNote>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-ink/5 text-xs">
            <TermLedger
              variant="inline"
              startsAt={section.term.starts_at}
              endsAt={section.term.ends_at}
              label={section.term.name}
            />
            {dropButton}
          </div>
        </div>
      )}
    </div>
  );
}
