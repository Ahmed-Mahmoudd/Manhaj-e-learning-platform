import { apiRequest } from '@/api/client';
import type {
  CatalogueCourseResponse,
  CatalogueFilters,
  CatalogueListResponse,
  DropResponse,
  EnrolmentsResponse,
  EnrolResponse,
  SectionAvailability,
  SectionEligibility,
} from '@/types/catalogue';

function buildQuery(filters: CatalogueFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.department_id) params.set('department_id', String(filters.department_id));
  if (filters.faculty_id) params.set('faculty_id', String(filters.faculty_id));
  if (filters.term_id) params.set('term_id', String(filters.term_id));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function fetchCatalogueCourses(filters: CatalogueFilters = {}) {
  return apiRequest<CatalogueListResponse>(`/catalogue/courses${buildQuery(filters)}`);
}

export function fetchCatalogueCourse(courseId: number) {
  return apiRequest<CatalogueCourseResponse>(`/catalogue/courses/${courseId}`);
}

export function fetchSectionAvailability(sectionId: number) {
  return apiRequest<SectionAvailability>(`/catalogue/sections/${sectionId}/availability`);
}

export function fetchSectionEligibility(sectionId: number) {
  return apiRequest<SectionEligibility>(`/student/sections/${sectionId}/eligibility`);
}

export function fetchEnrolments() {
  return apiRequest<EnrolmentsResponse>('/student/enrolments');
}

export function enrolInSection(sectionId: number) {
  return apiRequest<EnrolResponse>(`/student/sections/${sectionId}/enrol`, { method: 'POST' });
}

export function dropEnrolment(enrolmentId: number) {
  return apiRequest<DropResponse>(`/student/enrolments/${enrolmentId}/drop`, { method: 'POST' });
}

export const catalogueKeys = {
  all: ['catalogue'] as const,
  list: (filters: CatalogueFilters) => [...catalogueKeys.all, 'list', filters] as const,
  course: (id: number) => [...catalogueKeys.all, 'course', id] as const,
  availability: (sectionId: number) =>
    [...catalogueKeys.all, 'availability', sectionId] as const,
};

export const enrolmentKeys = {
  all: ['enrolments'] as const,
  list: () => [...enrolmentKeys.all, 'list'] as const,
  eligibility: (sectionId: number) =>
    [...enrolmentKeys.all, 'eligibility', sectionId] as const,
};
