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

        async function loadDashboard() {
            try {
                setLoading(true);
                setError(null);

                const response = await fetchAdminDashboard();

                if (!cancelled) {
                    setDashboard(response);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : t("failedToLoadDashboard"),
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadDashboard();

        return () => {
            cancelled = true;
        };
    }, [t]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-ink">
                        {t("navDashboard")}
                    </h1>

                    <p className="mt-1 text-sm text-ink/60">{user?.email}</p>
                </div>

                <div className="border border-ink/10 bg-white p-6">
                    <p className="text-sm text-ink/60">{t("loadingDashboard")}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-ink">
                        {t("navDashboard")}
                    </h1>

                    <p className="mt-1 text-sm text-ink/60">{user?.email}</p>
                </div>

                <div className="border border-red-200 bg-red-50 p-6">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
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
                <h1 className="text-2xl font-semibold text-ink">{title}</h1>

                <p className="mt-1 text-sm text-ink/60">{email}</p>
            </div>

            {/* Main Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label={t("students")} value={stats.total_students} />

                <StatCard label={t("faculties")} value={stats.total_faculties} />

                <StatCard
                    label={t("departments")}
                    value={stats.total_departments}
                />

                <StatCard
                    label={t("programmes")}
                    value={stats.total_programmes}
                />

                <StatCard label={t("courses")} value={totalCourses} />

                <StatCard
                    label={t("enrolments")}
                    value={stats.total_enrolments}
                />
            </div>

            {/* Active Term */}
            <section>
                <h2 className="mb-3 text-lg font-semibold text-ink">
                    {t("activeTerm")}
                </h2>

                <div className="border border-ink/10 bg-white p-5">
                    {stats.active_term ? (
                        <div>
                            <p className="text-lg font-semibold text-ink">
                                {stats.active_term.name}
                            </p>

                            <p className="mt-1 text-sm text-ink/60">
                                {formatDate(stats.active_term.starts_at, locale)}
                                {" — "}
                                {formatDate(stats.active_term.ends_at, locale)}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-ink/60">
                            {t("noActiveTerm")}
                        </p>
                    )}
                </div>
            </section>

            {/* Faculty Summary */}
            <section>
                <div className="mb-3">
                    <h2 className="text-lg font-semibold text-ink">
                        {t("universityOverview")}
                    </h2>

                    <p className="mt-1 text-sm text-ink/60">
                        {t("universityOverviewSubtitle")}
                    </p>
                </div>

                <div className="overflow-hidden border border-ink/10 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full text-start text-sm">
                            <thead className="border-b border-ink/10 bg-paper">
                                <tr>
                                    <th className="px-5 py-3 font-medium text-ink text-start">
                                        {t("faculty")}
                                    </th>

                                    <th className="px-5 py-3 font-medium text-ink text-start">
                                        {t("departments")}
                                    </th>

                                    <th className="px-5 py-3 font-medium text-ink text-start">
                                        {t("programmes")}
                                    </th>

                                    <th className="px-5 py-3 font-medium text-ink text-start">
                                        {t("courses")}
                                    </th>

                                    <th className="px-5 py-3 font-medium text-ink text-start">
                                        {t("students")}
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {stats.faculty_summaries.map(
                                    (
                                        faculty: UniversityDashboardStats["faculty_summaries"][number],
                                    ) => {
                                        const facultyName =
                                            locale === "ar" && faculty.name_ar
                                                ? faculty.name_ar
                                                : faculty.name_en;

                                        return (
                                            <tr
                                                key={faculty.id}
                                                className="border-b border-ink/5 last:border-b-0"
                                            >
                                                <td className="px-5 py-4">
                                                    <div>
                                                        <p className="font-medium text-ink">
                                                            {facultyName}
                                                        </p>

                                                        <p className="mt-0.5 text-xs text-ink/50">
                                                            {faculty.code}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-ink/70">
                                                    {faculty.departments_count}
                                                </td>

                                                <td className="px-5 py-4 text-ink/70">
                                                    {faculty.programmes_count}
                                                </td>

                                                <td className="px-5 py-4 text-ink/70">
                                                    {faculty.courses_count}
                                                </td>

                                                <td className="px-5 py-4 text-ink/70">
                                                    {faculty.students_count}
                                                </td>
                                            </tr>
                                        );
                                    },
                                )}
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
                <h1 className="text-2xl font-semibold text-ink">{title}</h1>

                <p className="mt-1 text-sm text-ink/60">{email}</p>

                <p className="mt-2 text-sm text-ink/60">
                    {facultyName} ({stats.faculty.code})
                </p>
            </div>

            {/* Main Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label={t("students")} value={stats.students_count} />

                <StatCard
                    label={t("departments")}
                    value={stats.departments_count}
                />

                <StatCard
                    label={t("programmes")}
                    value={stats.programmes_count}
                />

                <StatCard label={t("courses")} value={stats.courses_count} />

                <StatCard
                    label={t("enrolments")}
                    value={stats.enrolments_count}
                />

                <StatCard
                    label={t("activeSections")}
                    value={stats.active_sections_count}
                />
            </div>

            {/* Active Term */}
            <section>
                <h2 className="mb-3 text-lg font-semibold text-ink">
                    {t("activeTerm")}
                </h2>

                <div className="border border-ink/10 bg-white p-5">
                    {stats.active_term ? (
                        <div>
                            <p className="text-lg font-semibold text-ink">
                                {stats.active_term.name}
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm text-ink/60">
                            {t("noActiveTerm")}
                        </p>
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
                <h2 className="text-lg font-semibold text-ink">{t("departmentAnalytics")}</h2>
                <p className="mt-0.5 text-xs text-ink/60">{t("departmentAnalyticsSubtitle")}</p>
            </div>

            <div className="overflow-x-auto border border-ink/10 bg-white rounded">
                <table className="w-full text-start text-sm">
                    <thead className="border-b border-ink/10 bg-paper text-xs uppercase text-ink/50">
                        <tr>
                            <th className="px-5 py-3 font-medium text-start">{t("department")}</th>
                            <th className="px-4 py-3 font-medium text-center">{t("programmes")}</th>
                            <th className="px-4 py-3 font-medium text-center">{t("courses")}</th>
                            <th className="px-4 py-3 font-medium text-center">{t("sections")}</th>
                            <th className="px-4 py-3 font-medium text-center">{t("capacity")}</th>
                            <th className="px-4 py-3 font-medium text-center">{t("enrolled")}</th>
                            <th className="px-5 py-3 font-medium text-start">{t("fillRate")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                        {departments.map((d) => {
                            const name = locale === "ar" && d.name_ar ? d.name_ar : d.name_en;
                            return (
                                <tr key={d.id} className="hover:bg-paper/40">
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-ink">{name}</p>
                                        <p className="text-xs text-ink/50 font-mono">{d.code}</p>
                                    </td>
                                    <td className="px-4 py-4 text-center text-ink/70">{d.programmes_count}</td>
                                    <td className="px-4 py-4 text-center text-ink/70">{d.courses_count}</td>
                                    <td className="px-4 py-4 text-center text-ink/70">{d.sections_count}</td>
                                    <td className="px-4 py-4 text-center text-ink/70">{d.capacity}</td>
                                    <td className="px-4 py-4 text-center text-ink/70 font-semibold">{d.enrolled_count}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-16 overflow-hidden rounded bg-ink/10">
                                                <div
                                                    className="h-full bg-brass"
                                                    style={{ width: `${Math.min(100, d.fill_rate_pct)}%` }}
                                                />
                                            </div>
                                            <span className="font-mono text-xs text-ink/70">{d.fill_rate_pct}%</span>
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
                <h2 className="text-lg font-semibold text-ink">{t("gradeAnalytics")}</h2>
                <p className="mt-0.5 text-xs text-ink/60">{t("gradeAnalyticsSubtitle")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="border border-ink/10 bg-white p-5 rounded">
                    <p className="text-xs uppercase text-ink/50 font-medium">{t("averageScore")}</p>
                    <p className="mt-2 text-2xl font-bold text-ink">{grades.average_score_pct}%</p>
                    <p className="mt-1 text-xs text-ink/50">{grades.published_grade_items} {t("publishedGradeItems")}</p>
                </div>

                <div className="border border-ink/10 bg-white p-5 rounded">
                    <p className="text-xs uppercase text-ink/50 font-medium">{t("passingRate")}</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700">{grades.passing_rate_pct}%</p>
                    <p className="mt-1 text-xs text-ink/50">{t("passingScoreThreshold")}</p>
                </div>

                <div className="border border-ink/10 bg-white p-5 rounded">
                    <p className="text-xs uppercase text-ink/50 font-medium">{t("totalEvaluations")}</p>
                    <p className="mt-2 text-2xl font-bold text-ink">{grades.total_grades}</p>
                    <p className="mt-1 text-xs text-ink/50">{t("individualStudentGrades")}</p>
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
        <section className="border border-ink/10 bg-white p-6 rounded space-y-4">
            <div>
                <h2 className="text-base font-semibold text-ink">{t("exportReports")}</h2>
                <p className="mt-0.5 text-xs text-ink/60">{t("exportReportsSubtitle")}</p>
            </div>

            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport("departments")}
                    className="inline-flex items-center gap-2 rounded border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
                >
                    📥 {t("exportDepartmentsCsv")}
                </button>

                <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport("courses")}
                    className="inline-flex items-center gap-2 rounded border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
                >
                    📥 {t("exportCoursesCsv")}
                </button>

                <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport("sections")}
                    className="inline-flex items-center gap-2 rounded border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
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

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="border border-ink/10 bg-white p-5">
            <p className="text-sm text-ink/50">{label}</p>

            <p className="mt-2 text-3xl font-semibold text-ink">
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

    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US");
}

