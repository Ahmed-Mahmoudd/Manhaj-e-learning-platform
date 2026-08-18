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
        <div className={`overflow-hidden rounded-lg border border-ink/10 bg-white shadow-xs ${className}`}>
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
            className={`rounded border border-ink/15 bg-paper/20 px-3 py-1.5 text-sm text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass ${className}`}
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
            className={`rounded border border-ink/15 bg-paper/20 px-3 py-1.5 text-sm text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass ${className}`}
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
            ? "rounded bg-brass px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-brass-hover disabled:opacity-60"
            : variant === "danger"
              ? "rounded border border-brick/20 bg-brick/5 px-3 py-1.5 text-xs font-semibold text-brick transition hover:bg-brick hover:text-white disabled:opacity-60"
              : "rounded border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-paper hover:text-ink disabled:opacity-60";

    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-1.5 ${base} ${className}`}
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
        <p className="text-xs text-brick" role="alert">
            {message}
        </p>
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
                                        ? "6.5rem"
                                        : i === lastIndex
                                          ? "11rem"
                                          : `${Math.floor(100 / headers.length)}%`,
                            }}
                        />
                    ))}
                </colgroup>

                <thead>
                    <tr className="border-b border-ink/10 bg-paper text-xs uppercase tracking-wider text-ink/50">
                        {headers.map((h, i) => (
                            <th
                                key={i}
                                className="px-4 py-3 text-start font-medium whitespace-nowrap"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody className="divide-y divide-ink/10">{children}</tbody>
            </table>
        </div>
    );
}

export const adminTableCell = "px-4 py-3 text-start align-middle";
