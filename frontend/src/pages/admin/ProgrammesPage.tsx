import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    adminKeys,
    createProgramme,
    deleteProgramme,
    fetchDepartments,
    fetchProgrammes,
} from "@/api/admin";
import { AsyncPanel } from "@/components/AsyncPanel";
import {
    AdminButton,
    AdminInput,
    AdminPanel,
    AdminSelect,
    AdminTable,
    FormError,
    adminTableCell,
} from "@/components/admin/AdminUi";
import { useLocale } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n/messages";
import type { Programme } from "@/types/admin";

export function ProgrammesPage() {
    const { t } = useLocale();
    const [deptFilter, setDeptFilter] = useState<number | "">("");
    const [showForm, setShowForm] = useState(false);

    const deptsQuery = useQuery({
        queryKey: adminKeys.departments(),
        queryFn: () => fetchDepartments(),
    });

    const { data, isLoading, error } = useQuery({
        queryKey: adminKeys.programmes(deptFilter || undefined),
        queryFn: () => fetchProgrammes(deptFilter || undefined),
    });

    const programmes = data?.programmes ?? [];

    return (
        <div className="space-y-8">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {t("adminProgrammes")}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {t("adminProgrammesSubtitle")}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <AdminSelect
                        value={deptFilter}
                        onChange={(e) =>
                            setDeptFilter(e.target.value ? Number(e.target.value) : "")
                        }
                        className="min-w-[14rem]"
                    >
                        <option value="">{t("allDepartments")}</option>
                        {(deptsQuery.data?.departments ?? []).map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.code} — {d.name_en}
                            </option>
                        ))}
                    </AdminSelect>
                    <AdminButton
                        variant="primary"
                        onClick={() => setShowForm((v) => !v)}
                    >
                        {showForm ? t("cancel") : `+ ${t("addNew")}`}
                    </AdminButton>
                </div>
            </header>

            {showForm && (
                <CreateProgrammeForm
                    departments={deptsQuery.data?.departments ?? []}
                    onDone={() => setShowForm(false)}
                />
            )}

            <AsyncPanel
                isLoading={isLoading}
                error={error}
                isEmpty={
                    !isLoading && !error && programmes.length === 0
                }
                emptyMessage={t("noProgrammes")}
            >
                <AdminPanel>
                    <AdminTable
                        headers={[
                            t("code"),
                            t("nameEn"),
                            t("department"),
                            t("durationYears"),
                            t("gradingType"),
                            t("actions"),
                        ]}
                    >
                        {programmes.map((p) => (
                            <ProgrammeRow key={p.id} programme={p} />
                        ))}
                    </AdminTable>
                </AdminPanel>
            </AsyncPanel>
        </div>
    );
}

function gradingTypeLabel(type: string, t: (k: MessageKey) => string): string {
    const key = `gradingType_${type}` as MessageKey;
    try {
        return t(key);
    } catch {
        return type;
    }
}

function ProgrammeRow({ programme }: { programme: Programme }) {
    const { t, locale } = useLocale();
    const queryClient = useQueryClient();
    const [err, setErr] = useState<Error | null>(null);

    const deleteMutation = useMutation({
        mutationFn: () => deleteProgramme(programme.id),
        onSuccess: () =>
            void queryClient.invalidateQueries({ queryKey: adminKeys.all }),
        onError: (e: Error) => setErr(e),
    });

    const displayName =
        locale === "ar" && programme.name_ar
            ? programme.name_ar
            : programme.name_en;

    return (
        <tr className="hover:bg-amber-50/20 transition-colors">
            <td className={adminTableCell}>
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 shadow-xs">
                    {programme.code}
                </span>
            </td>
            <td className={`${adminTableCell} font-bold text-slate-900`}>{displayName}</td>
            <td className={`${adminTableCell} font-mono text-xs text-slate-600`}>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold">
                    {programme.department?.code ?? "—"}
                </span>
            </td>
            <td className={`${adminTableCell} font-semibold text-slate-700`}>
                {programme.duration_years} {locale === 'ar' ? 'سنوات' : 'yrs'}
            </td>
            <td className={adminTableCell}>
                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {gradingTypeLabel(programme.grading_type, t)}
                </span>
            </td>
            <td className={adminTableCell}>
                <div className="flex flex-wrap gap-2">
                    <AdminButton
                        variant="danger"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                            if (window.confirm(t("confirmDelete"))) {
                                deleteMutation.mutate();
                            }
                        }}
                    >
                        🗑️ {t("delete")}
                    </AdminButton>
                </div>
                <FormError error={err} />
            </td>
        </tr>
    );
}

function CreateProgrammeForm({
    departments,
    onDone,
}: {
    departments: { id: number; code: string; name_en: string }[];
    onDone: () => void;
}) {
    const { t } = useLocale();
    const queryClient = useQueryClient();
    const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? 0);
    const [code, setCode] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [durationYears, setDurationYears] = useState("4");
    const [gradingType, setGradingType] = useState("credit_gpa");
    const [err, setErr] = useState<Error | null>(null);

    const mutation = useMutation({
        mutationFn: () =>
            createProgramme({
                department_id: departmentId || departments[0]?.id,
                code,
                name_en: nameEn,
                name_ar: nameAr || undefined,
                duration_years: Number(durationYears),
                grading_type: gradingType,
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: adminKeys.all });
            onDone();
        },
        onError: (e: Error) => setErr(e),
    });

    return (
        <div className="rounded-2xl border border-amber-500/30 bg-white p-6 shadow-md shadow-amber-500/5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                    {t("addProgramme")}
                </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">{t('department')}</label>
                    <AdminSelect
                        value={departmentId || departments[0]?.id}
                        onChange={(e) => setDepartmentId(Number(e.target.value))}
                        className="w-full"
                    >
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.code} — {d.name_en}
                            </option>
                        ))}
                    </AdminSelect>
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">{t('gradingType')}</label>
                    <AdminSelect
                        value={gradingType}
                        onChange={(e) => setGradingType(e.target.value)}
                        className="w-full"
                    >
                        <option value="credit_gpa">
                            {t("gradingType_credit_gpa")}
                        </option>
                        <option value="percentage">
                            {t("gradingType_percentage")}
                        </option>
                        <option value="pass_fail">
                            {t("gradingType_pass_fail")}
                        </option>
                    </AdminSelect>
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">{t('code')}</label>
                    <AdminInput
                        placeholder={t("code")}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">{t('durationYears')}</label>
                    <AdminInput
                        type="number"
                        min={1}
                        max={10}
                        value={durationYears}
                        onChange={(e) => setDurationYears(e.target.value)}
                        className="w-full"
                        placeholder={t("durationYears")}
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">{t('nameEn')}</label>
                    <AdminInput
                        placeholder={t("nameEn")}
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600">{t('nameAr')}</label>
                    <AdminInput
                        placeholder={t("nameAr")}
                        value={nameAr}
                        onChange={(e) => setNameAr(e.target.value)}
                        className="w-full"
                    />
                </div>
            </div>
            <FormError error={err} />
            <div className="flex items-center gap-3 pt-2">
                <AdminButton
                    variant="primary"
                    onClick={() => mutation.mutate()}
                    disabled={!nameEn || !code || mutation.isPending}
                >
                    {mutation.isPending ? t("processing") : t("create")}
                </AdminButton>
                <AdminButton variant="ghost" onClick={onDone}>
                    {t("cancel")}
                </AdminButton>
            </div>
        </div>
    );
}
