import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useLocale } from "@/i18n/LocaleContext";
import {
    downloadAdminReport,
    fetchAdminDashboard,
    fetchDepartmentAnalytics,
    fetchGradeAnalytics,
    type FacultyDashboardStats,
    type UniversityDashboardStats,
} from "@/api/admin";

type DashboardResponse = {
    scope: "university" | "faculty";
    stats: UniversityDashboardStats | FacultyDashboardStats;
};

export function AdminDashboardPage() {
    const { user } = useAuth();
    const { t } = useLocale();

    const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchAdminDashboard();
                if (!cancelled) {
                    setDashboard(data);
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    const message =
                        err instanceof Error
                            ? err.message
                            : t("failedToLoadDashboard");
                    setError(message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [t]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    {t("loadingDashboard")}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-700 shadow-sm" role="alert">
                <p className="font-semibold">⚠️ {t("failedToLoadDashboard")}</p>
                <p className="mt-1 text-xs">{error}</p>
            </div>
        );
    }

    if (!dashboard) {
        return null;
    }

    if (dashboard.scope === "university") {
        return (
            <UniversityDashboard
                stats={dashboard.stats as UniversityDashboardStats}
                email={user?.email}
                title={t("navDashboard")}
            />
        );
    }

    return (
        <FacultyDashboard
            stats={dashboard.stats as FacultyDashboardStats}
            email={user?.email}
            title={t("navDashboard")}
        />
    );
}

/* -------------------------------------------------------------------------- */
/* University Dashboard                                                       */
/* -------------------------------------------------------------------------- */

