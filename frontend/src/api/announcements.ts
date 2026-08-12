import { apiRequest } from '@/api/client';
import type {
  AnnouncementsResponse,
  MarkAnnouncementReadResponse,
} from '@/types/announcements';

export function fetchAnnouncements() {
  return apiRequest<AnnouncementsResponse>('/student/announcements');
}

export function markAnnouncementRead(announcementId: number) {
  return apiRequest<MarkAnnouncementReadResponse>(
    `/student/announcements/${announcementId}/read`,
    { method: 'POST' },
  );
}

export const announcementKeys = {
  all: ['announcements'] as const,
  list: () => [...announcementKeys.all, 'list'] as const,
};
