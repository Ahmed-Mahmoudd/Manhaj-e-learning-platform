export interface InstructorTerm {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface InstructorSection {
  id: number;
  section_number: string;
  capacity: number;
  enrolled_count: number;
  waitlisted_count: number;
  schedule: { day: string; time: string; room: string }[] | null;
  is_active: boolean;
  course: {
    id: number;
    code: string;
    title_en: string;
    title_ar: string | null;
    credit_hours: number;
  };
  term: InstructorTerm;
}

export interface InstructorSectionsResponse {
  sections: InstructorSection[];
}

export interface SectionEnrolment {
  enrolment_id: number;
  status: 'enrolled' | 'waitlisted' | 'dropped' | 'completed';
  waitlist_position: number | null;
  enrolled_at: string | null;
  dropped_at: string | null;
  student: { id: number; name: string; email: string };
}

export interface SectionEnrolmentsResponse {
  section_id: number;
  enrolled_count: number;
  enrolments: SectionEnrolment[];
}

export interface InstructorGradeItem {
  id: number;
  name: string;
  type: string;
  max_score: number;
  weight: number | null;
  due_at: string | null;
  order: number;
  is_published: boolean;
  grades_count: number;
}

export interface SectionGradeItemsResponse {
  grade_items: InstructorGradeItem[];
}

export interface EnteredGrade {
  student: { id: number; name: string };
  score: number;
  score_pct: number;
  letter: string;
  feedback: string | null;
  is_published: boolean;
  graded_at: string | null;
}

export interface GradeItemGradesResponse {
  grade_item: { id: number; name: string; max_score: number };
  grades: EnteredGrade[];
}

export interface EnterGradeResponse {
  grade: {
    id: number;
    student_id: number;
    score: number;
    max_score: number;
    score_pct: number;
    letter: string;
    feedback: string | null;
    is_published: boolean;
    graded_at: string | null;
  };
}

export interface PublishGradeItemResponse {
  message: string;
  is_published: boolean;
  grades_updated: number;
}

export interface InstructorAnnouncement {
  id: number;
  title: string;
  body: string;
  type: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string | null;
  reads_count: number;
  author: { id: number; name: string } | null;
}

export interface SectionAnnouncementsResponse {
  announcements: InstructorAnnouncement[];
}
