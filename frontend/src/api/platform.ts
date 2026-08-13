import { apiRequest } from '@/api/client';
import type { PlatformTenant, PlatformTenantsResponse, TenantStats } from '@/types/platform';

export function fetchTenants(page = 1, isActive?: boolean) {
  const params = new URLSearchParams({ page: String(page) });
  if (isActive != null) params.set('is_active', isActive ? '1' : '0');
  return apiRequest<PlatformTenantsResponse>(`/platform/tenants?${params}`, {
    tenantId: null,
  });
}

export function createTenant(payload: {
  name: string;
  subdomain: string;
  locale?: string;
  timezone?: string;
}) {
  return apiRequest<{ tenant: PlatformTenant }>('/platform/tenants', {
    method: 'POST',
    body: payload,
    tenantId: null,
  });
}

export function activateTenant(id: number) {
  return apiRequest<{ tenant: PlatformTenant; message: string }>(
    `/platform/tenants/${id}/activate`,
    { method: 'POST', tenantId: null },
  );
}

export function deactivateTenant(id: number) {
  return apiRequest<{ tenant: PlatformTenant; message: string }>(
    `/platform/tenants/${id}/deactivate`,
    { method: 'POST', tenantId: null },
  );
}

export function fetchTenantStats(id: number) {
  return apiRequest<TenantStats>(`/platform/tenants/${id}/stats`, { tenantId: null });
}

export const platformKeys = {
  all: ['platform'] as const,
  tenants: (page: number, active?: boolean) =>
    [...platformKeys.all, 'tenants', page, active ?? 'all'] as const,
  tenantStats: (id: number) => [...platformKeys.all, 'tenants', id, 'stats'] as const,
};
