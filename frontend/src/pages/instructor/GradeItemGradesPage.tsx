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

  if (sid === null || iid === null) return <InstructorInvalidSection />;

  return (
    <div className="space-y-6">
      <BackLink to={`/instructor/sections/${sid}/grades`}>{t('backToGradeItems')}</BackLink>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !gradeItem}
        emptyMessage={t('gradeItemNotFound')}
      >
        {gradeItem && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-ink">{gradeItem.name}</h1>
                <p className="mt-1 text-sm text-ink/60">
                  {t('maxScore', { score: gradeItem.max_score })}
                </p>
              </div>
              {!isPublished && (
                <button
                  type="button"
                  disabled={publishMutation.isPending || rows.every((r) => !r.saved)}
                  onClick={() => publishMutation.mutate()}
                  className="bg-brass px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {publishMutation.isPending ? t('processing') : t('publishGrades')}
                </button>
              )}
              {isPublished && (
                <span className="text-sm font-medium text-green-700">{t('published')}</span>
              )}
            </header>

            {publishError && (
              <p className="text-sm text-brick" role="alert">
                {publishError}
              </p>
            )}

            {!isPublished && (
              <p className="text-xs text-ink/50">{t('publishGradesHint')}</p>
            )}

            <div className="overflow-x-auto border border-ink/10 bg-white">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-start text-xs uppercase text-ink/45">
                    <th className="px-4 py-3 font-medium">{t('studentName')}</th>
                    <th className="px-4 py-3 font-medium">{t('score')}</th>
                    <th className="px-4 py-3 font-medium">{t('letterGrade')}</th>
                    <th className="px-4 py-3 font-medium">{t('feedback')}</th>
                    <th className="px-4 py-3 font-medium" />
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
          </>
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
    <tr>
      <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          max={maxScore}
          step="0.5"
          value={row.score}
          onChange={(e) => onUpdate({ score: e.target.value, saved: false })}
          className="w-24 border border-ink/15 px-2 py-1 font-mono text-sm"
        />
        <span className="ms-1 text-xs text-ink/40">/ {maxScore}</span>
      </td>
      <td className="px-4 py-3 font-mono text-ink">{row.letter ?? '—'}</td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={row.feedback}
          onChange={(e) => onUpdate({ feedback: e.target.value, saved: false })}
          className="w-full min-w-[8rem] border border-ink/15 px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-3 text-end">
        <button
          type="button"
          disabled={saveMutation.isPending || row.score === ''}
          onClick={() => saveMutation.mutate()}
          className="text-xs text-brass underline disabled:opacity-50"
        >
          {saveMutation.isPending ? t('saving') : t('saveGrade')}
        </button>
        {saveError && <p className="mt-1 text-xs text-brick">{saveError}</p>}
      </td>
    </tr>
  );
}
