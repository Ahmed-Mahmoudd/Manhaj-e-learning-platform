import { ReactNode } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import { apiErrorMessage } from '@/utils/apiError';

export function AdminPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-ink/10 bg-white ${className}`}>{children}</div>
  );
}

export function AdminInput({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`border border-ink/15 px-3 py-2 text-sm ${className}`}
      {...props}
    />
  );
}

export function AdminSelect({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`border border-ink/15 px-3 py-2 text-sm ${className}`} {...props}>
      {children}
    </select>
  );
}

export function AdminButton({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  const base =
    variant === 'primary'
      ? 'bg-brass text-white hover:bg-brass-hover disabled:opacity-60'
      : variant === 'danger'
        ? 'text-brick hover:bg-brick/5 disabled:opacity-60'
        : 'text-ink/60 hover:text-brass disabled:opacity-60';
  return (
    <button
      type="button"
      className={`px-3 py-1.5 text-sm transition ${base} ${className}`}
      {...props}
    />
  );
}

export function FormError({ error }: { error: Error | null }) {
  const { t } = useLocale();
  if (!error) return null;
  const message = apiErrorMessage(error, t('networkError'), t('serverError'), t);
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
                    ? '6.5rem'
                    : i === lastIndex
                      ? '11rem'
                      : `${Math.floor(100 / headers.length)}%`,
              }}
            />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-ink/10 text-xs uppercase text-ink/45">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-start font-medium whitespace-nowrap">
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

/** Shared padding/alignment for admin table cells */
export const adminTableCell = 'px-4 py-3 text-start align-middle';
