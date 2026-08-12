export interface PaginatedMeta {
  total: number;
  current_page: number;
  last_page: number;
}

export interface CatalogueDepartment {
  id: number;
  name_en: string;
  faculty: { id: number; name_en: string } | null;
}

export interface CatalogueCourseSummary {
  id: number;
  code: string;
  title_en: string;
  title_ar: string | null;
  credit_hours: number;
  description: string | null;
  active_sections: number | null;
  department: CatalogueDepartment | null;
}

export interface CataloguePrerequisite {
  id: number;
  code: string;
  title_en: string;
}

export interface CatalogueSection {
  id: number;
  section_number: string;
  capacity: number;
  enrolled: number;
  term: { id: number; name: string } | null;
  instructor: { id: number; name: string } | null;
}

export interface CatalogueCourseDetail extends CatalogueCourseSummary {
  prerequisites: CataloguePrerequisite[];
  sections: CatalogueSection[];
}

export interface CatalogueListResponse {
  data: CatalogueCourseSummary[];
  meta: PaginatedMeta;
}

export interface CatalogueCourseResponse {
  course: CatalogueCourseDetail;
}

export interface SectionAvailability {
  section_id: number;
  section_number: string;
  capacity: number;
  enrolled: number;
  waitlisted: number;
  available_seats: number;
  is_full: boolean;
}

export interface MissingPrerequisite {
  code: string;
  title: string;
}

export interface SectionEligibility {
  can_enrol: boolean;
  would_be_waitlisted: boolean;
  reason: string | null;
  missing_prerequisites: MissingPrerequisite[];
  section: {
    id: number;
    section_number: string;
    capacity: number;
    enrolled_count: number;
    seats_remaining: number;
  };
}

export interface StudentEnrolment {
  id: number;
  status: string;
  waitlist_position: number | null;
  enrolled_at: string | null;
  dropped_at: string | null;
  section: {
    id: number;
    section_number: string;
    course_code: string;
    course_title: string;
    term: string;
  };
}

export interface EnrolmentsResponse {
  enrolments: StudentEnrolment[];
}

export interface EnrolResponse {
  message: string;
  enrolment: {
    id: number;
    status: string;
    waitlist_position: number | null;
    enrolled_at: string | null;
    section_id: number;
    course_code: string;
  };
}

export interface DropResponse {
  message: string;
}

export interface CatalogueFilters {
  search?: string;
  page?: number;
  department_id?: number;
  faculty_id?: number;
  term_id?: number;
}
