export type AnnouncementType = 'general' | 'assignment' | 'exam';

export interface AnnouncementSummary {
  id: number;
  title: string;
  body: string;
  type: AnnouncementType;
  is_urgent: boolean;
  is_read: boolean;
  published_at: string | null;
  author: { id: number; name: string };
  section: { id: number; course_code: string };
}

export interface AnnouncementsResponse {
  unread_count: number;
  announcements: AnnouncementSummary[];
}

export interface MarkAnnouncementReadResponse {
  message: string;
  announcement_id: number;
  unread_count: number;
}
