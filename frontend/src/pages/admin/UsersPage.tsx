import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminKeys, createAdminUser, fetchAdminUsers, updateUserRole } from '@/api/admin';
import { AsyncPanel } from '@/components/AsyncPanel';
import { PaginationBar } from '@/components/PaginationBar';
import {
  AdminButton,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTable,
  FormError,
} from '@/components/admin/AdminUi';
import { useLocale } from '@/i18n/LocaleContext';
import { displayRole } from '@/auth/roles';
import type { AdminUser } from '@/types/admin';
import type { UserRole } from '@/types/api';

const ROLES: UserRole[] = ['university_admin', 'faculty_admin', 'instructor', 'teaching_assistant', 'student'];
const MANAGEABLE: UserRole[] = ['instructor', 'teaching_assistant', 'student', 'university_admin', 'faculty_admin'];

export function UsersPage() {
  const { t, locale } = useLocale();
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.users(roleFilter, page),
    queryFn: () => fetchAdminUsers(roleFilter || undefined, page),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('adminUsers')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('adminUsersSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : t('addNew')}
        </AdminButton>
      </header>

      <AdminSelect
        value={roleFilter}
        onChange={(e) => {
          setRoleFilter(e.target.value);
          setPage(1);
        }}
        className="max-w-xs"
      >
        <option value="">{t('allRoles')}</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {displayRole(r, locale)}
          </option>
        ))}
      </AdminSelect>

      {showForm && <CreateForm onDone={() => setShowForm(false)} locale={locale} />}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && (data?.data.length ?? 0) === 0}
        emptyMessage={t('noUsers')}
      >
        <AdminPanel>
          <AdminTable headers={[t('studentName'), t('email'), t('role'), t('actions')]}>
            {(data?.data ?? []).map((u) => (
              <UserRow key={u.id} user={u} locale={locale} />
            ))}
          </AdminTable>
        </AdminPanel>
        {data?.meta && (
          <PaginationBar
            currentPage={data.meta.current_page}
            lastPage={data.meta.last_page}
            onPageChange={setPage}
          />
        )}
      </AsyncPanel>
    </div>
  );
}

function UserRow({ user, locale }: { user: AdminUser; locale: 'en' | 'ar' }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<UserRole>(user.role as UserRole);
  const [err, setErr] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: () => updateUserRole(user.id, role),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
    onError: (e: Error) => setErr(e),
  });

  return (
    <tr>
      <td className="px-4 py-3 font-medium">{user.name}</td>
      <td className="px-4 py-3 font-mono text-xs text-ink/60">{user.email}</td>
      <td className="px-4 py-3">
        <AdminSelect value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="text-sm">
          {MANAGEABLE.map((r) => (
            <option key={r} value={r}>
              {displayRole(r, locale)}
            </option>
          ))}
        </AdminSelect>
      </td>
      <td className="px-4 py-3">
        <AdminButton
          variant="ghost"
          disabled={role === user.role || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {t('save')}
        </AdminButton>
        <FormError error={err} />
      </td>
    </tr>
  );
}

function CreateForm({ onDone, locale }: { onDone: () => void; locale: 'en' | 'ar' }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<Error | null>(null);

  const canSubmit = name.trim() && email.trim() && password.length >= 8;

  const mutation = useMutation({
    mutationFn: () => createAdminUser({ name, email, role, password }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      onDone();
    },
    onError: (e: Error) => setErr(e),
  });

  return (
    <AdminPanel className="space-y-3 p-5">
      <div className="flex flex-wrap gap-3">
        <AdminInput placeholder={t('studentName')} value={name} onChange={(e) => setName(e.target.value)} />
        <AdminInput placeholder={t('email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <AdminSelect value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          {MANAGEABLE.map((r) => (
            <option key={r} value={r}>
              {displayRole(r, locale)}
            </option>
          ))}
        </AdminSelect>
        <AdminInput
          placeholder={t('password')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <FormError error={err} />
      <AdminButton
        variant="primary"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !canSubmit}
      >
        {t('create')}
      </AdminButton>
    </AdminPanel>
  );
}
