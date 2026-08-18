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

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-ink">
                        {t("adminProgrammes")}
                    </h1>
                    <p className="mt-1 text-sm text-ink/60">
                        {t("adminProgrammesSubtitle")}
                    </p>
                </div>
                <AdminButton
                    variant="primary"
                    onClick={() => setShowForm((v) => !v)}
                >
                    {showForm ? t("cancel") : t("addNew")}
                </AdminButton>
            </header>

            <AdminSelect
                value={deptFilter}
                onChange={(e) =>
                    setDeptFilter(e.target.value ? Number(e.target.value) : "")
                }
                className="max-w-md"
            >
                <option value="">{t("allDepartments")}</option>
                {(deptsQuery.data?.departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                        {d.code} — {d.name_en}
                    </option>
                ))}
            </AdminSelect>

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
                    !isLoading && !error && (data?.programmes.length ?? 0) === 0
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
                        {(data?.programmes ?? []).map((p) => (
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
        <tr>
            <td className={`${adminTableCell} font-mono`}>{programme.code}</td>
            <td className={adminTableCell}>{displayName}</td>
            <td className={`${adminTableCell} text-ink/60`}>
                {programme.department?.code ?? "—"}
            </td>
            <td className={`${adminTableCell} text-ink/70`}>
                {programme.duration_years}
            </td>
            <td className={`${adminTableCell} text-ink/70`}>
                {gradingTypeLabel(programme.grading_type, t)}
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
                        {t("delete")}
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
        <AdminPanel className="space-y-3 p-5">
            <h2 className="text-sm font-medium text-ink">
                {t("addProgramme")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
                <AdminSelect
                    value={departmentId || departments[0]?.id}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                >
                    {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.code} — {d.name_en}
                        </option>
                    ))}
                </AdminSelect>
                <AdminSelect
                    value={gradingType}
                    onChange={(e) => setGradingType(e.target.value)}
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
            <div className="flex flex-wrap gap-3">
                <AdminInput
                    placeholder={t("code")}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-28"
                />
                <AdminInput
                    placeholder={t("nameEn")}
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                />
                <AdminInput
                    placeholder={t("nameAr")}
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                />
                <AdminInput
                    type="number"
                    min={1}
                    max={10}
                    value={durationYears}
                    onChange={(e) => setDurationYears(e.target.value)}
                    className="w-24"
                    placeholder={t("durationYears")}
                />
            </div>
            <FormError error={err} />
            <AdminButton
                variant="primary"
                onClick={() => mutation.mutate()}
                disabled={!nameEn || !code || mutation.isPending}
            >
                {mutation.isPending ? t("processing") : t("create")}
            </AdminButton>
        </AdminPanel>
    );
}
