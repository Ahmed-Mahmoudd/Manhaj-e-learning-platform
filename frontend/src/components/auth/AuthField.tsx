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
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brass ${
          error ? 'border-brick' : 'border-ink/20'
        }`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-brick" role="alert">
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
      ? 'border-s-2 border-brass bg-brass/5 text-ink'
      : 'border-s-2 border-brick bg-brick/5 text-brick';

  return (
    <div className={`mb-5 px-4 py-3 text-sm ${styles}`} role={variant === 'error' ? 'alert' : 'status'}>
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
      className="w-full bg-brass py-3 text-sm font-medium text-white transition hover:bg-brass-hover disabled:opacity-60"
    >
      {children}
    </button>
  );
}
