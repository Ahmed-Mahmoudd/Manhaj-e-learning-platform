import type { CourseModule } from '@/types/student';

/** Average lesson progress % across all published lessons in a section. */
export function completionPctFromModules(modules: CourseModule[]): number {
  const lessons = modules.flatMap((mod) => mod.lessons);
  if (lessons.length === 0) return 0;
  const total = lessons.reduce((sum, lesson) => sum + (lesson.progress?.progress_pct ?? 0), 0);
  return Math.round(total / lessons.length);
}
