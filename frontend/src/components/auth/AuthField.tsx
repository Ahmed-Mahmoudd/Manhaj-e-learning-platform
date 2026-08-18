export function AuthField({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 ${
          error ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 hover:border-slate-300'
        }`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthAlert({
  children,
  variant = 'error',
}: {
  children: React.ReactNode;
  variant?: 'error' | 'success';
}) {
  const styles =
    variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div className={`mb-5 rounded-xl border p-4 text-xs font-medium ${styles}`} role={variant === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function AuthSubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-white shadow-md shadow-amber-500/25 transition-all hover:from-amber-600 hover:to-amber-700 hover:shadow-lg hover:shadow-amber-500/35 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
    >
      {children}
    </button>
  );
}
