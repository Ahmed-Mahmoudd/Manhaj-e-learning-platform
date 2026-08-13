export function courseTitle(
  course: { title_en: string; title_ar?: string | null },
  locale: 'en' | 'ar',
): string {
  if (locale === 'ar' && course.title_ar) return course.title_ar;
  return course.title_en;
}
