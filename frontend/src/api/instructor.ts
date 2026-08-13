import { apiRequest } from '@/api/client';
import type { GradeItemType } from '@/types/grades';
import type { AnnouncementType } from '@/types/announcements';
import type {
  EnterGradeResponse,
  GradeItemGradesResponse,
  InstructorAnnouncement,
  InstructorGradeItem,
  InstructorSectionsResponse,
  PublishGradeItemResponse,
  SectionAnnouncementsResponse,
  SectionEnrolmentsResponse,
  SectionGradeItemsResponse,
} from '@/types/instructor';

export function fetchInstructorSections() {
  return apiRequest<InstructorSectionsResponse>('/instructor/sections');
}

export function fetchSectionEnrolments(sectionId: number) {
  return apiRequest<SectionEnrolmentsResponse>(`/instructor/sections/${sectionId}/enrolments`);
}

export function fetchSectionGradeItems(sectionId: number) {
  return apiRequest<SectionGradeItemsResponse>(`/instructor/sections/${sectionId}/grade-items`);
}

export function createGradeItem(
  sectionId: number,
  payload: {
    name: string;
    type: GradeItemType;
    max_score: number;
    weight?: number | null;
  },
) {
  return apiRequest<{ grade_item: InstructorGradeItem }>(
    `/instructor/sections/${sectionId}/grade-items`,
    { method: 'POST', body: payload },
  );
}

export function fetchGradeItemGrades(itemId: number) {
  return apiRequest<GradeItemGradesResponse>(`/instructor/grade-items/${itemId}/grades`);
}

export function enterStudentGrade(
  itemId: number,
  studentId: number,
  payload: { score: number; feedback?: string | null },
) {
  return apiRequest<EnterGradeResponse>(
    `/instructor/grade-items/${itemId}/grades/${studentId}`,
    { method: 'POST', body: payload },
  );
}

export function publishGradeItem(itemId: number) {
  return apiRequest<PublishGradeItemResponse>(`/instructor/grade-items/${itemId}/publish`, {
    method: 'POST',
  });
}

export function fetchSectionAnnouncements(sectionId: number) {
  return apiRequest<SectionAnnouncementsResponse>(
    `/instructor/sections/${sectionId}/announcements`,
  );
}

export function createSectionAnnouncement(
  sectionId: number,
  payload: {
    title: string;
    body: string;
    type: AnnouncementType;
    is_urgent?: boolean;
    publish_now?: boolean;
  },
) {
  return apiRequest<{ announcement: InstructorAnnouncement }>(
    `/instructor/sections/${sectionId}/announcements`,
    { method: 'POST', body: payload },
  );
}

export function publishAnnouncement(announcementId: number) {
  return apiRequest<{ announcement: InstructorAnnouncement }>(
    `/instructor/announcements/${announcementId}/publish`,
    { method: 'POST' },
  );
}

export const instructorKeys = {
  all: ['instructor'] as const,
  sections: () => [...instructorKeys.all, 'sections'] as const,
  enrolments: (sectionId: number) =>
    [...instructorKeys.all, 'sections', sectionId, 'enrolments'] as const,
  gradeItems: (sectionId: number) =>
    [...instructorKeys.all, 'sections', sectionId, 'grade-items'] as const,
  itemGrades: (itemId: number) =>
    [...instructorKeys.all, 'grade-items', itemId, 'grades'] as const,
  announcements: (sectionId: number) =>
    [...instructorKeys.all, 'sections', sectionId, 'announcements'] as const,
};
