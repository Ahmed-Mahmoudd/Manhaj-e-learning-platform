import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminKeys,
  createFaculty,
  deleteFaculty,
  fetchFaculties,
  updateFaculty,
} from '@/api/admin';
import { AsyncPanel } from '@/components/AsyncPanel';
import {
  AdminButton,
  AdminInput,
  AdminPanel,
  AdminTable,
  FormError,
} from '@/components/admin/AdminUi';
import { useLocale } from '@/i18n/LocaleContext';
import type { Faculty } from '@/types/admin';

export function FacultiesPage() {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.faculties(),
    queryFn: fetchFaculties,
  });

  const faculties = data?.faculties ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('adminFaculties')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('adminFacultiesSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : `+ ${t('addNew')}`}
        </AdminButton>
      </header>

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && faculties.length === 0}
        emptyMessage={t('noFaculties')}
      >
        <AdminPanel>
          <AdminTable
            headers={[t('code'), t('nameEn'), t('nameAr'), t('departments'), t('actions')]}
          >
            {faculties.map((f) => (
              <FacultyRow key={f.id} faculty={f} />
            ))}
          </AdminTable>
        </AdminPanel>
      </AsyncPanel>
    </div>
  );
}

function FacultyRow({ faculty }: { faculty: Faculty }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [nameEn, setNameEn] = useState(faculty.name_en);
  const [nameAr, setNameAr] = useState(faculty.name_ar ?? '');
  const [code, setCode] = useState(faculty.code);
  const [err, setErr] = useState<Error | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => updateFaculty(faculty.id, { name_en: nameEn, name_ar: nameAr || undefined, code }),
    onSuccess: () => {
      setErr(null);
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (e: Error) => setErr(e),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFaculty(faculty.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
    onError: (e: Error) => setErr(e),
  });

  if (editing) {
    return (
      <tr className="bg-amber-50/30">
        <td className="px-5 py-4">
          <AdminInput value={code} onChange={(e) => setCode(e.target.value)} className="w-28" />
        </td>
        <td className="px-5 py-4">
          <AdminInput value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full" />
        </td>
        <td className="px-5 py-4">
          <AdminInput value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="w-full" />
        </td>
        <td className="px-5 py-4 font-semibold text-slate-600">{faculty.departments_count ?? 0}</td>
        <td className="px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {t('save')}
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => setEditing(false)}>
              {t('cancel')}
            </AdminButton>
          </div>
          <FormError error={err} />
        </td>
      </tr>
    );
  }

  const displayName = locale === 'ar' && faculty.name_ar ? faculty.name_ar : faculty.name_en;

  return (
    <tr className="hover:bg-amber-50/20 transition-colors">
      <td className="px-5 py-4">
        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-xs">
          {faculty.code}
        </span>
      </td>
      <td className="px-5 py-4 font-bold text-slate-900">{displayName}</td>
      <td className="px-5 py-4 text-slate-500">{faculty.name_ar ?? '—'}</td>
      <td className="px-5 py-4 font-semibold text-slate-700">{faculty.departments_count ?? 0}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="ghost" onClick={() => setEditing(true)}>
            ✏️ {t('edit')}
          </AdminButton>
          <AdminButton
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(t('confirmDelete'))) deleteMutation.mutate();
            }}
          >
            🗑️ {t('delete')}
          </AdminButton>
        </div>
        <FormError error={err} />
      </td>
    </tr>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: () => createFaculty({ name_en: nameEn, name_ar: nameAr || undefined, code }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      onDone();
    },
    onError: (e: Error) => setErr(e),
  });

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-white p-6 shadow-md shadow-amber-500/5 space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900">{t('addFaculty')}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('code')}</label>
          <AdminInput placeholder={t('code')} value={code} onChange={(e) => setCode(e.target.value)} className="w-full" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('nameEn')}</label>
          <AdminInput placeholder={t('nameEn')} value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('nameAr')}</label>
          <AdminInput placeholder={t('nameAr')} value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="w-full" />
        </div>
      </div>
      <FormError error={err} />
      <div className="flex items-center gap-3 pt-2">
        <AdminButton
          variant="primary"
          onClick={() => mutation.mutate()}
          disabled={!nameEn || !code || mutation.isPending}
        >
          {mutation.isPending ? t('processing') : t('create')}
        </AdminButton>
        <AdminButton variant="ghost" onClick={onDone}>
          {t('cancel')}
        </AdminButton>
      </div>
    </div>
  );
}
