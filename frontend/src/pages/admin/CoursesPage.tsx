import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminKeys,
  createCourse,
  deleteCourse,
  fetchAdminCourses,
  fetchDepartments,
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

export function CoursesPage() {
  const { t, locale } = useLocale();
  const [deptFilter, setDeptFilter] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);

  const deptsQuery = useQuery({
    queryKey: adminKeys.departments(),
    queryFn: () => fetchDepartments(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.courses(deptFilter || undefined),
    queryFn: () => fetchAdminCourses(deptFilter || undefined),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('adminCourses')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('adminCoursesSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : t('addNew')}
        </AdminButton>
      </header>

      <AdminSelect
        value={deptFilter}
        onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : '')}
        className="max-w-md"
      >
        <option value="">{t('allDepartments')}</option>
        {(deptsQuery.data?.departments ?? []).map((d) => (
          <option key={d.id} value={d.id}>
            {d.code} — {locale === 'ar' && d.name_ar ? d.name_ar : d.name_en}
          </option>
        ))}
      </AdminSelect>

      {showForm && (
        <CreateForm
          departments={deptsQuery.data?.departments ?? []}
          allCourses={data?.courses ?? []}
          onDone={() => setShowForm(false)}
        />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && (data?.courses.length ?? 0) === 0}
        emptyMessage={t('noCoursesAdmin')}
      >
        <AdminPanel>
          <AdminTable
            headers={[t('code'), t('titleEn'), t('creditHours'), t('navSections'), t('actions')]}
          >
            {(data?.courses ?? []).map((c) => {
              const displayTitle = locale === 'ar' && c.title_ar ? c.title_ar : c.title_en;
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono">{c.code}</td>
                  <td className="px-4 py-3">{displayTitle}</td>
                  <td className="px-4 py-3">{c.credit_hours}</td>
                  <td className="px-4 py-3 text-ink/60">{c.sections_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <DeleteCourseButton id={c.id} />
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        </AdminPanel>
      </AsyncPanel>
    </div>
  );
}

function DeleteCourseButton({ id }: { id: number }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [err, setErr] = useState<Error | null>(null);
  const mutation = useMutation({
    mutationFn: () => deleteCourse(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
    onError: (e: Error) => setErr(e),
  });

  return (
    <>
      <AdminButton
        variant="danger"
        onClick={() => {
          if (window.confirm(t('confirmDelete'))) mutation.mutate();
        }}
      >
        {t('delete')}
      </AdminButton>
      <FormError error={err} />
    </>
  );
}

function CreateForm({
  departments,
  allCourses,
  onDone,
}: {
  departments: { id: number; code: string; name_en: string }[];
  allCourses: { id: number; code: string }[];
  onDone: () => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? 0);
  const [code, setCode] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [credits, setCredits] = useState('3');
  const [prereqIds, setPrereqIds] = useState('');
  const [err, setErr] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createCourse({
        department_id: departmentId,
        code,
        title_en: titleEn,
        title_ar: titleAr || undefined,
        credit_hours: Number(credits),
        prerequisites: prereqIds
          ? prereqIds.split(',').map((s) => Number(s.trim())).filter(Boolean)
          : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      onDone();
    },
    onError: (e: Error) => setErr(e),
  });

  return (
    <AdminPanel className="space-y-3 p-5">
      <AdminSelect value={departmentId} onChange={(e) => setDepartmentId(Number(e.target.value))}>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.code}
          </option>
        ))}
      </AdminSelect>
      <div className="flex flex-wrap gap-3">
        <AdminInput placeholder={t('code')} value={code} onChange={(e) => setCode(e.target.value)} />
        <AdminInput placeholder={t('titleEn')} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
        <AdminInput placeholder={t('titleAr')} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
        <AdminInput type="number" min={1} max={12} value={credits} onChange={(e) => setCredits(e.target.value)} className="w-20" />
      </div>
      <AdminInput
        placeholder={t('prereqIdsHint')}
        value={prereqIds}
        onChange={(e) => setPrereqIds(e.target.value)}
      />
      <p className="text-xs text-ink/45">
        {t('availableCourseIds')}: {allCourses.map((c) => c.id).join(', ') || '—'}
      </p>
      <FormError error={err} />
      <AdminButton variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {t('create')}
      </AdminButton>
    </AdminPanel>
  );
}
