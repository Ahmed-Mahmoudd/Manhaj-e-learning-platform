import { Navigate, Route, Routes } from "react-router-dom";
import { homePathForRole } from "@/auth/roles";
import { useAuth } from "@/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";

import { StudentShell } from "@/components/StudentShell";
import { InstructorShell } from "@/components/InstructorShell";
import { AdminShell } from "@/components/admin/AdminShell";
import { PlatformShell } from "@/components/platform/PlatformShell";

import { LoginPage } from "@/pages/LoginPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";

import { LessonViewerPage } from "@/pages/student/LessonViewerPage";
import { MyCoursesPage } from "@/pages/student/MyCoursesPage";
import { CataloguePage } from "@/pages/student/CataloguePage";
import { CourseDetailPage } from "@/pages/student/CourseDetailPage";
import { SectionLessonsPage } from "@/pages/student/SectionLessonsPage";
import { GradesPage } from "@/pages/student/GradesPage";
import { AnnouncementsPage } from "@/pages/student/AnnouncementsPage";
import { DiscussSectionsPage } from "@/pages/student/DiscussSectionsPage";
import { DiscussThreadsPage } from "@/pages/student/DiscussThreadsPage";
import { DiscussThreadPage } from "@/pages/student/DiscussThreadPage";

import { MySectionsPage } from "@/pages/instructor/MySectionsPage";
import { SectionRosterPage } from "@/pages/instructor/SectionRosterPage";
import { SectionGradesPage } from "@/pages/instructor/SectionGradesPage";
import { GradeItemGradesPage } from "@/pages/instructor/GradeItemGradesPage";
import { SectionAnnouncementsPage } from "@/pages/instructor/SectionAnnouncementsPage";
import { InstructorDiscussThreadsPage } from "@/pages/instructor/InstructorDiscussThreadsPage";
import { InstructorDiscussThreadPage } from "@/pages/instructor/InstructorDiscussThreadPage";
import { SectionAnalyticsPage } from "@/pages/instructor/SectionAnalyticsPage";

import { FacultiesPage } from "@/pages/admin/FacultiesPage";
import { DepartmentsPage } from "@/pages/admin/DepartmentsPage";
import { ProgrammesPage } from "@/pages/admin/ProgrammesPage";
import { CoursesPage } from "@/pages/admin/CoursesPage";
import { SectionsPage } from "@/pages/admin/SectionsPage";
import { TermsPage } from "@/pages/admin/TermsPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";

import { TenantsPage } from "@/pages/platform/TenantsPage";

import { GuestRoute, ProtectedRoute } from "@/routes/guards";

function RootRedirect() {
    const { isAuthenticated, isLoading, user } = useAuth();
    const { t } = useLocale();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-paper">
                <p className="text-ink/60 text-sm">{t("loading")}</p>
            </div>
        );
    }

    if (isAuthenticated && user) {
        return <Navigate to={homePathForRole(user.role)} replace />;
    }

    return <Navigate to="/login" replace />;
}

function AdminRootRedirect() {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role === "university_admin" || user.role === "faculty_admin") {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <Navigate to={homePathForRole(user.role)} replace />;
}

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<RootRedirect />} />

            {/* Guest */}
            <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />

                <Route
                    path="/forgot-password"
                    element={<ForgotPasswordPage />}
                />

                <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Student */}
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
                <Route element={<StudentShell />}>
                    <Route path="/student" element={<MyCoursesPage />} />

                    <Route
                        path="/student/catalogue"
                        element={<CataloguePage />}
                    />

                    <Route
                        path="/student/catalogue/:courseId"
                        element={<CourseDetailPage />}
                    />

                    <Route path="/student/grades" element={<GradesPage />} />

                    <Route
                        path="/student/announcements"
                        element={<AnnouncementsPage />}
                    />

                    <Route
                        path="/student/discuss"
                        element={<DiscussSectionsPage />}
                    />

                    <Route
                        path="/student/discuss/sections/:sectionId"
                        element={<DiscussThreadsPage />}
                    />

                    <Route
                        path="/student/discuss/sections/:sectionId/threads/:threadId"
                        element={<DiscussThreadPage />}
                    />

                    <Route
                        path="/student/sections/:sectionId"
                        element={<SectionLessonsPage />}
                    />

                    <Route
                        path="/student/sections/:sectionId/lessons/:lessonId"
                        element={<LessonViewerPage />}
                    />
                </Route>
            </Route>

            {/* Instructor / Teaching Assistant */}
            <Route
                element={
                    <ProtectedRoute
                        allowedRoles={["instructor", "teaching_assistant"]}
                    />
                }
            >
                <Route element={<InstructorShell />}>
                    <Route path="/instructor" element={<MySectionsPage />} />

                    <Route
                        path="/instructor/sections/:sectionId"
                        element={<SectionRosterPage />}
                    />

                    <Route
                        path="/instructor/sections/:sectionId/grades"
                        element={<SectionGradesPage />}
                    />

                    <Route
                        path="/instructor/sections/:sectionId/grades/:itemId"
                        element={<GradeItemGradesPage />}
                    />

                    <Route
                        path="/instructor/sections/:sectionId/announcements"
                        element={<SectionAnnouncementsPage />}
                    />

                    <Route
                        path="/instructor/sections/:sectionId/discuss"
                        element={<InstructorDiscussThreadsPage />}
                    />

                    <Route
                        path="/instructor/sections/:sectionId/discuss/threads/:threadId"
                        element={<InstructorDiscussThreadPage />}
                    />

                    <Route
                        path="/instructor/sections/:sectionId/analytics"
                        element={<SectionAnalyticsPage />}
                    />
                </Route>
            </Route>

            {/* Admin */}
            <Route
                element={
                    <ProtectedRoute
                        allowedRoles={["university_admin", "faculty_admin"]}
                    />
                }
            >
                <Route element={<AdminShell />}>
                    {/* Admin root */}
                    <Route path="/admin" element={<AdminRootRedirect />} />

                    {/* Dashboard */}
                    <Route
                        path="/admin/dashboard"
                        element={<AdminDashboardPage />}
                    />

                    {/* University Admin */}
                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={["university_admin"]}
                            />
                        }
                    >
                        <Route
                            path="/admin/faculties"
                            element={<FacultiesPage />}
                        />
                        <Route
                            path="/admin/terms"
                            element={<TermsPage />}
                        />
                    </Route>

                    {/* Faculty Admin */}
                    <Route
                        element={
                            <ProtectedRoute allowedRoles={["faculty_admin"]} />
                        }
                    >
                        <Route
                            path="/admin/departments"
                            element={<DepartmentsPage />}
                        />

                        <Route
                            path="/admin/programmes"
                            element={<ProgrammesPage />}
                        />

                        <Route
                            path="/admin/courses"
                            element={<CoursesPage />}
                        />

                        <Route
                            path="/admin/sections"
                            element={<SectionsPage />}
                        />

                        <Route path="/admin/users" element={<UsersPage />} />
                    </Route>
                </Route>
            </Route>

            {/* Platform Admin */}
            <Route
                element={<ProtectedRoute allowedRoles={["platform_admin"]} />}
            >
                <Route element={<PlatformShell />}>
                    <Route
                        path="/platform"
                        element={<Navigate to="/platform/tenants" replace />}
                    />

                    <Route path="/platform/tenants" element={<TenantsPage />} />
                </Route>
            </Route>

            <Route path="*" element={<RootRedirect />} />
        </Routes>
    );
}
