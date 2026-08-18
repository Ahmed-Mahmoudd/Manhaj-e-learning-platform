export interface Faculty {
    id: number;
    name_en: string;
    name_ar: string | null;
    code: string;
    is_active: boolean;
    departments_count?: number;
}

export interface Department {
    id: number;
    faculty_id: number;
    name_en: string;
    name_ar: string | null;
    code: string;
    faculty?: {
        id: number;
        name_en: string;
        code: string;
    };
}

export interface AcademicTerm {
    id: number;
    name: string;
    type: string;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    sections_count?: number;
}

export interface AdminCourse {
    id: number;
    department_id: number;
    code: string;
    title_en: string;
    title_ar: string | null;
    credit_hours: number;
    description?: string | null;
    sections_count?: number;
    department?: {
        id: number;
        name_en: string;
        code: string;
    };
    prerequisites?: {
        id: number;
        code: string;
    }[];
}

export interface AdminSection {
    id: number;
    section_number: string;
    capacity: number;
    is_active: boolean;
    course: {
        id: number;
        code: string;
    } | null;
    term: {
        id: number;
        name: string;
    } | null;
    instructor: {
        id: number;
        name: string;
    } | null;
}

export interface Programme {
    id: number;
    department_id: number;
    code: string;
    name_en: string;
    name_ar: string | null;
    grading_type: string;
    duration_years: number;
    department?: {
        id: number;
        code: string;
        name_en: string;
    };
}

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
    faculty_id?: number | null;
    tenant_id: number | null;
    created_at: string | null;
}

export interface PaginatedMeta {
    total: number;
    current_page: number;
    last_page: number;
}
