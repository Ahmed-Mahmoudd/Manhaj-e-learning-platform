import { useQuery } from '@tanstack/react-query';
import { fetchSectionEnrolments, instructorKeys } from '@/api/instructor';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { SectionActionLinks } from '@/components/instructor/SectionActionLinks';
import { InstructorInvalidSection, useInstructorSectionId } from '@/hooks/useInstructorSectionId';
import { useLocale } from '@/i18n/LocaleContext';
import type { SectionEnrolment } from '@/types/instructor';

const STATUS_KEYS = {
  enrolled: 'statusEnrolled',
  waitlisted: 'statusWaitlisted',
  dropped: 'statusDropped',
  completed: 'statusCompleted',
} as const;

export function SectionRosterPage() {
  const sid = useInstructorSectionId();
  const { t } = useLocale();

  const { data, isLoading, error } = useQuery({
    queryKey: instructorKeys.enrolments(sid ?? 0),
    queryFn: () => fetchSectionEnrolments(sid!),
    enabled: sid !== null,
  });

  const enrolments = data?.enrolments ?? [];

  if (sid === null) return <InstructorInvalidSection />;

  return (
    <div className="space-y-6">
      <BackLink to="/instructor">{t('backToInstructorSections')}</BackLink>

      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{t('sectionRoster')}</h1>
          <p className="mt-1 text-sm text-ink/60">
            {isLoading
              ? t('rosterLoading')
              : data != null &&
                t('rosterSubtitle', {
                  enrolled: data.enrolled_count,
                  total: enrolments.length,
                })}
          </p>
        </div>
        <SectionActionLinks sectionId={sid} />
      </header>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && enrolments.length === 0}
        emptyMessage={t('noRosterStudents')}
      >
        <div className="overflow-x-auto border border-ink/10 bg-white">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-start text-xs uppercase text-ink/45">
                <th className="px-4 py-3 font-medium">{t('studentName')}</th>
                <th className="px-4 py-3 font-medium">{t('email')}</th>
                <th className="px-4 py-3 font-medium">{t('enrolmentStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {enrolments.map((row) => (
                <RosterRow key={row.enrolment_id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </AsyncPanel>
    </div>
  );
}

function RosterRow({ row }: { row: SectionEnrolment }) {
  const { t } = useLocale();
  const statusKey = STATUS_KEYS[row.status];

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-ink">{row.student.name}</td>
      <td className="px-4 py-3 font-mono text-xs text-ink/60">{row.student.email}</td>
      <td className="px-4 py-3 text-ink/70">
        {t(statusKey)}
        {row.status === 'waitlisted' && row.waitlist_position != null && (
          <span className="ms-1 text-xs text-ink/45">
            (#{row.waitlist_position})
          </span>
        )}
      </td>
    </tr>
  );
}
