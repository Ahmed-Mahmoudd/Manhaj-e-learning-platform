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
import { StatChip } from '@/components/StatChip';
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

export function TermsPage() {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.terms(),
    queryFn: fetchTerms,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('adminTerms')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('adminTermsSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : t('addNew')}
        </AdminButton>
      </header>

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && (data?.terms.length ?? 0) === 0}
        emptyMessage={t('noTerms')}
      >
        <AdminPanel>
          <AdminTable headers={[t('termName'), t('termType'), t('dates'), t('status'), t('actions')]}>
            {(data?.terms ?? []).map((term) => (
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
  const { t } = useLocale();
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

  return (
    <tr>
      <td className="px-4 py-3 font-medium text-ink">{term.name}</td>
      <td className="px-4 py-3 text-ink/60">{termTypeLabel(term.type, t)}</td>
      <td className="px-4 py-3 font-mono text-xs text-ink/60">
        {term.starts_at} – {term.ends_at}
      </td>
      <td className="px-4 py-3">
        {term.is_active ? (
          <StatChip variant="sage">{t('active')}</StatChip>
        ) : (
          <StatChip>{t('inactive')}</StatChip>
        )}
      </td>
      <td className="px-4 py-3">
        {term.is_active ? (
          <AdminButton variant="ghost" onClick={() => deactivateMutation.mutate()}>
            {t('deactivate')}
          </AdminButton>
        ) : (
          <AdminButton variant="primary" onClick={() => activateMutation.mutate()}>
            {t('activate')}
          </AdminButton>
        )}
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
    <AdminPanel className="space-y-3 p-5">
      <AdminInput placeholder={t('termName')} value={name} onChange={(e) => setName(e.target.value)} />
      <AdminSelect value={type} onChange={(e) => setType(e.target.value)}>
        <option value="semester">{t('termType_semester')}</option>
        <option value="quarter">{t('termType_quarter')}</option>
        <option value="trimester">{t('termType_trimester')}</option>
        <option value="summer">{t('termType_summer')}</option>
      </AdminSelect>
      <div className="flex flex-wrap gap-3">
        <AdminInput type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <AdminInput type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </div>
      <FormError error={err} />
      <AdminButton variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {t('create')}
      </AdminButton>
    </AdminPanel>
  );
}
