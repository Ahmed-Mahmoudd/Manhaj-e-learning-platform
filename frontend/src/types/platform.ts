export interface PlatformTenant {
  id: number;
  name: string;
  subdomain: string;
  locale: string | null;
  timezone: string | null;
  grading_system: string | null;
  is_active: boolean;
  users_count: number | null;
  created_at: string | null;
}

export interface TenantStats {
  tenant_id: number;
  name: string;
  users: number;
  faculties: number;
  departments: number;
  courses: number;
  sections: number;
  enrolments: number;
}

export interface PlatformTenantsResponse {
  data: PlatformTenant[];
  meta: PaginatedMeta;
}

export interface PaginatedMeta {
  total: number;
  current_page: number;
  last_page: number;
}
