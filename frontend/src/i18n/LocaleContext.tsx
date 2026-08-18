import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { Locale, MessageKey, t } from "@/i18n/messages";

const LOCALE_KEY = "manhaj.locale";

interface LocaleContextValue {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: MessageKey, vars?: Record<string, string | number>) => string;
    dir: "ltr" | "rtl";
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
    const stored = localStorage.getItem(LOCALE_KEY);
    return stored === "ar" ? "ar" : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

    const setLocale = useCallback((next: Locale) => {
        localStorage.setItem(LOCALE_KEY, next);
        setLocaleState(next);
    }, []);

    const dir = locale === "ar" ? "rtl" : "ltr";

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = dir;
    }, [locale, dir]);

    const value = useMemo<LocaleContextValue>(
        () => ({
            locale,
            setLocale,
            dir,
            t: (key, vars) => t(locale, key, vars),
        }),
        [locale, setLocale, dir],
    );

    return (
        <LocaleContext.Provider value={value}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    const ctx = useContext(LocaleContext);

    if (!ctx) {
        throw new Error("useLocale must be used within LocaleProvider");
    }

    return ctx;
}
