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
        <h1 className="text-2xl font-semibold text-ink">{t('myGrades')}</h1>
        <p className="mt-1 text-sm text-ink/60">{t('myGradesSubtitle')}</p>
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
    <li className="border border-ink/10 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-sm font-medium text-ink">{course.code}</span>
            <span className="text-xs text-ink/40">§{section.section_number}</span>
          </div>
          <h2 className="mt-1 text-base font-medium text-ink">{courseTitle(course, locale)}</h2>
          <p className="mt-1 text-xs text-ink/50">{section.term.name}</p>
        </div>
        <OverallGrade overall={overall} />
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-ink/50">{t('noGradesForSection')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-start text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/45">
                <th className="px-5 py-3 font-medium">{t('gradeItem')}</th>
                <th className="px-3 py-3 font-medium">{t('gradeType')}</th>
                <th className="px-3 py-3 font-medium text-end">{t('score')}</th>
                <th className="px-3 py-3 font-medium text-end">{t('letterGrade')}</th>
                <th className="px-5 py-3 font-medium text-end">{t('weight')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
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
        <p className="text-xs uppercase tracking-wide text-ink/45">{t('overallGrade')}</p>
        <p className="mt-1 font-mono text-lg text-ink/30">—</p>
      </div>
    );
  }

  return (
    <div className="text-end">
      <p className="text-xs uppercase tracking-wide text-ink/45">{t('overallGrade')}</p>
      <div className="mt-1 flex flex-col items-end gap-1">
        <LetterGradeChip letter={overall.letter} size="lg" />
        <p className="text-xs text-ink/55">{overall.percentage.toFixed(1)}%</p>
      </div>
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
      <tr className={isNew ? 'bg-brass/5' : undefined}>
        <td className="px-5 py-3 font-medium text-ink">
          <span className="inline-flex items-center gap-2">
            {grade_item.name}
            {isNew && (
              <span className="rounded bg-brass/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-brass">
                {t('newGrade')}
              </span>
            )}
          </span>
        </td>
        <td className="px-3 py-3 text-ink/60">{t(gradeTypeLabel(grade_item.type))}</td>
        <td className="px-3 py-3 text-end font-mono text-ink">
          {formatScore(score)} / {formatScore(grade_item.max_score)}
        </td>
        <td className="px-3 py-3 text-end">
          <LetterGradeChip letter={letter} size="sm" />
        </td>
        <td className="px-5 py-3 text-end text-ink/60">{weightLabel}</td>
      </tr>
      {feedback ? (
        <tr className="bg-paper/60">
          <td colSpan={5} className="px-5 pb-3 pt-0 text-xs text-ink/55">
            <span className="font-medium text-ink/65">{t('feedback')}:</span> {feedback}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
