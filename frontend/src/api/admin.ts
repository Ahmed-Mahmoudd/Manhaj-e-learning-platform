import { apiRequest } from "@/api/client";
import type {
    AcademicTerm,
    AdminCourse,
    AdminSection,
    AdminUser,
    Department,
    Faculty,
    PaginatedMeta,
    Programme,
} from "@/types/admin";

/* =========================
 * Dashboard
 * ========================= */

export type UniversityDashboardStats = {
    total_students: number;
    total_faculties: number;
    total_departments: number;
    total_programmes: number;
    total_enrolments: number;

    active_term: {
        id: number;
        name: string;
        starts_at: string;
        ends_at: string;
    } | null;

    faculty_summaries: {
        id: number;
        name_en: string;
        name_ar?: string | null;
        code: string;
        departments_count: number;
        programmes_count: number;
        courses_count: number;
        students_count: number;
    }[];
};

export type FacultyDashboardStats = {
    faculty: {
        id: number;
        name_en: string;
        name_ar?: string | null;
        code: string;
    };

    students_count: number;
    departments_count: number;
    programmes_count: number;
    courses_count: number;
    active_sections_count: number;
    enrolments_count: number;

    active_term: {
        id: number;
        name: string;
    } | null;
};

export function fetchAdminDashboard() {
    return apiRequest<{
        scope: "university" | "faculty";
        stats: UniversityDashboardStats | FacultyDashboardStats;
    }>("/admin/dashboard");
}

/* =========================
 * Faculties
 * ========================= */

export function fetchFaculties() {
    return apiRequest<{ faculties: Faculty[] }>("/admin/faculties");
}

export function createFaculty(payload: {
    name_en: string;
    name_ar?: string;
    code: string;
}) {
    return apiRequest<{ faculty: Faculty }>("/admin/faculties", {
        method: "POST",
        body: payload,
    });
}

export function updateFaculty(
    id: number,
    payload: Partial<{
        name_en: string;
        name_ar: string;
        code: string;
    }>,
) {
    return apiRequest<{ faculty: Faculty }>(`/admin/faculties/${id}`, {
        method: "PATCH",
        body: payload,
    });
}

export function deleteFaculty(id: number) {
    return apiRequest<{ message: string }>(`/admin/faculties/${id}`, {
        method: "DELETE",
    });
}

/* =========================
 * Departments
 * ========================= */

export function fetchDepartments(facultyId?: number) {
    const q = facultyId ? `?faculty_id=${facultyId}` : "";

    return apiRequest<{ departments: Department[] }>(`/admin/departments${q}`);
}

export function createDepartment(payload: {
    faculty_id: number;
    name_en: string;
    name_ar?: string;
    code: string;
}) {
    return apiRequest<{ department: Department }>("/admin/departments", {
        method: "POST",
        body: payload,
    });
}

export function updateDepartment(
    id: number,
    payload: Partial<{
        name_en: string;
        name_ar: string;
        code: string;
    }>,
) {
    return apiRequest<{ department: Department }>(`/admin/departments/${id}`, {
        method: "PATCH",
        body: payload,
    });
}

export function deleteDepartment(id: number) {
    return apiRequest<{ message: string }>(`/admin/departments/${id}`, {
        method: "DELETE",
    });
}

/* =========================
 * Programmes
 * ========================= */

export function fetchProgrammes(departmentId?: number) {
    const q = departmentId ? `?department_id=${departmentId}` : "";
    return apiRequest<{ programmes: Programme[] }>(`/admin/programmes${q}`);
}

export function createProgramme(payload: {
    department_id: number;
    code: string;
    name_en: string;
    name_ar?: string;
    grading_type: string;
    duration_years: number;
}) {
    return apiRequest<{ programme: Programme }>("/admin/programmes", {
        method: "POST",
        body: payload,
    });
}

export function updateProgramme(
    id: number,
    payload: Partial<{
        code: string;
        name_en: string;
        name_ar: string;
        grading_type: string;
        duration_years: number;
    }>,
) {
    return apiRequest<{ programme: Programme }>(`/admin/programmes/${id}`, {
        method: "PATCH",
        body: payload,
    });
}

export function deleteProgramme(id: number) {
    return apiRequest<{ message: string }>(`/admin/programmes/${id}`, {
        method: "DELETE",
    });
}

/* =========================
 * Terms
 * ========================= */

