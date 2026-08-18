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
    <div className="space-y-8">
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
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-paper text-start text-xs uppercase tracking-wider text-ink/50">
                  <th className="px-5 py-3 font-medium">{t('studentName')}</th>
                  <th className="px-4 py-3 font-medium">{t('email')}</th>
                  <th className="px-5 py-3 font-medium text-end">{t('enrolmentStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {enrolments.map((row) => (
                  <RosterRow key={row.enrolment_id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AsyncPanel>
    </div>
  );
}

function RosterRow({ row }: { row: SectionEnrolment }) {
  const { t } = useLocale();
  const statusKey = STATUS_KEYS[row.status];

  return (
    <tr className="hover:bg-paper/30 transition-colors">
      <td className="px-5 py-3.5 font-medium text-ink">{row.student.name}</td>
      <td className="px-4 py-3.5 font-mono text-xs text-ink/60">{row.student.email}</td>
      <td className="px-5 py-3.5 text-end">
        {row.status === 'enrolled' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t(statusKey)}
          </span>
        ) : row.status === 'waitlisted' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {t(statusKey)}
            {row.waitlist_position != null && (
              <span className="font-mono text-xs text-amber-600 font-semibold">
                #{row.waitlist_position}
              </span>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            {t(statusKey)}
          </span>
        )}
      </td>
    </tr>
  );
}
