import { apiRequest } from '@/api/client';
import type {
  MyCoursesResponse,
  SectionLessonsResponse,
  UpdateProgressResponse,
} from '@/types/student';

export function fetchMyCourses() {
  return apiRequest<MyCoursesResponse>('/student/courses');
}

export function fetchSectionLessons(sectionId: number) {
  return apiRequest<SectionLessonsResponse>(`/student/sections/${sectionId}/lessons`);
}

export function updateLessonProgress(
  lessonId: number,
  payload: { seconds_spent?: number; progress_pct?: number },
) {
  return apiRequest<UpdateProgressResponse>(`/student/lessons/${lessonId}/progress`, {
    method: 'POST',
    body: payload,
  });
}

export function resetLessonProgress(lessonId: number) {
  return apiRequest<UpdateProgressResponse>(`/student/lessons/${lessonId}/progress/reset`, {
    method: 'POST',
  });
}

export const studentKeys = {
  all: ['student'] as const,
  courses: () => [...studentKeys.all, 'courses'] as const,
  sectionLessons: (sectionId: number) =>
    [...studentKeys.all, 'sections', sectionId, 'lessons'] as const,
};
