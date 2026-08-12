import { AuthUser, UserRole } from '@/types/api';

/** Default landing path after login per role */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'platform_admin':
      return '/platform';
    case 'university_admin':
    case 'faculty_admin':
      return '/admin';
    case 'instructor':
    case 'teaching_assistant':
      return '/instructor';
    case 'student':
      return '/student';
    default:
      return '/';
  }
}

/** Roles allowed to access a route prefix */
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/student': ['student'],
  '/instructor': ['instructor', 'teaching_assistant'],
  '/admin': ['university_admin', 'faculty_admin'],
  '/platform': ['platform_admin'],
};

export function roleCanAccess(role: UserRole, pathPrefix: string): boolean {
  const allowed = ROUTE_ROLES[pathPrefix];
  if (!allowed) return false;
  if (role === 'platform_admin') return true;
  return allowed.includes(role);
}

export function displayRole(role: UserRole, locale: 'en' | 'ar'): string {
  const labels: Record<UserRole, { en: string; ar: string }> = {
    platform_admin: { en: 'Platform Admin', ar: 'مدير المنصة' },
    university_admin: { en: 'University Admin', ar: 'مدير الجامعة' },
    faculty_admin: { en: 'Faculty Admin', ar: 'مدير الكلية' },
    instructor: { en: 'Instructor', ar: 'عضو هيئة التدريس' },
    teaching_assistant: { en: 'Teaching Assistant', ar: 'معيد' },
    student: { en: 'Student', ar: 'طالب' },
    guest: { en: 'Guest', ar: 'زائر' },
  };
  return labels[role][locale];
}

export type { AuthUser };
