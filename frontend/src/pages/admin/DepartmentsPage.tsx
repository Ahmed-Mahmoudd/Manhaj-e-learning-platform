import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const { t } = useLocale();
  const [facultyFilter, setFacultyFilter] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);

  const facultiesQuery = useQuery({
    queryKey: adminKeys.faculties(),
    queryFn: fetchFaculties,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.departments(facultyFilter || undefined),
    queryFn: () => fetchDepartments(facultyFilter || undefined),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('adminDepartments')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('adminDepartmentsSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : t('addNew')}
        </AdminButton>
      </header>

      <AdminSelect
        value={facultyFilter}
        onChange={(e) => setFacultyFilter(e.target.value ? Number(e.target.value) : '')}
        className="max-w-xs"
      >
        <option value="">{t('allFaculties')}</option>
        {(facultiesQuery.data?.faculties ?? []).map((f) => (
          <option key={f.id} value={f.id}>
            {f.code} — {f.name_en}
          </option>
        ))}
      </AdminSelect>

      {showForm && (
        <CreateForm
          faculties={facultiesQuery.data?.faculties ?? []}
          onDone={() => setShowForm(false)}
        />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && (data?.departments.length ?? 0) === 0}
        emptyMessage={t('noDepartments')}
      >
        <AdminPanel>
          <AdminTable
            headers={[t('code'), t('nameEn'), t('faculty'), t('actions')]}
          >
            {(data?.departments ?? []).map((d) => (
              <DeptRow key={d.id} dept={d} />
            ))}
          </AdminTable>
        </AdminPanel>
      </AsyncPanel>
    </div>
  );
}

function DeptRow({ dept }: { dept: Department }) {
  const { t } = useLocale();
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
      <tr>
        <td className={adminTableCell}>
          <AdminInput value={code} onChange={(e) => setCode(e.target.value)} className="w-full" />
        </td>
        <td className={adminTableCell}>
          <AdminInput value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="w-full" />
        </td>
        <td className={`${adminTableCell} text-ink/60`}>{dept.faculty?.code ?? '—'}</td>
        <td className={adminTableCell}>
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

  return (
    <tr>
      <td className={`${adminTableCell} font-mono`}>{dept.code}</td>
      <td className={adminTableCell}>{dept.name_en}</td>
      <td className={`${adminTableCell} text-ink/60`}>{dept.faculty?.code ?? '—'}</td>
      <td className={adminTableCell}>
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="ghost" onClick={() => setEditing(true)}>
            {t('edit')}
          </AdminButton>
          <AdminButton
            variant="danger"
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

function CreateForm({
  faculties,
  onDone,
}: {
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
        faculty_id: facultyId,
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
    <AdminPanel className="space-y-3 p-5">
      <AdminSelect value={facultyId} onChange={(e) => setFacultyId(Number(e.target.value))}>
        {faculties.map((f) => (
          <option key={f.id} value={f.id}>
            {f.code}
          </option>
        ))}
      </AdminSelect>
      <div className="flex flex-wrap gap-3">
        <AdminInput placeholder={t('code')} value={code} onChange={(e) => setCode(e.target.value)} />
        <AdminInput placeholder={t('nameEn')} value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        <AdminInput placeholder={t('nameAr')} value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
      </div>
      <FormError error={err} />
      <AdminButton variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {t('create')}
      </AdminButton>
    </AdminPanel>
  );
}
