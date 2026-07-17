import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { en, type TranslationKey } from './translations';
import { readString, writeString } from '../lib/storage';

export type Lang = 'en' | 'cs';

const STORAGE_KEY = 'devquiz.lang';

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = readString(STORAGE_KEY);
  if (stored === 'cs' || stored === 'en') return stored;
  return navigator.language?.toLowerCase().startsWith('cs') ? 'cs' : 'en';
}

/**
 * Snapshot of the persisted UI language for code that runs outside the React
 * tree (error boundaries, api-layer error strings). Not reactive — components
 * should use useLanguage()/useT() instead.
 */
export function getStoredLang(): Lang {
  return detectInitialLang();
}

/**
 * Non-reactive translation for code outside the React tree (error boundaries,
 * the api layer) — same dictionaries as useT(), resolved via the persisted
 * language. Before the lazy Czech table has loaded it falls back to English,
 * the same graceful degradation the provider applies.
 */
export function translateStatic(key: TranslationKey, vars?: Vars): string {
  const table = getStoredLang() === 'cs' && csCache ? csCache : en;
  return interpolate(table[key] ?? en[key] ?? key, vars);
}

type Vars = Record<string, string | number>;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

// Czech is loaded on demand so EN-only sessions (the majority) don't pay the
// ~15-20 KB gzip cost of the cs dictionary on first paint. Cached once fetched.
let csCache: Record<TranslationKey, string> | null = null;
let csInflight: Promise<Record<TranslationKey, string>> | null = null;

function loadCs(): Promise<Record<TranslationKey, string>> {
  if (csCache) return Promise.resolve(csCache);
  if (csInflight) return csInflight;
  csInflight = import('./translations.cs').then((mod) => {
    csCache = mod.cs;
    csInflight = null;
    return csCache;
  });
  return csInflight;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);
  // Track whether the cs dictionary has finished loading so a re-render
  // happens once translations become available (otherwise the first paint
  // after switching shows English fallbacks).
  const [csReady, setCsReady] = useState(() => csCache !== null || detectInitialLang() === 'en');

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (lang === 'cs' && !csCache) {
      void loadCs().then(() => setCsReady(true));
    } else if (lang === 'en') {
      setCsReady(true);
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writeString(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Vars): string => {
      const table = lang === 'cs' && csCache ? csCache : en;
      const value = table[key] ?? en[key] ?? key;
      return interpolate(value, vars);
    },
    // Re-bind t when cs finishes loading so consumers re-render with localized strings.
    [lang, csReady],
  );

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}

// Convenience hook for components that only need the translate function.
export function useT(): LanguageContextValue['t'] {
  return useLanguage().t;
}
