import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, resetPassword } from '@/api/client';
import { AuthAlert, AuthField, AuthSubmitButton } from '@/components/auth/AuthField';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useLocale } from '@/i18n/LocaleContext';

export function ResetPasswordPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const emailFromQuery = searchParams.get('email') ?? '';

  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const missingToken = useMemo(() => !token, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await resetPassword({
        email: email.trim(),
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
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
    <AuthLayout title={t('resetPasswordTitle')} subtitle={t('resetPasswordSubtitle')}>
      {missingToken && <AuthAlert>{t('resetTokenMissing')}</AuthAlert>}
      {success && <AuthAlert variant="success">{success}</AuthAlert>}
      {generalError && <AuthAlert>{generalError}</AuthAlert>}

      {!missingToken && !success && (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <AuthField
            id="email"
            label={t('email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
          />
          <AuthField
            id="password"
            label={t('newPassword')}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
          />
          <AuthField
            id="password_confirmation"
            label={t('confirmPassword')}
            type="password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={setPasswordConfirmation}
            error={fieldErrors.password_confirmation}
          />

          <AuthSubmitButton disabled={submitting}>
            {submitting ? t('saving') : t('resetPasswordAction')}
          </AuthSubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink/60">
        <Link to="/login" className="text-brass hover:underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </AuthLayout>
  );
}
