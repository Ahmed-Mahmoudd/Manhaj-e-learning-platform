import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, forgotPassword } from '@/api/client';
import { AuthAlert, AuthField, AuthSubmitButton } from '@/components/auth/AuthField';
import { AuthLayout } from '@/components/auth/AuthLayout';
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
    <AuthLayout title={t('forgotPasswordTitle')} subtitle={t('forgotPasswordSubtitle')}>
      {success && <AuthAlert variant="success">{success}</AuthAlert>}
      {generalError && <AuthAlert>{generalError}</AuthAlert>}

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

        <AuthSubmitButton disabled={submitting}>
          {submitting ? t('sending') : t('sendResetLink')}
        </AuthSubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink/60">
        <Link to="/login" className="text-brass hover:underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </AuthLayout>
  );
}
