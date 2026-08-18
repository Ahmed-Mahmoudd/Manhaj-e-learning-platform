import { apiRequest } from '@/api/client';
import type {
  DashboardSummaryResponse,
  MyCoursesResponse,
  RecommendationsResponse,
  SectionLessonsResponse,
  UpdateProgressResponse,
} from '@/types/student';
import type { MyGradesResponse } from '@/types/grades';

export function fetchStudentDashboardSummary() {
  return apiRequest<DashboardSummaryResponse>('/student/dashboard/summary');
}

export function fetchStudentRecommendations() {
  return apiRequest<RecommendationsResponse>('/student/recommendations');
}

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

export function fetchMyGrades() {
  return apiRequest<MyGradesResponse>('/student/grades');
}

export const studentKeys = {
  all: ['student'] as const,
  summary: () => [...studentKeys.all, 'summary'] as const,
  recommendations: () => [...studentKeys.all, 'recommendations'] as const,
  courses: () => [...studentKeys.all, 'courses'] as const,
  grades: () => [...studentKeys.all, 'grades'] as const,
  sectionLessons: (sectionId: number) =>
    [...studentKeys.all, 'sections', sectionId, 'lessons'] as const,
};

