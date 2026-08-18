import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminKeys,
  createSection,
  deleteSection,
  fetchAdminCourses,
  fetchAdminSections,
  fetchAdminUsers,
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
import { trimRequired } from '@/utils/formText';

export function SectionsPage() {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.sections(),
    queryFn: () => fetchAdminSections(),
  });

  const sections = data?.sections ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('adminSections')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('adminSectionsSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : `+ ${t('addNew')}`}
        </AdminButton>
      </header>

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && sections.length === 0}
        emptyMessage={t('noSectionsAdmin')}
      >
        <AdminPanel>
          <AdminTable
            headers={[
              t('course'),
              t('section'),
              t('termName'),
              t('instructorLabel'),
              t('capacity'),
              t('status'),
              t('actions'),
            ]}
          >
            {sections.map((s) => (
              <SectionRow key={s.id} section={s} />
            ))}
          </AdminTable>
        </AdminPanel>
      </AsyncPanel>
    </div>
  );
}

function SectionRow({
  section,
}: {
  section: {
    id: number;
    section_number: string;
    capacity: number;
    is_active: boolean;
    course: { code: string } | null;
    term: { name: string } | null;
    instructor: { name: string } | null;
  };
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [err, setErr] = useState<Error | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteSection(section.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
    onError: (e: Error) => setErr(e),
  });

  return (
    <tr className="hover:bg-amber-50/20 transition-colors">
      <td className="px-5 py-4">
        <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-xs">
          {section.course?.code ?? '—'}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className="font-mono text-xs font-semibold rounded bg-slate-100 px-2 py-0.5 text-slate-700">
          §{section.section_number}
        </span>
      </td>
      <td className="px-5 py-4 font-medium text-slate-700">{section.term?.name ?? '—'}</td>
      <td className="px-5 py-4 font-semibold text-slate-900">{section.instructor?.name ?? '—'}</td>
      <td className="px-5 py-4 font-mono font-bold text-slate-700">{section.capacity}</td>
      <td className="px-5 py-4">
        {section.is_active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t('active')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            {t('inactive')}
          </span>
        )}
      </td>
      <td className="px-5 py-4">
        <AdminButton
          variant="danger"
          disabled={deleteMutation.isPending}
          onClick={() => {
            if (window.confirm(t('confirmDelete'))) deleteMutation.mutate();
          }}
        >
          🗑️ {t('delete')}
        </AdminButton>
        <FormError error={err} />
      </td>
    </tr>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const coursesQuery = useQuery({ queryKey: adminKeys.courses(), queryFn: () => fetchAdminCourses() });
  const termsQuery = useQuery({ queryKey: adminKeys.terms(), queryFn: fetchTerms });
  const instructorsQuery = useQuery({
    queryKey: adminKeys.users('instructor', 1),
    queryFn: () => fetchAdminUsers('instructor', 1),
  });

  const [courseId, setCourseId] = useState(0);
  const [termId, setTermId] = useState(0);
  const [instructorId, setInstructorId] = useState(0);
  const [sectionNumber, setSectionNumber] = useState('01');
  const [capacity, setCapacity] = useState('40');
  const [err, setErr] = useState<Error | null>(null);

  const courses = coursesQuery.data?.courses ?? [];
  const terms = termsQuery.data?.terms ?? [];
  const instructors = instructorsQuery.data?.data ?? [];
  const canCreate = courses.length > 0 && terms.length > 0 && instructors.length > 0;

  const mutation = useMutation({
    mutationFn: () => {
      if (!canCreate) throw new Error(t('formRequiredFields'));
      if (!trimRequired(sectionNumber)) throw new Error(t('formRequiredFields'));
      const cap = Number(capacity);
      if (!Number.isFinite(cap) || cap < 1) throw new Error(t('formRequiredFields'));
      const resolvedCourseId = courseId || courses[0]?.id;
      const resolvedTermId = termId || terms[0]?.id;
      const resolvedInstructorId = instructorId || instructors[0]?.id;
      if (!resolvedCourseId || !resolvedTermId || !resolvedInstructorId) {
        throw new Error(t('formRequiredFields'));
      }
      return createSection({
        course_id: resolvedCourseId,
        academic_term_id: resolvedTermId,
        instructor_id: resolvedInstructorId,
        section_number: sectionNumber.trim(),
        capacity: cap,
        is_active: true,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      onDone();
    },
    onError: (e: Error) => setErr(e),
  });

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-white p-6 shadow-md shadow-amber-500/5 space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900">{t('addSection')}</h2>
      </div>

      {!canCreate && (
        <p className="text-xs text-slate-500">
          {courses.length === 0
            ? t('formNoCoursesAvailable')
            : terms.length === 0
              ? t('formNoTermsAvailable')
              : t('formNoInstructorsAvailable')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('course')}</label>
          <AdminSelect value={courseId || courses[0]?.id} onChange={(e) => setCourseId(Number(e.target.value))} className="w-full">
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('termName')}</label>
          <AdminSelect value={termId || terms[0]?.id} onChange={(e) => setTermId(Number(e.target.value))} className="w-full">
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('instructorLabel')}</label>
          <AdminSelect
            value={instructorId || instructors[0]?.id}
            onChange={(e) => setInstructorId(Number(e.target.value))}
            className="w-full"
          >
            {instructors.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('sectionNumber')}</label>
          <AdminInput
            placeholder={t('sectionNumber')}
            value={sectionNumber}
            onChange={(e) => setSectionNumber(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('capacity')}</label>
          <AdminInput
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <FormError error={err} />

      <div className="flex items-center gap-3 pt-2">
        <AdminButton
          variant="primary"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !canCreate}
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
