import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import {
  catalogueKeys,
  dropEnrolment,
  enrolInSection,
  enrolmentKeys,
  fetchCatalogueCourse,
  fetchEnrolments,
  fetchSectionAvailability,
  fetchSectionEligibility,
} from '@/api/catalogue';
import { studentKeys } from '@/api/student';
import { AsyncPanel } from '@/components/AsyncPanel';
import { MarginNote } from '@/components/MarginNote';
import { useLocale } from '@/i18n/LocaleContext';
import type { CatalogueSection, StudentEnrolment } from '@/types/catalogue';
import { courseTitle } from '@/utils/courseTitle';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const id = Number(courseId);
  const { t, locale } = useLocale();

  const { data, isLoading, error } = useQuery({
    queryKey: catalogueKeys.course(id),
    queryFn: () => fetchCatalogueCourse(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const enrolmentsQuery = useQuery({
    queryKey: enrolmentKeys.list(),
    queryFn: fetchEnrolments,
  });

  const course = data?.course;
  const activeEnrolments =
    enrolmentsQuery.data?.enrolments.filter(
      (e) => e.status === 'enrolled' || e.status === 'waitlisted',
    ) ?? [];

  return (
    <div className="space-y-6">
      <Link
        to="/student/catalogue"
        className="text-sm text-ink/50 transition hover:text-brass"
      >
        ← {t('backToCatalogue')}
      </Link>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !course}
        emptyMessage={t('courseNotFound')}
      >
        {course && (
          <>
            <header className="space-y-2">
              <p className="font-mono text-sm text-ink/50">{course.code}</p>
              <h1 className="text-2xl font-semibold text-ink">
                {courseTitle(course, locale)}
              </h1>
              <p className="font-mono text-sm text-ink/45">
                {course.credit_hours} {t('credits')}
              </p>
              {course.description && (
                <p className="text-sm leading-relaxed text-ink/65">{course.description}</p>
              )}
            </header>

            {course.prerequisites.length > 0 && (
              <section className="border border-ink/10 bg-white p-4">
                <h2 className="text-sm font-medium text-ink/70">{t('prerequisites')}</h2>
                <ul className="mt-2 space-y-1">
                  {course.prerequisites.map((p) => (
                    <li key={p.id} className="font-mono text-sm text-ink/55">
                      {p.code} — {p.title_en}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-ink/70">{t('availableSections')}</h2>
              {course.sections.length === 0 ? (
                <p className="text-sm text-ink/50">{t('noSections')}</p>
              ) : (
                course.sections.map((section) => (
                  <SectionEnrolRow
                    key={section.id}
                    section={section}
                    existingEnrolment={activeEnrolments.find(
                      (e) => e.section.id === section.id,
                    )}
                  />
                ))
              )}
            </section>
          </>
        )}
      </AsyncPanel>
    </div>
  );
}

function SectionEnrolRow({
  section,
  existingEnrolment,
}: {
  section: CatalogueSection;
  existingEnrolment?: StudentEnrolment;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const availabilityQuery = useQuery({
    queryKey: catalogueKeys.availability(section.id),
    queryFn: () => fetchSectionAvailability(section.id),
  });

  const eligibilityQuery = useQuery({
    queryKey: enrolmentKeys.eligibility(section.id),
    queryFn: () => fetchSectionEligibility(section.id),
    enabled: !existingEnrolment,
  });

  const enrolMutation = useMutation({
    mutationFn: () => enrolInSection(section.id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: catalogueKeys.all });
      queryClient.invalidateQueries({ queryKey: enrolmentKeys.all });
      queryClient.invalidateQueries({ queryKey: studentKeys.courses() });
    },
    onError: (err: Error) => {
      setActionError(
        err instanceof ApiError
          ? err.userMessage(t('networkError'), t('serverError'))
          : t('networkError'),
      );
    },
  });

  const dropMutation = useMutation({
    mutationFn: (enrolmentId: number) => dropEnrolment(enrolmentId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: catalogueKeys.all });
      queryClient.invalidateQueries({ queryKey: enrolmentKeys.all });
      queryClient.invalidateQueries({ queryKey: studentKeys.courses() });
    },
    onError: (err: Error) => {
      setActionError(
        err instanceof ApiError
          ? err.userMessage(t('networkError'), t('serverError'))
          : t('networkError'),
      );
    },
  });

  const availability = availabilityQuery.data;
  const eligibility = eligibilityQuery.data;
  const isLoading = availabilityQuery.isLoading || eligibilityQuery.isLoading;

  return (
    <div className="border border-ink/10 bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-ink">
            §{section.section_number}
            {section.term && (
              <span className="ms-2 text-ink/45">{section.term.name}</span>
            )}
          </p>
          {section.instructor && (
            <p className="mt-1 text-sm text-ink/55">{section.instructor.name}</p>
          )}
          {availability && (
            <p className="mt-2 font-mono text-xs text-ink/45">
              {availability.enrolled}/{availability.capacity} {t('enrolled')}
              {availability.waitlisted > 0 && (
                <span className="ms-2">
                  · {availability.waitlisted} {t('waitlistedCount')}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {existingEnrolment ? (
            <>
              <StatusLabel status={existingEnrolment.status} />
              {(existingEnrolment.status === 'enrolled' ||
                existingEnrolment.status === 'waitlisted') && (
                <button
                  type="button"
                  disabled={dropMutation.isPending}
                  onClick={() => dropMutation.mutate(existingEnrolment.id)}
                  className="text-xs text-brick underline transition hover:text-brick/80 disabled:opacity-50"
                >
                  {existingEnrolment.status === 'waitlisted'
                    ? t('leaveWaitlist')
                    : t('dropSection')}
                </button>
              )}
            </>
          ) : isLoading ? (
            <span className="text-xs text-ink/40">{t('loading')}</span>
          ) : eligibility ? (
            <EnrolActions
              eligibility={eligibility}
              isPending={enrolMutation.isPending}
              onEnrol={() => enrolMutation.mutate()}
            />
          ) : null}
        </div>
      </div>

      {eligibility && !existingEnrolment && (
        <div className="mt-3 space-y-2">
          {!eligibility.can_enrol && eligibility.reason && (
            <MarginNote tone="brick">{eligibility.reason}</MarginNote>
          )}
          {eligibility.missing_prerequisites.length > 0 && (
            <MarginNote tone="brick">
              {t('missingPrereqs')}:{' '}
              {eligibility.missing_prerequisites.map((p) => p.code).join(', ')}
            </MarginNote>
          )}
          {eligibility.can_enrol && eligibility.would_be_waitlisted && (
            <MarginNote tone="brick">{eligibility.reason ?? t('sectionFullWaitlist')}</MarginNote>
          )}
        </div>
      )}

      {actionError && (
        <p className="mt-2 text-xs text-brick" role="alert">
          {actionError}
        </p>
      )}
    </div>
  );
}

function EnrolActions({
  eligibility,
  isPending,
  onEnrol,
}: {
  eligibility: { can_enrol: boolean; would_be_waitlisted: boolean };
  isPending: boolean;
  onEnrol: () => void;
}) {
  const { t } = useLocale();

  if (!eligibility.can_enrol) {
    return (
      <span className="text-xs text-ink/40">{t('cannotEnrol')}</span>
    );
  }

  const label = eligibility.would_be_waitlisted ? t('joinWaitlist') : t('enrolNow');

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onEnrol}
      className="bg-brass px-4 py-2 text-sm text-white transition hover:bg-brass-hover disabled:opacity-60"
    >
      {isPending ? t('processing') : label}
    </button>
  );
}

function StatusLabel({ status }: { status: string }) {
  const { t } = useLocale();
  const labels: Record<string, string> = {
    enrolled: t('statusEnrolled'),
    waitlisted: t('statusWaitlisted'),
    dropped: t('statusDropped'),
    completed: t('statusCompleted'),
  };
  const tone =
    status === 'enrolled' ? 'text-sage' : status === 'waitlisted' ? 'text-brick' : 'text-ink/50';

  return (
    <span className={`font-mono text-xs uppercase ${tone}`}>
      {labels[status] ?? status}
    </span>
  );
}
