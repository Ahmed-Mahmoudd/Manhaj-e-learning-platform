import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createGradeItem,
  fetchSectionGradeItems,
  instructorKeys,
} from '@/api/instructor';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
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

  if (sid === null) return <InstructorInvalidSection />;

  return (
    <div className="space-y-6">
      <BackLink to="/instructor">{t('backToInstructorSections')}</BackLink>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{t('sectionGrades')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('sectionGradesSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="bg-brass px-4 py-2 text-sm text-white transition hover:bg-brass-hover"
        >
          {showForm ? t('cancel') : t('newGradeItem')}
        </button>
      </header>

      {showForm && (
        <NewGradeItemForm sectionId={sid} onDone={() => setShowForm(false)} />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && items.length === 0}
        emptyMessage={t('noGradeItems')}
      >
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {items.map((item) => (
            <GradeItemRow key={item.id} sectionId={sid} item={item} />
          ))}
        </ul>
      </AsyncPanel>
    </div>
  );
}

function GradeItemRow({ sectionId, item }: { sectionId: number; item: InstructorGradeItem }) {
  const { t } = useLocale();
  const weightLabel = item.weight != null ? `${item.weight}%` : '—';

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium text-ink">{item.name}</h2>
          {item.is_published ? (
            <span className="text-xs uppercase text-green-700">{t('published')}</span>
          ) : (
            <span className="text-xs uppercase text-ink/40">{t('draft')}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-ink/50">
          {t(gradeTypeLabel(item.type))} · {t('maxScore', { score: item.max_score })} ·{' '}
          {t('weight')}: {weightLabel} · {t('gradesEntered', { count: item.grades_count })}
        </p>
      </div>
      <Link
        to={`/instructor/sections/${sectionId}/grades/${item.id}`}
        className="text-sm text-brass transition hover:text-brass-hover"
      >
        {t('enterGrades')} →
      </Link>
    </li>
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
      className="space-y-3 border border-ink/10 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <h2 className="text-sm font-medium text-ink">{t('newGradeItem')}</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('gradeItemNamePlaceholder')}
        required
        className="w-full border border-ink/15 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as GradeItemType)}
          className="border border-ink/15 px-3 py-2 text-sm"
        >
          {GRADE_TYPES.map((gt) => (
            <option key={gt} value={gt}>
              {t(gradeTypeLabel(gt))}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
          placeholder={t('maxScoreLabel')}
          required
          className="w-28 border border-ink/15 px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={t('weightOptional')}
          className="w-28 border border-ink/15 px-3 py-2 text-sm"
        />
      </div>
      {formError && (
        <p className="text-xs text-brick" role="alert">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-brass px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {mutation.isPending ? t('processing') : t('createGradeItem')}
      </button>
    </form>
  );
}
