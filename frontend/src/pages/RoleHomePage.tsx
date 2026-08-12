import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/auth/AuthContext';
import { useLocale } from '@/i18n/LocaleContext';

interface RoleHomeProps {
  titleKey: 'placeholderStudent' | 'placeholderInstructor' | 'placeholderAdmin' | 'placeholderPlatform';
}

export function RoleHomePage({ titleKey }: RoleHomeProps) {
  const { user } = useAuth();
  const { t } = useLocale();

  return (
    <AppShell title={t('welcomeBack')}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('welcomeBack')}</h1>
          {user && (
            <p className="mt-1 text-ink/70">
              {user.name}{' '}
              <span className="font-mono text-sm text-ink/50">({user.email})</span>
            </p>
          )}
        </div>

        <div className="border border-ink/10 bg-white p-5">
          <h2 className="text-sm font-medium text-ink/80">{t('tenantContext')}</h2>
          <p className="mt-2 text-sm text-ink/60">
            {user?.tenant_id != null
              ? t('tenantActive', { id: user.tenant_id })
              : t('platformScope')}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-ink/70">{t(titleKey)}</p>

        {/* Term ledger preview stub — shared visual anchor for future dashboards */}
        <div className="border border-ink/10 bg-white p-4">
          <div className="mb-2 flex justify-between text-xs text-ink/50">
            <span>Term ledger</span>
            <span className="font-mono">Wk 6 / 16</span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 ${i < 6 ? 'bg-sage/70' : i === 6 ? 'bg-brass' : 'bg-ink/10'}`}
                title={`Week ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
