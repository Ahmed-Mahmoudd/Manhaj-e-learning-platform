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

  const courses = data?.courses ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('adminCourses')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('adminCoursesSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSelect
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : '')}
            className="min-w-[16rem]"
          >
            <option value="">{t('allDepartments')}</option>
            {(deptsQuery.data?.departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {locale === 'ar' && d.name_ar ? d.name_ar : d.name_en}
              </option>
            ))}
          </AdminSelect>
          <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? t('cancel') : `+ ${t('addNew')}`}
          </AdminButton>
        </div>
      </header>

      {showForm && (
        <CreateForm
          departments={deptsQuery.data?.departments ?? []}
          allCourses={courses}
          onDone={() => setShowForm(false)}
        />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && courses.length === 0}
        emptyMessage={t('noCoursesAdmin')}
      >
        <AdminPanel>
          <AdminTable
            headers={[t('code'), t('titleEn'), t('creditHours'), t('navSections'), t('actions')]}
          >
            {courses.map((c) => {
              const displayTitle = locale === 'ar' && c.title_ar ? c.title_ar : c.title_en;
              return (
                <tr key={c.id} className="hover:bg-amber-50/20 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-xs">
                      {c.code}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{displayTitle}</p>
                    {locale === 'en' && c.title_ar && (
                      <p className="text-xs text-slate-400">{c.title_ar}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                      {c.credit_hours} {t('creditHours')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200/60">
                      {c.sections_count ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-4">
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
        disabled={mutation.isPending}
        onClick={() => {
          if (window.confirm(t('confirmDelete'))) mutation.mutate();
        }}
      >
        🗑️ {t('delete')}
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
    <div className="rounded-2xl border border-amber-500/30 bg-white p-6 shadow-md shadow-amber-500/5 space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900">{t('addCourse')}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('department')}</label>
          <AdminSelect value={departmentId} onChange={(e) => setDepartmentId(Number(e.target.value))} className="w-full">
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('code')}</label>
          <AdminInput placeholder={t('code')} value={code} onChange={(e) => setCode(e.target.value)} className="w-full" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('titleEn')}</label>
          <AdminInput placeholder={t('titleEn')} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="w-full" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('titleAr')}</label>
          <AdminInput placeholder={t('titleAr')} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="w-full" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('creditHours')}</label>
          <AdminInput type="number" min={1} max={12} value={credits} onChange={(e) => setCredits(e.target.value)} className="w-full" />
        </div>

        <div className="space-y-1 lg:col-span-3">
          <label className="block text-xs font-semibold text-slate-600">{t('prereqIdsHint')}</label>
          <AdminInput
            placeholder={t('prereqIdsHint')}
            value={prereqIds}
            onChange={(e) => setPrereqIds(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-slate-400">
            {t('availableCourseIds')}: {allCourses.map((c) => c.id).join(', ') || '—'}
          </p>
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