export function fetchTerms() {
    return apiRequest<{ terms: AcademicTerm[] }>("/admin/terms");
}

export function createTerm(payload: {
    name: string;
    type: string;
    starts_at: string;
    ends_at: string;
}) {
    return apiRequest<{ term: AcademicTerm }>("/admin/terms", {
        method: "POST",
        body: payload,
    });
}

export function activateTerm(id: number) {
    return apiRequest<{
        term: AcademicTerm;
        message: string;
    }>(`/admin/terms/${id}/activate`, {
        method: "POST",
    });
}

export function deactivateTerm(id: number) {
    return apiRequest<{
        term: AcademicTerm;
        message: string;
    }>(`/admin/terms/${id}/deactivate`, {
        method: "POST",
    });
}

/* =========================
 * Courses
 * ========================= */

export function fetchAdminCourses(departmentId?: number) {
    const q = departmentId ? `?department_id=${departmentId}` : "";

    return apiRequest<{ courses: AdminCourse[] }>(`/admin/courses${q}`);
}

export function createCourse(payload: {
    department_id: number;
    code: string;
    title_en: string;
    title_ar?: string;
    credit_hours: number;
    prerequisites?: number[];
}) {
    return apiRequest<{ course: AdminCourse }>("/admin/courses", {
        method: "POST",
        body: payload,
    });
}

export function updateCourse(
    id: number,
    payload: Partial<{
        code: string;
        title_en: string;
        title_ar: string;
        credit_hours: number;
        prerequisites: number[];
    }>,
) {
    return apiRequest<{ course: AdminCourse }>(`/admin/courses/${id}`, {
        method: "PATCH",
        body: payload,
    });
}

export function deleteCourse(id: number) {
    return apiRequest<{ message: string }>(`/admin/courses/${id}`, {
        method: "DELETE",
    });
}

/* =========================
 * Sections
 * ========================= */

export function fetchAdminSections(filters?: {
    course_id?: number;
    term_id?: number;
}) {
    const params = new URLSearchParams();

    if (filters?.course_id) {
        params.set("course_id", String(filters.course_id));
    }

    if (filters?.term_id) {
        params.set("term_id", String(filters.term_id));
    }

    const q = params.toString() ? `?${params}` : "";

    return apiRequest<{ sections: AdminSection[] }>(`/admin/sections${q}`);
}

export function createSection(payload: {
    course_id: number;
    academic_term_id: number;
    instructor_id: number;
    section_number: string;
    capacity: number;
    is_active?: boolean;
}) {
    return apiRequest<{ section: AdminSection }>("/admin/sections", {
        method: "POST",
        body: payload,
    });
}

export function deleteSection(id: number) {
    return apiRequest<{ message: string }>(`/admin/sections/${id}`, {
        method: "DELETE",
    });
}

/* =========================
 * Users
 * ========================= */

export function fetchAdminUsers(role?: string, page = 1) {
    const params = new URLSearchParams({
        page: String(page),
    });

    if (role) {
        params.set("role", role);
    }

    return apiRequest<{
        data: AdminUser[];
        meta: PaginatedMeta;
    }>(`/admin/users?${params}`);
}

export function createAdminUser(payload: {
    name: string;
    email: string;
    role: string;
    password?: string;
}) {
    return apiRequest<{ user: AdminUser }>("/admin/users", {
        method: "POST",
        body: payload,
    });
}

export function updateUserRole(userId: number, role: string) {
    return apiRequest<{
        user: AdminUser;
        message: string;
    }>(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: { role },
    });
}

/* =========================
 * React Query Keys
 * ========================= */

export const adminKeys = {
    all: ["admin"] as const,

    dashboard: () => [...adminKeys.all, "dashboard"] as const,

    faculties: () => [...adminKeys.all, "faculties"] as const,

    departments: (facultyId?: number) =>
        [...adminKeys.all, "departments", facultyId ?? "all"] as const,

    programmes: (departmentId?: number) =>
        [...adminKeys.all, "programmes", departmentId ?? "all"] as const,

    terms: () => [...adminKeys.all, "terms"] as const,

    courses: (departmentId?: number) =>
        [...adminKeys.all, "courses", departmentId ?? "all"] as const,

    sections: (courseId?: number, termId?: number) =>
        [
            ...adminKeys.all,
            "sections",
            courseId ?? "all",
            termId ?? "all",
        ] as const,

    users: (role: string, page: number) =>
        [...adminKeys.all, "users", role, page] as const,
};
