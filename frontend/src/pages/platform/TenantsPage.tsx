import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateTenant,
  createTenant,
  deactivateTenant,
  fetchTenantStats,
  fetchTenants,
  platformKeys,
} from '@/api/platform';
import { AsyncPanel } from '@/components/AsyncPanel';
import { PaginationBar } from '@/components/PaginationBar';
import { StatChip } from '@/components/StatChip';
import {
  AdminButton,
  AdminInput,
  AdminPanel,
  AdminTable,
  FormError,
  adminTableCell,
} from '@/components/admin/AdminUi';
import { useLocale } from '@/i18n/LocaleContext';
import type { PlatformTenant } from '@/types/platform';
import { apiErrorMessage } from '@/utils/apiError';

export function TenantsPage() {
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: platformKeys.tenants(page),
    queryFn: () => fetchTenants(page),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('platformTenants')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('platformTenantsSubtitle')}</p>
        </div>
        <AdminButton variant="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t('cancel') : t('addNew')}
        </AdminButton>
      </header>

      {showForm && <CreateForm onDone={() => setShowForm(false)} />}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && (data?.data.length ?? 0) === 0}
        emptyMessage={t('noTenants')}
      >
        <AdminPanel>
          <AdminTable
            headers={[
              t('tenantName'),
              t('subdomain'),
              t('usersColumn'),
              t('status'),
              t('actions'),
            ]}
          >
            {(data?.data ?? []).map((tenant) => (
              <TenantRow key={tenant.id} tenant={tenant} />
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

function TenantRow({ tenant }: { tenant: PlatformTenant }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [err, setErr] = useState<Error | null>(null);

  const statsQuery = useQuery({
    queryKey: platformKeys.tenantStats(tenant.id),
    queryFn: () => fetchTenantStats(tenant.id),
    enabled: expanded,
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      tenant.is_active ? deactivateTenant(tenant.id) : activateTenant(tenant.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: platformKeys.all }),
    onError: (e: Error) => setErr(e),
  });

  return (
    <>
      <tr>
        <td className={`${adminTableCell} font-medium text-ink`}>{tenant.name}</td>
        <td className={`${adminTableCell} font-mono text-sm`}>{tenant.subdomain}</td>
        <td className={`${adminTableCell} text-ink/60`}>{tenant.users_count ?? '—'}</td>
        <td className={adminTableCell}>
          {tenant.is_active ? (
            <StatChip variant="sage">{t('active')}</StatChip>
          ) : (
            <StatChip variant="brick">{t('inactive')}</StatChip>
          )}
        </td>
        <td className={adminTableCell}>
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="ghost" onClick={() => setExpanded((v) => !v)}>
              {expanded ? t('hideStats') : t('viewStats')}
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => toggleMutation.mutate()}>
              {tenant.is_active ? t('deactivate') : t('activate')}
            </AdminButton>
          </div>
          <FormError error={err} />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-paper/60">
          <td colSpan={5} className="px-4 py-3">
            {statsQuery.isLoading && (
              <p className="text-sm text-ink/50">{t('statsLoading')}</p>
            )}
            {statsQuery.error && (
              <p className="text-sm text-brick" role="alert">
                {apiErrorMessage(statsQuery.error, t('networkError'), t('statsLoadFailed'), t)}
              </p>
            )}
            {statsQuery.data && (
              <div className="flex flex-wrap gap-2">
                <StatChip>{t('statUsers', { count: statsQuery.data.users })}</StatChip>
                <StatChip>{t('statFaculties', { count: statsQuery.data.faculties })}</StatChip>
                <StatChip>{t('statCourses', { count: statsQuery.data.courses })}</StatChip>
                <StatChip>{t('statSections', { count: statsQuery.data.sections })}</StatChip>
                <StatChip>{t('statEnrolments', { count: statsQuery.data.enrolments })}</StatChip>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [err, setErr] = useState<Error | null>(null);

  const mutation = useMutation({
    mutationFn: () => createTenant({ name, subdomain }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: platformKeys.all });
      onDone();
    },
    onError: (e: Error) => setErr(e),
  });

  return (
    <AdminPanel className="space-y-3 p-5">
      <AdminInput placeholder={t('tenantName')} value={name} onChange={(e) => setName(e.target.value)} />
      <AdminInput
        placeholder={t('subdomain')}
        value={subdomain}
        onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
      />
      <FormError error={err} />
      <AdminButton variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {t('create')}
      </AdminButton>
    </AdminPanel>
  );
}
