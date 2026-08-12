import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { homePathForRole, roleCanAccess } from '@/auth/roles';
import { UserRole } from '@/types/api';
import { useLocale } from '@/i18n/LocaleContext';

export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;

  if (isAuthenticated && user) {
    const home = homePathForRole(user.role);
    return <Navigate to={home} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const prefix = '/' + location.pathname.split('/').filter(Boolean)[0];
  const prefixAllowed = roleCanAccess(user.role, prefix);

  if (!prefixAllowed) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  if (allowedRoles && user.role !== 'platform_admin' && !allowedRoles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}

function FullPageSpinner() {
  const { t } = useLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <p className="text-ink/60 text-sm tracking-wide">{t('loading')}</p>
    </div>
  );
}
