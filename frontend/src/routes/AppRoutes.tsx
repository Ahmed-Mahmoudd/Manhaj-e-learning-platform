import { Navigate, Route, Routes } from 'react-router-dom';
import { homePathForRole } from '@/auth/roles';
import { useAuth } from '@/auth/AuthContext';
import { StudentShell } from '@/components/StudentShell';
import { LoginPage } from '@/pages/LoginPage';
import { RoleHomePage } from '@/pages/RoleHomePage';
import { LessonViewerPage } from '@/pages/student/LessonViewerPage';
import { MyCoursesPage } from '@/pages/student/MyCoursesPage';
import { CataloguePage } from '@/pages/student/CataloguePage';
import { CourseDetailPage } from '@/pages/student/CourseDetailPage';
import { SectionLessonsPage } from '@/pages/student/SectionLessonsPage';
import { GuestRoute, ProtectedRoute } from '@/routes/guards';

function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink/60 text-sm">…</p>
      </div>
    );
  }
  if (isAuthenticated && user) return <Navigate to={homePathForRole(user.role)} replace />;
  return <Navigate to="/login" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<StudentShell />}>
          <Route path="/student" element={<MyCoursesPage />} />
          <Route path="/student/catalogue" element={<CataloguePage />} />
          <Route path="/student/catalogue/:courseId" element={<CourseDetailPage />} />
          <Route path="/student/sections/:sectionId" element={<SectionLessonsPage />} />
          <Route
            path="/student/sections/:sectionId/lessons/:lessonId"
            element={<LessonViewerPage />}
          />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['instructor', 'teaching_assistant']} />
        }
      >
        <Route
          path="/instructor"
          element={<RoleHomePage titleKey="placeholderInstructor" />}
        />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['university_admin', 'faculty_admin']} />
        }
      >
        <Route path="/admin" element={<RoleHomePage titleKey="placeholderAdmin" />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['platform_admin']} />}>
        <Route
          path="/platform"
          element={<RoleHomePage titleKey="placeholderPlatform" />}
        />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
