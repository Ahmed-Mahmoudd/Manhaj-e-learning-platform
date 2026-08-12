import { useLocale } from '@/i18n/LocaleContext';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={`inline-flex rounded border border-white/20 bg-white/5 text-sm ${className}`}
      role="group"
      aria-label="Language"
    >
      {(['en', 'ar'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`px-3 py-1.5 transition-colors ${
            locale === code
              ? 'bg-brass text-white'
              : 'text-white/80 hover:bg-white/10 hover:text-white'
          }`}
        >
          {code === 'en' ? 'EN' : 'ع'}
        </button>
      ))}
    </div>
  );
}