function UniversityDashboard({
    stats,
    email,
    title,
}: {
    stats: UniversityDashboardStats;
    email?: string;
    title: string;
}) {
    const { t, locale } = useLocale();

    const totalCourses = stats.faculty_summaries.reduce(
        (
            total: number,
            faculty: UniversityDashboardStats["faculty_summaries"][number],
        ) => total + faculty.courses_count,
        0,
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-1 text-sm text-slate-500">{email} • {t("universityOverviewSubtitle")}</p>
            </div>

            {/* Main Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label={t("students")} value={stats.total_students} icon="👥" color="blue" />
                <StatCard label={t("faculties")} value={stats.total_faculties} icon="🏛️" color="amber" />
                <StatCard label={t("departments")} value={stats.total_departments} icon="📂" color="indigo" />
                <StatCard label={t("programmes")} value={stats.total_programmes} icon="📜" color="emerald" />
                <StatCard label={t("courses")} value={totalCourses} icon="📚" color="violet" />
                <StatCard label={t("enrolments")} value={stats.total_enrolments} icon="📝" color="rose" />
            </div>

            {/* Active Term Banner */}
            <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                                {t("activeTerm")}
                            </span>
                        </div>
                        {stats.active_term ? (
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{stats.active_term.name}</h3>
                                <p className="mt-1 font-mono text-xs text-slate-500">
                                    🗓️ {formatDate(stats.active_term.starts_at, locale)} — {formatDate(stats.active_term.ends_at, locale)}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">{t("noActiveTerm")}</p>
                        )}
                    </div>
                </div>
            </section>

            {/* Faculty Summary Table */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{t("universityOverview")}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{t("universityOverviewSubtitle")}</p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-sm">
                            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-5 py-3.5 text-start">{t("faculty")}</th>
                                    <th className="px-5 py-3.5 text-start">{t("departments")}</th>
                                    <th className="px-5 py-3.5 text-start">{t("programmes")}</th>
                                    <th className="px-5 py-3.5 text-start">{t("courses")}</th>
                                    <th className="px-5 py-3.5 text-start">{t("students")}</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {stats.faculty_summaries.map((faculty) => {
                                    const facultyName =
                                        locale === "ar" && faculty.name_ar
                                            ? faculty.name_ar
                                            : faculty.name_en;

                                    return (
                                        <tr key={faculty.id} className="hover:bg-amber-50/20 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-sm">
                                                        🏛️
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{facultyName}</p>
                                                        <p className="font-mono text-xs text-slate-400">{faculty.code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-slate-700">{faculty.departments_count}</td>
                                            <td className="px-5 py-4 font-semibold text-slate-700">{faculty.programmes_count}</td>
                                            <td className="px-5 py-4 font-semibold text-slate-700">{faculty.courses_count}</td>
                                            <td className="px-5 py-4 font-bold text-emerald-700">{faculty.students_count}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Department Analytics & Grade Performance */}
            <DepartmentAnalyticsSection />
            <GradeAnalyticsSection />
            <ReportsExportSection />
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Faculty Dashboard                                                          */
/* -------------------------------------------------------------------------- */

function FacultyDashboard({
    stats,
    email,
    title,
}: {
    stats: FacultyDashboardStats;
    email?: string;
    title: string;
}) {
    const { t, locale } = useLocale();

    const facultyName =
        locale === "ar" && stats.faculty.name_ar
            ? stats.faculty.name_ar
            : stats.faculty.name_en;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-1 text-sm text-slate-500">{email} • {facultyName} ({stats.faculty.code})</p>
            </div>

            {/* Main Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label={t("students")} value={stats.students_count} icon="👥" />
                <StatCard label={t("departments")} value={stats.departments_count} icon="📂" />
                <StatCard label={t("programmes")} value={stats.programmes_count} icon="📜" />
                <StatCard label={t("courses")} value={stats.courses_count} icon="📚" />
                <StatCard label={t("enrolments")} value={stats.enrolments_count} icon="📝" />
                <StatCard label={t("activeSections")} value={stats.active_sections_count} icon="⚡" />
            </div>

            {/* Active Term Banner */}
            <section className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white p-6 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700">{t("activeTerm")}</span>
                    </div>
                    {stats.active_term ? (
                        <h3 className="text-xl font-bold text-slate-900">{stats.active_term.name}</h3>
                    ) : (
                        <p className="text-sm text-slate-500">{t("noActiveTerm")}</p>
                    )}
                </div>
            </section>

            {/* Department Analytics & Grade Performance */}
            <DepartmentAnalyticsSection facultyId={stats.faculty.id} />
            <GradeAnalyticsSection facultyId={stats.faculty.id} />
            <ReportsExportSection facultyId={stats.faculty.id} />
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Department & Grade Analytics Components                                    */
/* -------------------------------------------------------------------------- */

function DepartmentAnalyticsSection({ facultyId }: { facultyId?: number }) {
    const { t, locale } = useLocale();
    const [departments, setDepartments] = useState<import("@/types/admin").DepartmentAnalyticsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        async function load() {
            try {
                const res = await fetchDepartmentAnalytics(facultyId);
                if (active) setDepartments(res.departments);
            } catch {
                // Ignore silent analytics error
            } finally {
                if (active) setLoading(false);
            }
        }
        load();
        return () => { active = false; };
    }, [facultyId]);

    if (loading || departments.length === 0) return null;

    return (
        <section className="space-y-3">
            <div>
                <h2 className="text-lg font-bold text-slate-900">{t("departmentAnalytics")}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{t("departmentAnalyticsSubtitle")}</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                <table className="w-full text-start text-sm">
                    <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        <tr>
                            <th className="px-5 py-3.5 text-start">{t("department")}</th>
                            <th className="px-4 py-3.5 text-center">{t("programmes")}</th>
                            <th className="px-4 py-3.5 text-center">{t("courses")}</th>
                            <th className="px-4 py-3.5 text-center">{t("sections")}</th>
                            <th className="px-4 py-3.5 text-center">{t("capacity")}</th>
                            <th className="px-4 py-3.5 text-center">{t("enrolled")}</th>
                            <th className="px-5 py-3.5 text-start">{t("fillRate")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {departments.map((d) => {
                            const name = locale === "ar" && d.name_ar ? d.name_ar : d.name_en;
                            return (
                                <tr key={d.id} className="hover:bg-amber-50/20 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="font-bold text-slate-900">{name}</p>
                                        <p className="text-xs text-slate-400 font-mono">{d.code}</p>
                                    </td>
                                    <td className="px-4 py-4 text-center text-slate-700">{d.programmes_count}</td>
                                    <td className="px-4 py-4 text-center text-slate-700">{d.courses_count}</td>
                                    <td className="px-4 py-4 text-center text-slate-700">{d.sections_count}</td>
                                    <td className="px-4 py-4 text-center text-slate-700 font-mono">{d.capacity}</td>
                                    <td className="px-4 py-4 text-center text-slate-900 font-bold font-mono">{d.enrolled_count}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600"
                                                    style={{ width: `${Math.min(100, d.fill_rate_pct)}%` }}
                                                />
                                            </div>
                                            <span className="font-mono text-xs font-bold text-slate-700">{d.fill_rate_pct}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function GradeAnalyticsSection({ facultyId }: { facultyId?: number }) {
    const { t } = useLocale();
    const [grades, setGrades] = useState<import("@/types/admin").GradeAnalyticsResponse | null>(null);

    useEffect(() => {
        let active = true;
        async function load() {
            try {
                const res = await fetchGradeAnalytics(facultyId);
                if (active) setGrades(res);
            } catch {
                // Ignore silent analytics error
            }
        }
        load();
        return () => { active = false; };
    }, [facultyId]);

    if (!grades || grades.total_grades === 0) return null;

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-slate-900">{t("gradeAnalytics")}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{t("gradeAnalyticsSubtitle")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-50 to-white p-6 shadow-xs">
                    <p className="text-xs uppercase font-bold tracking-wider text-amber-700">{t("averageScore")}</p>
                    <p className="mt-2 text-3xl font-extrabold text-slate-900">{grades.average_score_pct}%</p>
                    <p className="mt-1 text-xs text-slate-500">{grades.published_grade_items} {t("publishedGradeItems")}</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-xs">
                    <p className="text-xs uppercase font-bold tracking-wider text-emerald-700">{t("passingRate")}</p>
                    <p className="mt-2 text-3xl font-extrabold text-emerald-700">{grades.passing_rate_pct}%</p>
                    <p className="mt-1 text-xs text-slate-500">{t("passingScoreThreshold")}</p>
                </div>

                <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-50 to-white p-6 shadow-xs">
                    <p className="text-xs uppercase font-bold tracking-wider text-blue-700">{t("totalEvaluations")}</p>
                    <p className="mt-2 text-3xl font-extrabold text-slate-900">{grades.total_grades.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-slate-500">{t("individualStudentGrades")}</p>
                </div>
            </div>
        </section>
    );
}

function ReportsExportSection({ facultyId }: { facultyId?: number }) {
    const { t } = useLocale();
    const [exporting, setExporting] = useState<string | null>(null);

    async function handleExport(type: string) {
        try {
            setExporting(type);
            await downloadAdminReport(type, facultyId);
        } catch {
            // handle error
        } finally {
            setExporting(null);
        }
    }

    return (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
            <div>
                <h2 className="text-base font-bold text-slate-900">{t("exportReports")}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{t("exportReportsSubtitle")}</p>
            </div>

            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport("departments")}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 cursor-pointer transition-all"
                >
                    📥 {t("exportDepartmentsCsv")}
                </button>

                <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport("courses")}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 cursor-pointer transition-all"
                >
                    📥 {t("exportCoursesCsv")}
                </button>

                <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport("sections")}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 cursor-pointer transition-all"
                >
                    📥 {t("exportSectionsCsv")}
                </button>
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Reusable Components                                                        */
/* -------------------------------------------------------------------------- */

function StatCard({
    label,
    value,
    icon,
}: {
    label: string;
    value: number;
    icon?: string;
    color?: string;
}) {
    return (
        <div className="group rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-amber-500/40 hover:shadow-md">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                {icon && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-base shadow-xs group-hover:scale-110 transition-transform">
                        {icon}
                    </span>
                )}
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                {value.toLocaleString()}
            </p>
        </div>
    );
}

function formatDate(value: string, locale: "en" | "ar") {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
