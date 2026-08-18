import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGradeItem,
  fetchSectionGradeItems,
  instructorKeys,
} from '@/api/instructor';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { SectionActionLinks } from '@/components/instructor/SectionActionLinks';
import { InstructorInvalidSection, useInstructorSectionId } from '@/hooks/useInstructorSectionId';
import { useLocale } from '@/i18n/LocaleContext';
import { apiErrorMessage } from '@/utils/apiError';
import type { GradeItemType } from '@/types/grades';
import type { InstructorGradeItem } from '@/types/instructor';
import { gradeTypeLabel } from '@/utils/gradeType';

const GRADE_TYPES: GradeItemType[] = [
  'assignment',
  'quiz',
  'midterm',
  'final',
  'project',
  'lab',
  'attendance',
];

export function SectionGradesPage() {
  const sid = useInstructorSectionId();
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: instructorKeys.gradeItems(sid ?? 0),
    queryFn: () => fetchSectionGradeItems(sid!),
    enabled: sid !== null,
  });

  const items = data?.grade_items ?? [];

  const summary = useMemo(() => {
    const total = items.length;
    const published = items.filter((i) => i.is_published).length;
    const totalWeight = items.reduce((acc, i) => acc + (i.weight ?? 0), 0);
    const totalGrades = items.reduce((acc, i) => acc + i.grades_count, 0);
    return { total, published, totalWeight, totalGrades };
  }, [items]);

  if (sid === null) return <InstructorInvalidSection />;

  return (
    <div className="space-y-8">
      <BackLink to="/instructor">{t('backToInstructorSections')}</BackLink>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">{t('sectionGrades')}</h1>
            <p className="mt-1 text-sm text-ink/60">{t('sectionGradesSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded bg-brass px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-brass-hover focus:ring-2 focus:ring-brass/40"
          >
            {showForm ? t('cancel') : `+ ${t('newGradeItem')}`}
          </button>
        </div>
        <SectionActionLinks sectionId={sid} />
      </header>

      {/* Summary Stats Header */}
      {!isLoading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium uppercase tracking-wider text-ink/50">
              {t('sectionGrades')}
            </span>
            <p className="mt-1 font-mono text-xl font-bold text-ink">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium uppercase tracking-wider text-ink/50">
              {t('publishedGradeItems')}
            </span>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-700">
              {summary.published} <span className="text-xs font-normal text-ink/40">/ {summary.total}</span>
            </p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium uppercase tracking-wider text-ink/50">
              {t('weight')}
            </span>
            <p className="mt-1 font-mono text-xl font-bold text-ink">
              {summary.totalWeight}%
            </p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white p-4 shadow-xs">
            <span className="text-xs font-medium uppercase tracking-wider text-ink/50">
              {t('totalEvaluations')}
            </span>
            <p className="mt-1 font-mono text-xl font-bold text-ink">{summary.totalGrades}</p>
          </div>
        </div>
      )}

      {showForm && (
        <NewGradeItemForm sectionId={sid} onDone={() => setShowForm(false)} />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && items.length === 0}
        emptyMessage={t('noGradeItems')}
      >
        <div className="space-y-3">
          {items.map((item) => (
            <GradeItemCard key={item.id} sectionId={sid} item={item} />
          ))}
        </div>
      </AsyncPanel>
    </div>
  );
}

function GradeItemCard({ sectionId, item }: { sectionId: number; item: InstructorGradeItem }) {
  const { t } = useLocale();
  const weightLabel = item.weight != null ? `${item.weight}%` : '—';

  return (
    <div className="group rounded-lg border border-ink/10 bg-white p-5 shadow-xs transition-all hover:border-brass/40 hover:shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        {/* Left Info */}
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-semibold text-ink group-hover:text-brass-hover transition-colors">
              {item.name}
            </h2>

            {/* Type badge */}
            <span className="inline-flex items-center rounded border border-ink/10 bg-paper px-2 py-0.5 text-xs font-medium text-ink/70">
              {t(gradeTypeLabel(item.type))}
            </span>

            {/* Published / Draft Pill */}
            {item.is_published ? (
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

          {/* Grouped Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/60">
            <span className="inline-flex items-center gap-1">
              <span className="text-ink/40">{t('maxScoreLabel')}:</span>
              <span className="font-mono font-medium text-ink/80">{item.max_score}</span>
            </span>
            <span className="text-ink/20">•</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-ink/40">{t('weight')}:</span>
              <span className="font-mono font-medium text-ink/80">{weightLabel}</span>
            </span>
            <span className="text-ink/20">•</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-ink/40">{t('gradesEntered', { count: item.grades_count })}</span>
            </span>
          </div>
        </div>

        {/* Right CTA */}
        <div className="flex shrink-0 items-center justify-end pt-2 sm:pt-0">
          <Link
            to={`/instructor/sections/${sectionId}/grades/${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-brass/10 px-3.5 py-2 text-xs font-semibold text-brass transition hover:bg-brass hover:text-white"
          >
            {t('enterGrades')} →
          </Link>
        </div>
      </div>
    </div>
  );
}

function NewGradeItemForm({ sectionId, onDone }: { sectionId: number; onDone: () => void }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<GradeItemType>('assignment');
  const [maxScore, setMaxScore] = useState('100');
  const [weight, setWeight] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createGradeItem(sectionId, {
        name,
        type,
        max_score: Number(maxScore),
        weight: weight ? Number(weight) : null,
      }),
    onSuccess: () => {
      setFormError(null);
      setName('');
      setMaxScore('100');
      setWeight('');
      void queryClient.invalidateQueries({ queryKey: instructorKeys.gradeItems(sectionId) });
      onDone();
    },
    onError: (err: Error) => {
      setFormError(apiErrorMessage(err, t('networkError'), t('serverError')));
    },
  });

  return (
    <form
      className="space-y-4 rounded-lg border border-brass/30 bg-white p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="border-b border-ink/10 pb-3">
        <h2 className="text-base font-semibold text-ink">{t('newGradeItem')}</h2>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">{t('gradeItemNamePlaceholder')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('gradeItemNamePlaceholder')}
            required
            className="w-full rounded border border-ink/15 bg-paper/30 px-3.5 py-2 text-sm text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">{t('termType')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as GradeItemType)}
              className="w-full rounded border border-ink/15 bg-paper/30 px-3 py-2 text-sm text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass"
            >
              {GRADE_TYPES.map((gt) => (
                <option key={gt} value={gt}>
                  {t(gradeTypeLabel(gt))}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">{t('maxScoreLabel')}</label>
            <input
              type="number"
              min={1}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              placeholder={t('maxScoreLabel')}
              required
              className="w-full rounded border border-ink/15 bg-paper/30 px-3 py-2 text-sm text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">{t('weightOptional')}</label>
            <input
              type="number"
              min={0}
              max={100}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={t('weightOptional')}
              className="w-full rounded border border-ink/15 bg-paper/30 px-3 py-2 text-sm text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass"
            />
          </div>
        </div>
      </div>

      {formError && (
        <p className="text-xs text-brick" role="alert">
          {formError}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded bg-brass px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-brass-hover disabled:opacity-60"
        >
          {mutation.isPending ? t('processing') : t('createGradeItem')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border border-ink/15 px-4 py-2 text-sm text-ink/70 transition hover:bg-paper"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
