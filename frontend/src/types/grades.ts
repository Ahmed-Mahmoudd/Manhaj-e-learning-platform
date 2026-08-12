export type GradeItemType =
  | 'assignment'
  | 'quiz'
  | 'midterm'
  | 'final'
  | 'project'
  | 'lab'
  | 'attendance';

export interface SectionGradeSummary {
  percentage: number | null;
  letter: string | null;
  items_graded: number;
}

export interface GradeItemScore {
  grade_item: {
    id: number;
    name: string;
    type: GradeItemType;
    max_score: number;
    weight: number | null;
  };
  score: number;
  score_pct: number;
  letter: string;
  feedback: string | null;
  graded_at: string | null;
}

export interface SectionGrades {
  section: {
    id: number;
    section_number: string;
    course: {
      code: string;
      title_en: string;
    };
    term: {
      name: string;
    };
  };
  overall: SectionGradeSummary;
  items: GradeItemScore[];
}

export interface MyGradesResponse {
  grades: SectionGrades[];
}
