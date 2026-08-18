import { useQuery } from '@tanstack/react-query';
import { fetchSectionAnalytics, fetchSectionProgress, instructorKeys } from '@/api/instructor';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { SectionActionLinks } from '@/components/instructor/SectionActionLinks';
import { InstructorInvalidSection, useInstructorSectionId } from '@/hooks/useInstructorSectionId';
import { useLocale } from '@/i18n/LocaleContext';

export function SectionAnalyticsPage() {
  const sid = useInstructorSectionId();
  const { t } = useLocale();

  const analyticsQuery = useQuery({
    queryKey: instructorKeys.analytics(sid ?? 0),
    queryFn: () => fetchSectionAnalytics(sid!),
    enabled: sid !== null,
  });

  const progressQuery = useQuery({
    queryKey: instructorKeys.progress(sid ?? 0),
    queryFn: () => fetchSectionProgress(sid!),
    enabled: sid !== null,
  });

  if (sid === null) return <InstructorInvalidSection />;

  const analytics = analyticsQuery.data;
  const progress = progressQuery.data;
  const isLoading = analyticsQuery.isLoading || progressQuery.isLoading;
  const error = analyticsQuery.error || progressQuery.error;

  const totalGradesCount = analytics?.grade_distribution
    ? Object.values(analytics.grade_distribution).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-8">
      <BackLink to="/instructor">{t('backToInstructorSections')}</BackLink>

      <header className="space-y-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{t('sectionAnalytics')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('sectionAnalyticsSubtitle')}</p>
        </div>
        <SectionActionLinks sectionId={sid} />
      </header>

      <AsyncPanel isLoading={isLoading} error={error} emptyMessage={t('noContent')}>
        {analytics && (
          <div className="space-y-8">
            {/* KPI Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border border-ink/10 bg-white p-5 rounded shadow-sm">
                <div className="text-xs uppercase tracking-wider text-ink/50 font-medium">
                  {t('enrolmentStatus')}
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {analytics.enrolled_count} <span className="text-sm font-normal text-ink/50">/ {analytics.capacity}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-ink/10">
                  <div
                    className="h-full bg-brass"
                    style={{
                      width: `${Math.min(100, (analytics.enrolled_count / Math.max(analytics.capacity, 1)) * 100)}%`,
                    }}
                  />
                </div>
                {analytics.waitlisted_count > 0 && (
                  <p className="mt-2 text-xs text-amber-600 font-medium">
                    {analytics.waitlisted_count} {t('statusWaitlisted')}
                  </p>
                )}
              </div>

              <div className="border border-ink/10 bg-white p-5 rounded shadow-sm">
                <div className="text-xs uppercase tracking-wider text-ink/50 font-medium">
                  {t('averageGrade')}
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {analytics.average_grade_pct != null ? `${analytics.average_grade_pct}%` : '—'}
                </div>
                <p className="mt-2 text-xs text-ink/50">
                  {analytics.published_grade_items} {t('publishedGradeItems')}
                </p>
              </div>

              <div className="border border-ink/10 bg-white p-5 rounded shadow-sm">
                <div className="text-xs uppercase tracking-wider text-ink/50 font-medium">
                  {t('averageCompletion')}
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {analytics.average_completion_pct}%
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-ink/10">
                  <div
                    className="h-full bg-emerald-600"
                    style={{ width: `${analytics.average_completion_pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-ink/50">{t('acrossAllLessons')}</p>
              </div>

              <div className="border border-ink/10 bg-white p-5 rounded shadow-sm">
                <div className="text-xs uppercase tracking-wider text-ink/50 font-medium">
                  {t('publishedGradeItems')}
                </div>
                <div className="mt-2 text-2xl font-bold text-ink">
                  {analytics.published_grade_items}
                </div>
                <p className="mt-2 text-xs text-ink/50">{t('gradedComponents')}</p>
              </div>
            </div>

            {/* Grade Distribution Breakdown */}
            <div className="border border-ink/10 bg-white p-6 rounded shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-ink">{t('gradeDistribution')}</h2>
              <div className="grid gap-3 sm:grid-cols-5">
                {(['A', 'B', 'C', 'D', 'F'] as const).map((letter) => {
                  const count = analytics.grade_distribution[letter] ?? 0;
                  const pct = totalGradesCount > 0 ? Math.round((count / totalGradesCount) * 100) : 0;
                  const color =
                    letter === 'A'
                      ? 'bg-emerald-600'
                      : letter === 'B'
                      ? 'bg-blue-600'
                      : letter === 'C'
                      ? 'bg-amber-500'
                      : letter === 'D'
                      ? 'bg-orange-500'
                      : 'bg-rose-600';

                  return (
                    <div key={letter} className="border border-ink/10 p-3 rounded bg-paper/50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{letter}</span>
                        <span className="text-xs text-ink/60 font-mono">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-ink/10">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Student Progress Matrix */}
            {progress && (
              <div className="border border-ink/10 bg-white p-6 rounded shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-ink">{t('studentProgressMatrix')}</h2>
                  <p className="mt-0.5 text-xs text-ink/60">{t('studentProgressMatrixSubtitle')}</p>
                </div>

                <div className="overflow-x-auto border border-ink/10 rounded">
                  <table className="w-full min-w-[40rem] text-sm text-start">
                    <thead>
                      <tr className="border-b border-ink/10 bg-paper text-xs uppercase text-ink/50">
                        <th className="px-4 py-3 font-medium text-start">{t('studentName')}</th>
                        <th className="px-4 py-3 font-medium text-start">{t('email')}</th>
                        <th className="px-4 py-3 font-medium text-center">{t('overallProgress')}</th>
                        {progress.modules.map((m) => (
                          <th
                            key={m.id}
                            className="px-3 py-3 font-medium text-center border-s border-ink/10"
                            title={m.title}
                          >
                            <span className="block max-w-[8rem] truncate">{m.title}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                      {progress.students.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3 + progress.modules.length}
                            className="px-4 py-6 text-center text-sm text-ink/50"
                          >
                            {t('noStudentsEnrolled')}
                          </td>
                        </tr>
                      ) : (
                        progress.students.map((student) => (
                          <tr key={student.student_id} className="hover:bg-paper/40">
                            <td className="px-4 py-3 font-medium text-ink">{student.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-ink/60">
                              {student.email}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-ink">
                                  {student.overall_pct}%
                                </span>
                                <div className="h-1.5 w-16 overflow-hidden rounded bg-ink/10">
                                  <div
                                    className="h-full bg-brass"
                                    style={{ width: `${student.overall_pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            {progress.modules.map((m) => {
                              const moduleLessons = m.lessons;
                              const completedLessons = moduleLessons.filter(
                                (l) =>
                                  student.lesson_progress[l.id]?.progress_pct >= 100 ||
                                  student.lesson_progress[l.id]?.completed_at != null,
                              ).length;
                              const isComplete =
                                moduleLessons.length > 0 &&
                                completedLessons === moduleLessons.length;

                              return (
                                <td
                                  key={m.id}
                                  className="px-3 py-3 text-center border-s border-ink/10 font-mono text-xs"
                                >
                                  {moduleLessons.length === 0 ? (
                                    <span className="text-ink/30">—</span>
                                  ) : isComplete ? (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                      ✓ {completedLessons}/{moduleLessons.length}
                                    </span>
                                  ) : completedLessons > 0 ? (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                      {completedLessons}/{moduleLessons.length}
                                    </span>
                                  ) : (
                                    <span className="text-ink/40">
                                      0/{moduleLessons.length}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </AsyncPanel>
    </div>
  );
}
