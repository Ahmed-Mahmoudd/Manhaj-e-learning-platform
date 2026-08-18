import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { displayRole } from "@/auth/roles";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n/messages";

const UNIVERSITY_ADMIN_NAV: {
    to: string;
    labelKey: MessageKey;
    end?: boolean;
}[] = [
    {
        to: "/admin/dashboard",
        labelKey: "navDashboard",
        end: true,
    },
    {
        to: "/admin/faculties",
        labelKey: "navFaculties",
    },
    {
        to: "/admin/terms",
        labelKey: "navTerms",
    },
];

const FACULTY_ADMIN_NAV: {
    to: string;
    labelKey: MessageKey;
    end?: boolean;
}[] = [
    {
        to: "/admin/dashboard",
        labelKey: "navDashboard",
        end: true,
    },
    {
        to: "/admin/departments",
        labelKey: "navDepartments",
    },
    {
        to: "/admin/programmes",
        labelKey: "navProgrammes",
    },
    {
        to: "/admin/courses",
        labelKey: "navCourses",
    },
    {
        to: "/admin/sections",
        labelKey: "navSections",
    },
    {
        to: "/admin/users",
        labelKey: "navUsers",
    },
];

export function AdminShell() {
    const { user, logout } = useAuth();
    const { t, locale } = useLocale();

    const navItems =
        user?.role === "faculty_admin"
            ? FACULTY_ADMIN_NAV
            : UNIVERSITY_ADMIN_NAV;

    return (
        <div className="min-h-screen bg-paper animate-fade-rise">
            <header className="bg-ink text-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
                    <div className="flex items-center gap-4">
                        <NavLink
                            to="/admin/dashboard"
                            className="font-semibold tracking-widest text-white"
                        >
                            MANHAJ
                        </NavLink>

                        {user && (
                            <span className="hidden font-mono text-xs text-white/40 sm:inline">
                                {displayRole(user.role, locale)}
                            </span>
                        )}

                        {user && (
                            <span className="hidden text-xs text-white/40 md:inline">
                                {user.email}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />

                        <button
                            type="button"
                            onClick={() => logout()}
                            className="border border-white/25 px-3 py-1.5 text-sm text-white/90 transition hover:border-white/50"
                        >
                            {t("logout")}
                        </button>
                    </div>
                </div>

                <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-0">
                    {navItems.map(({ to, labelKey, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `border-b-2 px-3 py-2 text-sm whitespace-nowrap transition ${
                                    isActive
                                        ? "border-brass text-white"
                                        : "border-transparent text-white/70 hover:text-white"
                                }`
                            }
                        >
                            {t(labelKey)}
                        </NavLink>
                    ))}
                </nav>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8">
                <RouteErrorBoundary>
                    <Outlet />
                </RouteErrorBoundary>
            </main>
        </div>
    );
}
