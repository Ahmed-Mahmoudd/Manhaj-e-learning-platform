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
        <div className="min-h-screen animate-fade-rise flex flex-col">
            <header className="bg-ink text-white shadow-sm border-b border-ink/40">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
                    <div className="flex items-center gap-4">
                        <NavLink
                            to="/admin/dashboard"
                            className="group flex items-center gap-2.5"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brass text-sm font-bold text-white shadow-xs transition-transform group-hover:scale-105">
                                M
                            </span>
                            <span className="text-base font-bold tracking-widest text-white">
                                MANHAJ
                            </span>
                        </NavLink>

                        {user && (
                            <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs sm:flex">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span className="font-medium text-white/90">{user.name}</span>
                                <span className="text-white/30">•</span>
                                <span className="font-mono text-white/60 text-[11px]">
                                    {displayRole(user.role, locale)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        <LanguageSwitcher />

                        <button
                            type="button"
                            onClick={() => logout()}
                            className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/10 hover:border-white/40 hover:text-white"
                        >
                            {t("logout")}
                        </button>
                    </div>
                </div>

                <div className="border-t border-white/10 bg-ink/60">
                    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
                        {navItems.map(({ to, labelKey, end }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    `relative border-b-2 py-2.5 px-3 text-xs font-medium uppercase tracking-wider transition whitespace-nowrap ${
                                        isActive
                                            ? "border-brass text-white"
                                            : "border-transparent text-white/70 hover:text-white hover:border-white/30"
                                    }`
                                }
                            >
                                {t(labelKey)}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
                <RouteErrorBoundary>
                    <Outlet />
                </RouteErrorBoundary>
            </main>
        </div>
    );
}
