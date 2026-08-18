import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import {
  adminKeys,
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  fetchFaculties,
  updateDepartment,
} from '@/api/admin';
import { AsyncPanel } from '@/components/AsyncPanel';
import {
  AdminButton,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTable,
  FormError,
  adminTableCell,
} from '@/components/admin/AdminUi';
import { useLocale } from '@/i18n/LocaleContext';
import type { Department } from '@/types/admin';

export function DepartmentsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [facultyFilter, setFacultyFilter] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);

  const isFacultyAdmin = user?.role === 'faculty_admin';

  const facultiesQuery = useQuery({
    queryKey: adminKeys.faculties(),
    queryFn: fetchFaculties,
    enabled: !isFacultyAdmin,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.departments(isFacultyAdmin ? undefined : (facultyFilter || undefined)),
    queryFn: () => fetchDepartments(isFacultyAdmin ? undefined : (facultyFilter || undefined)),
  });

  const departments = data?.departments ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('adminDepartments')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('adminDepartmentsSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isFacultyAdmin && (
            <AdminSelect
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value ? Number(e.target.value) : '')}
              className="min-w-[14rem]"
            >
              <option value="">{t('allFaculties')}</option>
              {(facultiesQuery.data?.faculties ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} — {f.name_en}
                </option>
              ))}
            </AdminSelect>
          )}
          <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? t('cancel') : `+ ${t('addNew')}`}
          </AdminButton>
        </div>
      </header>

      {showForm && (
        <CreateForm
          isFacultyAdmin={isFacultyAdmin}
          faculties={facultiesQuery.data?.faculties ?? []}
          onDone={() => setShowForm(false)}
        />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && departments.length === 0}
        emptyMessage={t('noDepartments')}
      >
        <AdminPanel>
          <AdminTable
            headers={[t('code'), t('nameEn'), t('faculty'), t('actions')]}
          >
            {departments.map((d) => (
              <DeptRow key={d.id} dept={d} />
            ))}
          </AdminTable>
        </AdminPanel>
      </AsyncPanel>
    </div>
  );
}

function DeptRow({ dept }: { dept: Department }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [nameEn, setNameEn] = useState(dept.name_en);
  const [code, setCode] = useState(dept.code);
  const [err, setErr] = useState<Error | null>(null);

  const saveMutation = useMutation({
    mutationFn: () => updateDepartment(dept.id, { name_en: nameEn, code }),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (e: Error) => setErr(e),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDepartment(dept.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
    onError: (e: Error) => setErr(e),
  });

  if (editing) {
    return (
      <tr className="bg-amber-50/30">
        <td className={adminTableCell}>
          <AdminInput value={code} onChange={(e) => setCode(e.target.value)} className="w-full" />
        </td>
        <td className={adminTableCell}>
          <AdminInput value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full" />
        </td>
        <td className={`${adminTableCell} text-slate-500 font-mono`}>{dept.faculty?.code ?? '—'}</td>
        <td className={adminTableCell}>
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

  const displayName = locale === 'ar' && dept.name_ar ? dept.name_ar : dept.name_en;

  return (
    <tr className="hover:bg-amber-50/20 transition-colors">
      <td className={adminTableCell}>
        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-xs">
          {dept.code}
        </span>
      </td>
      <td className={`${adminTableCell} font-bold text-slate-900`}>{displayName}</td>
      <td className={`${adminTableCell} font-mono text-xs text-slate-600`}>
        <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold">
          {dept.faculty?.code ?? '—'}
        </span>
      </td>
      <td className={adminTableCell}>
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

function CreateForm({
  isFacultyAdmin,
  faculties,
  onDone,
}: {
  isFacultyAdmin: boolean;
  faculties: { id: number; code: string; name_en: string }[];
  onDone: () => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [facultyId, setFacultyId] = useState(faculties[0]?.id ?? 0);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createDepartment({
        faculty_id: isFacultyAdmin ? 0 : facultyId,
        name_en: nameEn,
        name_ar: nameAr || undefined,
        code,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      onDone();
    },
    onError: (e: Error) => setErr(e),
  });

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-white p-6 shadow-md shadow-amber-500/5 space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900">{t('addDepartment')}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!isFacultyAdmin && faculties.length > 0 && (
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-600">{t('faculty')}</label>
            <AdminSelect value={facultyId} onChange={(e) => setFacultyId(Number(e.target.value))} className="w-full">
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} — {f.name_en}
                </option>
              ))}
            </AdminSelect>
          </div>
        )}
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
