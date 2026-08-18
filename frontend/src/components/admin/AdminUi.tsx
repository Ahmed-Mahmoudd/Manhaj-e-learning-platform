import { ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { apiErrorMessage } from "@/utils/apiError";

export function AdminPanel({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all ${className}`}>
            {children}
        </div>
    );
}

export function AdminInput({
    className = "",
    ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={`rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-800 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${className}`}
            {...props}
        />
    );
}

export function AdminSelect({
    className = "",
    children,
    ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={`rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2 text-sm text-slate-800 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}

export function AdminButton({
    variant = "primary",
    className = "",
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "danger";
}) {
    const base =
        variant === "primary"
            ? "rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 hover:shadow-md hover:shadow-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            : variant === "danger"
              ? "rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-100 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              : "rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer";

    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 ${base} ${className}`}
            {...props}
        />
    );
}

export function FormError({ error }: { error: Error | null }) {
    const { t } = useLocale();

    if (!error) {
        return null;
    }

    const message = apiErrorMessage(
        error,
        t("networkError"),
        t("serverError"),
        t,
    );

    return (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 shadow-xs" role="alert">
            ⚠️ {message}
        </div>
    );
}

export function AdminTable({
    headers,
    children,
}: {
    headers: string[];
    children: ReactNode;
}) {
    const lastIndex = headers.length - 1;

    return (
        <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                    {headers.map((_, i) => (
                        <col
                            key={i}
                            style={{
                                width:
                                    i === 0
                                        ? "14rem"
                                        : i === lastIndex
                                          ? "12rem"
                                          : `${Math.floor(100 / headers.length)}%`,
                            }}
                        />
                    ))}
                </colgroup>

                <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {headers.map((h, i) => (
                            <th
                                key={i}
                                className="px-5 py-3.5 text-start font-semibold whitespace-nowrap"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white/70">{children}</tbody>
            </table>
        </div>
    );
}

export const adminTableCell = "px-5 py-4 text-start align-middle";
