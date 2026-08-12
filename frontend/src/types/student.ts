export interface TermInfo {
  id: number;
  name: string;
  type: string;
  starts_at: string | null;
  ends_at: string | null;
}

export interface LessonProgress {
  seconds_spent: number;
  progress_pct: number;
  completed_at: string | null;
  last_accessed?: string | null;
}

export type LessonType = 'video' | 'pdf' | 'text' | 'link' | 'download';

export interface LessonSummary {
  id: number;
  title: string;
  type: LessonType;
  body: string | null;
  url: string | null;
  file_path: string | null;
  order: number;
  duration_seconds: number | null;
  progress: LessonProgress | null;
}

export interface CourseModule {
  id: number;
  title: string;
  order: number;
  is_available: boolean;
  lessons: LessonSummary[];
}

export interface EnrolledCourse {
  enrolment_id: number;
  status: 'enrolled' | 'waitlisted';
  waitlist_position: number | null;
  enrolled_at: string | null;
  section: {
    id: number;
    section_number: string;
    capacity: number;
    enrolled_count: number;
    schedule: { day: string; time: string; room: string }[] | null;
    instructor: { id: number; name: string };
    term: TermInfo;
  };
  course: {
    id: number;
    code: string;
    title_en: string;
    title_ar: string | null;
    credit_hours: number;
  };
  completion_pct: number;
}

export interface MyCoursesResponse {
  courses: EnrolledCourse[];
}

export interface SectionLessonsResponse {
  modules: CourseModule[];
}

export interface UpdateProgressResponse {
  progress: {
    lesson_id: number;
    seconds_spent: number;
    progress_pct: number;
    completed_at: string | null;
  };
}
