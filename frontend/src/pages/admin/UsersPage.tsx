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
import { useAuth } from '@/auth/AuthContext';
import { displayRole } from '@/auth/roles';
import type { AdminUser } from '@/types/admin';
import type { UserRole } from '@/types/api';

const ALL_ROLES: UserRole[] = ['university_admin', 'faculty_admin', 'instructor', 'teaching_assistant', 'student'];
const FACULTY_ROLES: UserRole[] = ['instructor', 'teaching_assistant', 'student'];

export function UsersPage() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const availableRoles = user?.role === 'faculty_admin' ? FACULTY_ROLES : ALL_ROLES;

  const { data, isLoading, error } = useQuery({
    queryKey: adminKeys.users(roleFilter, page),
    queryFn: () => fetchAdminUsers(roleFilter || undefined, page),
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('adminUsers')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('adminUsersSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSelect
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="min-w-[12rem]"
          >
            <option value="">{t('allRoles')}</option>
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {displayRole(r, locale)}
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
          onDone={() => setShowForm(false)}
          locale={locale}
          availableRoles={availableRoles}
        />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && users.length === 0}
        emptyMessage={t('noUsers')}
      >
        <AdminPanel>
          <AdminTable headers={[t('studentName'), t('email'), t('role'), t('actions')]}>
            {users.map((u) => (
              <UserRow key={u.id} user={u} locale={locale} availableRoles={availableRoles} />
            ))}
          </AdminTable>
        </AdminPanel>
        {data?.meta && (
          <div className="pt-2">
            <PaginationBar
              currentPage={data.meta.current_page}
              lastPage={data.meta.last_page}
              onPageChange={setPage}
            />
          </div>
        )}
      </AsyncPanel>
    </div>
  );
}

function UserRow({
  user,
  locale,
  availableRoles,
}: {
  user: AdminUser;
  locale: 'en' | 'ar';
  availableRoles: UserRole[];
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<UserRole>(user.role as UserRole);
  const [err, setErr] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: () => updateUserRole(user.id, role),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
    onError: (e: Error) => setErr(e),
  });

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  return (
    <tr className="hover:bg-amber-50/20 transition-colors">
      <td className="px-5 py-4 font-medium text-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800 text-xs shadow-xs">
            {initials || '👤'}
          </span>
          <span className="font-bold">{user.name}</span>
        </div>
      </td>
      <td className="px-5 py-4 font-mono text-xs text-slate-500">{user.email}</td>
      <td className="px-5 py-4">
        <AdminSelect value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="text-xs">
          {availableRoles.map((r) => (
            <option key={r} value={r}>
              {displayRole(r, locale)}
            </option>
          ))}
        </AdminSelect>
      </td>
      <td className="px-5 py-4">
        <AdminButton
          variant="ghost"
          disabled={role === user.role || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? t('saving') : t('save')}
        </AdminButton>
        <FormError error={err} />
      </td>
    </tr>
  );
}

function CreateForm({
  onDone,
  locale,
  availableRoles,
}: {
  onDone: () => void;
  locale: 'en' | 'ar';
  availableRoles: UserRole[];
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(availableRoles[0] ?? 'student');
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
    <div className="rounded-2xl border border-amber-500/30 bg-white p-6 shadow-md shadow-amber-500/5 space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900">{t('addNew')} {t('usersColumn')}</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('studentName')}</label>
          <AdminInput placeholder={t('studentName')} value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('email')}</label>
          <AdminInput placeholder={t('email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('role')}</label>
          <AdminSelect value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="w-full">
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {displayRole(r, locale)}
              </option>
            ))}
          </AdminSelect>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-600">{t('password')}</label>
          <AdminInput
            placeholder={t('password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <FormError error={err} />

      <div className="flex items-center gap-3 pt-2">
        <AdminButton
          variant="primary"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !canSubmit}
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
