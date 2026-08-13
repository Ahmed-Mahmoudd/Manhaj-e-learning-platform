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
import { trimRequired } from '@/utils/formText';

export function SectionsPage() {
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.sections(),
    queryFn: () => fetchAdminSections(),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('adminSections')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('adminSectionsSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : t('addNew')}
        </AdminButton>
      </header>

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && (data?.sections.length ?? 0) === 0}
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
            {(data?.sections ?? []).map((s) => (
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
    <tr>
      <td className="px-4 py-3 font-mono">{section.course?.code ?? '—'}</td>
      <td className="px-4 py-3">§{section.section_number}</td>
      <td className="px-4 py-3 text-ink/60">{section.term?.name ?? '—'}</td>
      <td className="px-4 py-3">{section.instructor?.name ?? '—'}</td>
      <td className="px-4 py-3">{section.capacity}</td>
      <td className="px-4 py-3">
        {section.is_active ? (
          <StatChip variant="sage">{t('active')}</StatChip>
        ) : (
          <StatChip>{t('inactive')}</StatChip>
        )}
      </td>
      <td className="px-4 py-3">
        <AdminButton
          variant="danger"
          onClick={() => {
            if (window.confirm(t('confirmDelete'))) deleteMutation.mutate();
          }}
        >
          {t('delete')}
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
    <AdminPanel className="space-y-3 p-5">
      {!canCreate && (
        <p className="text-sm text-ink/60">
          {courses.length === 0
            ? t('formNoCoursesAvailable')
            : terms.length === 0
              ? t('formNoTermsAvailable')
              : t('formNoInstructorsAvailable')}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminSelect value={courseId || courses[0]?.id} onChange={(e) => setCourseId(Number(e.target.value))}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect value={termId || terms[0]?.id} onChange={(e) => setTermId(Number(e.target.value))}>
          {terms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect
          value={instructorId || instructors[0]?.id}
          onChange={(e) => setInstructorId(Number(e.target.value))}
        >
          {instructors.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </AdminSelect>
      </div>
      <div className="flex flex-wrap gap-3">
        <AdminInput
          placeholder={t('sectionNumber')}
          value={sectionNumber}
          onChange={(e) => setSectionNumber(e.target.value)}
          className="w-24"
        />
        <AdminInput
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-24"
        />
      </div>
      <FormError error={err} />
      <AdminButton
        variant="primary"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !canCreate}
      >
        {t('create')}
      </AdminButton>
    </AdminPanel>
  );
}
