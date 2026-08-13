import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, forgotPassword } from '@/api/client';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLocale } from '@/i18n/LocaleContext';

export function ForgotPasswordPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await forgotPassword(email.trim());
      setSuccess(result.message);
    } catch (err) {
      if (err instanceof ApiError) {
        const validation = err.validation;
        if (validation?.errors) {
          const mapped: Record<string, string> = {};
          for (const [field, messages] of Object.entries(validation.errors)) {
            mapped[field] = messages[0] ?? '';
          }
          setFieldErrors(mapped);
        } else {
          setGeneralError(err.userMessage(t('requestFailed'), t('serverError')));
        }
      } else {
        setGeneralError(t('networkError'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={t('forgotPasswordTitle')} subtitle={t('forgotPasswordSubtitle')}>
      {success && (
        <div
          className="mb-6 border-s-2 border-brass bg-brass/5 px-4 py-3 text-sm text-ink"
          role="status"
        >
          {success}
        </div>
      )}

      {generalError && (
        <div
          className="mb-6 border-s-2 border-brick bg-brick/5 px-4 py-3 text-sm text-brick"
          role="alert"
        >
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          id="email"
          label={t('email')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brass py-2.5 text-sm font-medium text-white transition hover:bg-brass-hover disabled:opacity-60"
        >
          {submitting ? t('sending') : t('sendResetLink')}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/60">
        <Link to="/login" className="text-brass hover:underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({
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
        className={`mt-1.5 w-full border bg-paper px-3 py-2 text-sm outline-none transition focus:border-brass ${
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

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-paper animate-fade-rise">
      <div className="bg-ink text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-[0.2em]">{t('appName')}</h1>
            <p className="text-xs text-white/60">{t('appTagline')}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="border border-ink/15 bg-white px-6 py-8 sm:px-8">
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink/60">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
