import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateTerm,
  adminKeys,
  createTerm,
  deactivateTerm,
  fetchTerms,
} from '@/api/admin';
import { AsyncPanel } from '@/components/AsyncPanel';
import {
  AdminButton,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTable,
  FormError,
} from '@/components/admin/AdminUi';
import { useLocale } from '@/i18n/LocaleContext';
import type { MessageKey } from '@/i18n/messages';
import { trimRequired } from '@/utils/formText';

function formatTermDateRange(startsAt: string, endsAt: string, locale: 'en' | 'ar'): string {
  try {
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${startsAt} – ${endsAt}`;
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const loc = locale === 'ar' ? 'ar-EG' : 'en-US';
    const arrow = locale === 'ar' ? '←' : '→';
    return `${s.toLocaleDateString(loc, opts)} ${arrow} ${e.toLocaleDateString(loc, opts)}`;
  } catch {
    return `${startsAt} – ${endsAt}`;
  }
}

export function TermsPage() {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.terms(),
    queryFn: fetchTerms,
  });

  const terms = data?.terms ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('adminTerms')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('adminTermsSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : `+ ${t('addNew')}`}
        </AdminButton>
      </header>

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && terms.length === 0}
        emptyMessage={t('noTerms')}
      >
        <AdminPanel>
          <AdminTable headers={[t('termName'), t('termType'), t('dates'), t('status'), t('actions')]}>
            {terms.map((term) => (
              <TermRow key={term.id} term={term} />
            ))}
          </AdminTable>
        </AdminPanel>
      </AsyncPanel>
    </div>
  );
}

function termTypeLabel(type: string, t: (key: MessageKey) => string): string {
  const key = `termType_${type}` as MessageKey;
  return t(key);
}

function TermRow({ term }: { term: { id: number; name: string; type: string; starts_at: string; ends_at: string; is_active: boolean } }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [err, setErr] = useState<Error | null>(null);

  const activateMutation = useMutation({
    mutationFn: () => activateTerm(term.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.terms() }),
    onError: (e: Error) => setErr(e),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateTerm(term.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.terms() }),
    onError: (e: Error) => setErr(e),
  });

  const formattedDates = formatTermDateRange(term.starts_at, term.ends_at, locale);

  return (
    <tr className="hover:bg-amber-50/20 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
            🎓
          </span>
          <span className="font-semibold text-slate-900">{term.name}</span>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
          {termTypeLabel(term.type, t)}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-600">
          <span className="text-slate-400">🗓️</span> {formattedDates}
        </span>
      </td>
      <td className="px-5 py-4">
        {term.is_active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            {t('active')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {t('inactive')}
          </span>
        )}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {term.is_active ? (
            <AdminButton variant="ghost" onClick={() => deactivateMutation.mutate()} disabled={deactivateMutation.isPending}>
              {deactivateMutation.isPending ? t('processing') : t('deactivate')}
            </AdminButton>
          ) : (
            <AdminButton variant="primary" onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
              {activateMutation.isPending ? t('processing') : t('activate')}
            </AdminButton>
          )}
        </div>
        <FormError error={err} />
      </td>
    </tr>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('semester');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [err, setErr] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!trimRequired(name)) throw new Error(t('formRequiredFields'));
      if (!startsAt || !endsAt) throw new Error(t('formRequiredFields'));
      if (startsAt >= endsAt) throw new Error(t('formInvalidDateRange'));
      return createTerm({ name: name.trim(), type, starts_at: startsAt, ends_at: endsAt });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.terms() });
      onDone();
    },
    onError: (e: Error) => setErr(e),
  });

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-white p-6 shadow-md shadow-amber-500/5 space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900">{t('newTerm')}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('termName')}</label>
          <AdminInput
            placeholder={t('termName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('termType')}</label>
          <AdminSelect value={type} onChange={(e) => setType(e.target.value)} className="w-full">
            <option value="semester">{t('termType_semester')}</option>
            <option value="quarter">{t('termType_quarter')}</option>
            <option value="trimester">{t('termType_trimester')}</option>
            <option value="summer">{t('termType_summer')}</option>
          </AdminSelect>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('dates')} (Start)</label>
          <AdminInput type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('dates')} (End)</label>
          <AdminInput type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full" />
        </div>
      </div>

      <FormError error={err} />

      <div className="flex items-center gap-3 pt-2">
        <AdminButton variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? t('processing') : t('create')}
        </AdminButton>
        <AdminButton variant="ghost" onClick={onDone}>
          {t('cancel')}
        </AdminButton>
      </div>
    </div>
  );
}
