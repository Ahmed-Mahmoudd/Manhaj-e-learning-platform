import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { homePathForRole } from '@/auth/roles';
import { AuthAlert, AuthField, AuthSubmitButton } from '@/components/auth/AuthField';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useLocale } from '@/i18n/LocaleContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLocale();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setSubmitting(true);

    try {
      const user = await login(email.trim(), password);
      navigate(homePathForRole(user.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const validation = err.validation;
        if (validation?.errors) {
          const mapped: Record<string, string> = {};
          for (const [field, messages] of Object.entries(validation.errors)) {
            mapped[field] = messages[0] ?? '';
          }
          setFieldErrors(mapped);
          if (!Object.keys(mapped).length) {
            setGeneralError(
              err.userMessage(t('credentialsError'), t('serverError')),
            );
          }
        } else {
          setGeneralError(err.userMessage(t('credentialsError'), t('serverError')));
        }
      } else {
        setGeneralError(t('networkError'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={t('signIn')}
      subtitle={t('signInSubtitle')}
      footer={
        import.meta.env.DEV ? (
          <div className="space-y-1 font-mono text-xs text-ink/50">
            <p>{t('demoHint')}</p>
            <p>{t('demoAccounts')}</p>
          </div>
        ) : undefined
      }
    >
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
        <AuthField
          id="password"
          label={t('password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
        />

        <p className="text-end text-sm">
          <Link to="/forgot-password" className="text-brass hover:underline">
            {t('forgotPassword')}
          </Link>
        </p>

        <AuthSubmitButton disabled={submitting}>
          {submitting ? t('signingIn') : t('signIn')}
        </AuthSubmitButton>
      </form>
    </AuthLayout>
  );
}
