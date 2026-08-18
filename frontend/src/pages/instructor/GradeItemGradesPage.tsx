import { useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  enterStudentGrade,
  fetchGradeItemGrades,
  fetchSectionEnrolments,
  fetchSectionGradeItems,
  instructorKeys,
  publishGradeItem,
} from '@/api/instructor';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { InstructorInvalidSection, useInstructorSectionId } from '@/hooks/useInstructorSectionId';
import { useAuth } from '@/auth/AuthContext';
import { useLocale } from '@/i18n/LocaleContext';
import { apiErrorMessage } from '@/utils/apiError';
import { parseRouteId } from '@/utils/routeParams';
import type { EnteredGrade } from '@/types/instructor';

interface StudentGradeRow {
  studentId: number;
  name: string;
  score: string;
  feedback: string;
  letter: string | null;
  saved: boolean;
}

export function GradeItemGradesPage() {
  const sid = useInstructorSectionId();
  const { itemId } = useParams<{ itemId: string }>();
  const iid = parseRouteId(itemId);
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<StudentGradeRow[]>([]);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    setRows([]);
  }, [iid]);

  const gradesQuery = useQuery({
    queryKey: instructorKeys.itemGrades(iid ?? 0),
    queryFn: () => fetchGradeItemGrades(iid!),
    enabled: iid !== null,
  });

  const itemsQuery = useQuery({
    queryKey: instructorKeys.gradeItems(sid ?? 0),
    queryFn: () => fetchSectionGradeItems(sid!),
    enabled: sid !== null,
  });

  const enrolmentsQuery = useQuery({
    queryKey: instructorKeys.enrolments(sid ?? 0),
    queryFn: () => fetchSectionEnrolments(sid!),
    enabled: sid !== null,
  });

  const enrolledStudents = useMemo(
    () =>
      (enrolmentsQuery.data?.enrolments ?? []).filter((e) => e.status === 'enrolled'),
    [enrolmentsQuery.data],
  );

  const gradeByStudent = useMemo(() => {
    const map = new Map<number, EnteredGrade>();
    for (const g of gradesQuery.data?.grades ?? []) {
      map.set(g.student.id, g);
    }
    return map;
  }, [gradesQuery.data]);

  useEffect(() => {
    if (!enrolledStudents.length && !gradesQuery.data) return;
    setRows(
      enrolledStudents.map((e) => {
        const existing = gradeByStudent.get(e.student.id);
        return {
          studentId: e.student.id,
          name: e.student.name,
          score: existing != null ? String(existing.score) : '',
          feedback: existing?.feedback ?? '',
          letter: existing?.letter ?? null,
          saved: existing != null,
        };
      }),
    );
  }, [enrolledStudents, gradeByStudent, gradesQuery.data]);

  const isLoading = gradesQuery.isLoading || enrolmentsQuery.isLoading || itemsQuery.isLoading;
  const error = gradesQuery.error ?? enrolmentsQuery.error ?? itemsQuery.error;
  const gradeItem = gradesQuery.data?.grade_item;
  const isPublished =
    itemsQuery.data?.grade_items.find((i) => i.id === iid)?.is_published ?? false;

  const publishMutation = useMutation({
    mutationFn: () => publishGradeItem(iid!),
    onSuccess: () => {
      setPublishError(null);
      void queryClient.invalidateQueries({ queryKey: instructorKeys.itemGrades(iid!) });
      void queryClient.invalidateQueries({ queryKey: instructorKeys.gradeItems(sid!) });
    },
    onError: (err: Error) => {
      setPublishError(apiErrorMessage(err, t('networkError'), t('serverError')));
    },
  });

  const { user } = useAuth();
  const canPublish = user?.role === 'instructor' || user?.role === 'platform_admin';

  if (sid === null || iid === null) return <InstructorInvalidSection />;

  return (
    <div className="space-y-8">
      <BackLink to={`/instructor/sections/${sid}/grades`}>{t('backToGradeItems')}</BackLink>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !gradeItem}
        emptyMessage={t('gradeItemNotFound')}
      >
        {gradeItem && (
          <div className="space-y-6">
            <header className="flex flex-col gap-4 rounded-lg border border-ink/10 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-semibold text-ink">{gradeItem.name}</h1>
                  {isPublished ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {t('published')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      {t('draft')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink/60">
                  {t('maxScore', { score: gradeItem.max_score })} • {rows.filter((r) => r.saved).length} / {rows.length} {t('gradesEntered', { count: rows.length })}
                </p>
              </div>

              {!isPublished && canPublish && (
                <div className="flex flex-col items-start sm:items-end gap-1">
                  <button
                    type="button"
                    disabled={publishMutation.isPending || rows.every((r) => !r.saved)}
                    onClick={() => publishMutation.mutate()}
                    className="inline-flex items-center gap-2 rounded bg-brass px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-brass-hover disabled:opacity-50"
                  >
                    {publishMutation.isPending ? t('processing') : t('publishGrades')}
                  </button>
                  <span className="text-xs text-ink/40">{t('publishGradesHint')}</span>
                </div>
              )}
            </header>

            {publishError && (
              <div className="rounded border border-brick/30 bg-brick/5 p-4 text-xs text-brick" role="alert">
                {publishError}
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-paper text-start text-xs uppercase tracking-wider text-ink/50">
                      <th className="px-5 py-3 font-medium">{t('studentName')}</th>
                      <th className="px-4 py-3 font-medium">{t('score')}</th>
                      <th className="px-4 py-3 font-medium text-center">{t('letterGrade')}</th>
                      <th className="px-4 py-3 font-medium">{t('feedback')}</th>
                      <th className="px-5 py-3 font-medium text-end" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {rows.map((row) => (
                      <GradeEntryRow
                        key={row.studentId}
                        row={row}
                        itemId={iid}
                        sectionId={sid}
                        maxScore={gradeItem.max_score}
                        onUpdate={(patch) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.studentId === row.studentId ? { ...r, ...patch } : r,
                            ),
                          )
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </AsyncPanel>
    </div>
  );
}

function GradeEntryRow({
  row,
  itemId,
  sectionId,
  maxScore,
  onUpdate,
}: {
  row: StudentGradeRow;
  itemId: number;
  sectionId: number;
  maxScore: number;
  onUpdate: (patch: Partial<StudentGradeRow>) => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: () =>
      enterStudentGrade(itemId, row.studentId, {
        score: Number(row.score),
        feedback: row.feedback.trim() || null,
      }),
    onSuccess: (data) => {
      setSaveError(null);
      onUpdate({
        letter: data.grade.letter,
        saved: true,
      });
      void queryClient.invalidateQueries({ queryKey: instructorKeys.itemGrades(itemId) });
      void queryClient.invalidateQueries({ queryKey: instructorKeys.gradeItems(sectionId) });
    },
    onError: (err: Error) => {
      setSaveError(
        apiErrorMessage(err, t('networkError'), t('serverError')),
      );
    },
  });

  return (
    <tr className="hover:bg-paper/30 transition-colors">
      <td className="px-5 py-3.5 font-medium text-ink">
        <div className="flex items-center gap-2">
          <span>{row.name}</span>
          {row.saved && (
            <span className="text-xs text-emerald-600 font-normal" title={t('saved')}>
              ✓
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="inline-flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={maxScore}
            step="0.5"
            value={row.score}
            onChange={(e) => onUpdate({ score: e.target.value, saved: false })}
            className="w-20 rounded border border-ink/15 bg-paper/20 px-2.5 py-1.5 font-mono text-sm transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <span className="text-xs font-mono text-ink/40">/ {maxScore}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-ink">
        {row.letter ? (
          <span className="inline-block rounded bg-paper px-2 py-0.5 text-ink">
            {row.letter}
          </span>
        ) : (
          <span className="text-ink/30">—</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <input
          type="text"
          value={row.feedback}
          placeholder={t('feedback')}
          onChange={(e) => onUpdate({ feedback: e.target.value, saved: false })}
          className="w-full min-w-[8rem] rounded border border-ink/15 bg-paper/20 px-3 py-1.5 text-xs text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass"
        />
      </td>
      <td className="px-5 py-3.5 text-end">
        <button
          type="button"
          disabled={saveMutation.isPending || row.score === ''}
          onClick={() => saveMutation.mutate()}
          className="rounded border border-brass/20 bg-brass/10 px-3 py-1 text-xs font-medium text-brass transition hover:bg-brass hover:text-white disabled:opacity-40"
        >
          {saveMutation.isPending ? t('saving') : t('saveGrade')}
        </button>
        {saveError && <p className="mt-1 text-xs text-brick">{saveError}</p>}
      </td>
    </tr>
  );
}
