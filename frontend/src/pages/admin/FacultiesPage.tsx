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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('adminFaculties')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('adminFacultiesSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : t('addNew')}
        </AdminButton>
      </header>

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && (data?.faculties.length ?? 0) === 0}
        emptyMessage={t('noFaculties')}
      >
        <AdminPanel>
          <AdminTable
            headers={[t('code'), t('nameEn'), t('nameAr'), t('departments'), t('actions')]}
          >
            {(data?.faculties ?? []).map((f) => (
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
      <tr>
        <td className="px-4 py-3">
          <AdminInput value={code} onChange={(e) => setCode(e.target.value)} className="w-24" />
        </td>
        <td className="px-4 py-3">
          <AdminInput value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        </td>
        <td className="px-4 py-3">
          <AdminInput value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        </td>
        <td className="px-4 py-3 text-ink/50">{faculty.departments_count ?? 0}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="primary" onClick={() => saveMutation.mutate()}>
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
    <tr>
      <td className="px-4 py-3 font-mono text-ink">{faculty.code}</td>
      <td className="px-4 py-3 text-ink">{displayName}</td>
      <td className="px-4 py-3 text-ink/60">{faculty.name_ar ?? '—'}</td>
      <td className="px-4 py-3 text-ink/60">{faculty.departments_count ?? 0}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="ghost" onClick={() => setEditing(true)}>
            {t('edit')}
          </AdminButton>
          <AdminButton
            variant="danger"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(t('confirmDelete'))) deleteMutation.mutate();
            }}
          >
            {t('delete')}
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
    <AdminPanel className="space-y-3 p-5">
      <h2 className="text-sm font-medium text-ink">{t('addFaculty')}</h2>
      <div className="flex flex-wrap gap-3">
        <AdminInput placeholder={t('code')} value={code} onChange={(e) => setCode(e.target.value)} />
        <AdminInput placeholder={t('nameEn')} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        <AdminInput placeholder={t('nameAr')} value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
      </div>
      <FormError error={err} />
      <AdminButton
        variant="primary"
        onClick={() => mutation.mutate()}
        disabled={!nameEn || !code || mutation.isPending}
      >
        {mutation.isPending ? t('processing') : t('create')}
      </AdminButton>
    </AdminPanel>
  );
}
