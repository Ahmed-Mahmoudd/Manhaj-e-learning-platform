import type { CatalogueCourseSummary } from '@/types/catalogue';

export function courseTitle(
  course: Pick<CatalogueCourseSummary, 'title_en' | 'title_ar'>,
  locale: 'en' | 'ar',
): string {
  if (locale === 'ar' && course.title_ar) return course.title_ar;
  return course.title_en;
}
