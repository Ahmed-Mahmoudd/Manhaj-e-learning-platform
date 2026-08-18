import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMyGrades, studentKeys } from '@/api/student';
import { useAuth } from '@/auth/AuthContext';
import { AsyncPanel } from '@/components/AsyncPanel';
import { LetterGradeChip } from '@/components/LetterGradeChip';
import { useLocale } from '@/i18n/LocaleContext';
import type { SectionGrades } from '@/types/grades';
import { courseTitle } from '@/utils/courseTitle';
import { gradeTypeLabel } from '@/utils/gradeType';
import { latestGradedAt, setGradesLastSeenAt } from '@/utils/gradesSeen';

export function GradesPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: studentKeys.grades(),
    queryFn: fetchMyGrades,
  });

  const sections = data?.grades ?? [];
  const [seenStamp, setSeenStamp] = useState<string | null>(null);

  useEffect(() => {
    if (!data || !user) return;
    const stamp = latestGradedAt(data.grades) ?? new Date().toISOString();
    setGradesLastSeenAt(user.id, stamp);
    setSeenStamp(stamp);
  }, [data, user]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('myGrades')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('myGradesSubtitle')}</p>
      </header>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && sections.length === 0}
        emptyMessage={t('noGrades')}
      >
        <ul className="space-y-6">
          {sections.map((block) => (
            <SectionGradesCard key={block.section.id} block={block} seenStamp={seenStamp} />
          ))}
        </ul>
      </AsyncPanel>
    </div>
  );
}

function SectionGradesCard({
  block,
  seenStamp,
}: {
  block: SectionGrades;
  seenStamp: string | null;
}) {
  const { t, locale } = useLocale();
  const { section, overall, items } = block;
  const { course } = section;
  const lastSeen = seenStamp;

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all hover:border-amber-500/30">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-xs">
              {course.code}
            </span>
            <span className="font-mono text-xs font-semibold rounded bg-slate-100 px-2 py-0.5 text-slate-600">
              §{section.section_number}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-slate-900">{courseTitle(course, locale)}</h2>
          <p className="mt-0.5 text-xs text-slate-400">🗓️ {section.term.name}</p>
        </div>
        <OverallGrade overall={overall} />
      </header>

      {items.length === 0 ? (
        <p className="px-6 py-6 text-sm text-slate-400 text-center">{t('noGradesForSection')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-start text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5 text-start">{t('gradeItem')}</th>
                <th className="px-4 py-3.5 text-start">{t('gradeType')}</th>
                <th className="px-4 py-3.5 text-end">{t('score')}</th>
                <th className="px-4 py-3.5 text-end">{t('letterGrade')}</th>
                <th className="px-6 py-3.5 text-end">{t('weight')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <GradeRow key={item.grade_item.id} item={item} lastSeenAt={lastSeen} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  );
}

function OverallGrade({ overall }: { overall: SectionGrades['overall'] }) {
  const { t } = useLocale();

  if (overall.percentage == null || overall.letter == null) {
    return (
      <div className="text-end">
        <p className="text-xs uppercase font-bold tracking-wider text-slate-400">{t('overallGrade')}</p>
        <p className="mt-1 font-mono text-xl font-bold text-slate-300">—</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-50/50 px-4 py-2.5 shadow-xs">
      <div className="text-end">
        <p className="text-[11px] uppercase font-bold tracking-wider text-amber-800">{t('overallGrade')}</p>
        <p className="font-mono text-sm font-bold text-slate-800">{overall.percentage.toFixed(1)}%</p>
      </div>
      <LetterGradeChip letter={overall.letter} size="lg" />
    </div>
  );
}

function GradeRow({
  item,
  lastSeenAt,
}: {
  item: SectionGrades['items'][0];
  lastSeenAt: string | null;
}) {
  const { t } = useLocale();
  const { grade_item, score, letter, feedback, graded_at } = item;
  const weightLabel = grade_item.weight != null ? `${grade_item.weight}%` : '—';
  const isNew =
    graded_at != null &&
    (!lastSeenAt || new Date(graded_at).getTime() > new Date(lastSeenAt).getTime());

  return (
    <Fragment>
      <tr className={`hover:bg-slate-50/60 transition-colors ${isNew ? 'bg-amber-50/30' : ''}`}>
        <td className="px-6 py-4 font-semibold text-slate-900">
          <span className="inline-flex items-center gap-2">
            {grade_item.name}
            {isNew && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                {t('newGrade')}
              </span>
            )}
          </span>
        </td>
        <td className="px-4 py-4">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {t(gradeTypeLabel(grade_item.type))}
          </span>
        </td>
        <td className="px-4 py-4 text-end font-mono font-bold text-slate-900">
          {formatScore(score)} <span className="text-slate-400 font-normal">/ {formatScore(grade_item.max_score)}</span>
        </td>
        <td className="px-4 py-4 text-end">
          <LetterGradeChip letter={letter} size="sm" />
        </td>
        <td className="px-6 py-4 text-end font-mono text-xs font-medium text-slate-500">{weightLabel}</td>
      </tr>
      {feedback ? (
        <tr className="bg-slate-50/80">
          <td colSpan={5} className="px-6 pb-3 pt-1 text-xs text-slate-600">
            💬 <span className="font-semibold text-slate-700">{t('feedback')}:</span> {feedback}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
