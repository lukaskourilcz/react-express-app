import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { en, type TranslationKey } from './translations';
import { readString, writeString } from '../lib/storage';

export type Lang = 'en' | 'cs';

/** The languages the app ships.
 *
 * The product is English-only for now. The Czech dictionary, the question
 * translations and the coding overlays all stay in the repository — they are
 * finished work, and deleting them would mean retranslating from scratch —
 * but nothing offers them to a visitor and nothing requires new copy to be
 * written twice. Putting `'cs'` back in this list is the whole switch: the
 * footer and profile controls reappear, a stored or browser preference is
 * honoured again, and the lazy Czech chunk starts loading on demand.
 *
 * While the list holds one language the Czech chunk is never imported, so it
 * does not reach the browser at all. */
export const ENABLED_LANGS: readonly Lang[] = ['en'];
export const MULTILINGUAL = ENABLED_LANGS.length > 1;
const isEnabled = (value: unknown): value is Lang =>
  typeof value === 'string' && (ENABLED_LANGS as readonly string[]).includes(value);

const STORAGE_KEY = 'devquiz.lang';

function detectInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  // A single shipped language settles it: a stored choice, a prerendered
  // locale and a browser preference are all answers to a question nobody is
  // being asked. The stored value is left alone so it still means something
  // the day the language comes back.
  if (!MULTILINGUAL) return ENABLED_LANGS[0];
  const publicLocale = document.documentElement.dataset.publicLocale;
  if (isEnabled(publicLocale)) return publicLocale;
  const stored = readString(STORAGE_KEY);
  if (isEnabled(stored)) return stored;
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
let csCache: Partial<Record<TranslationKey, string>> | null = null;
let csInflight: Promise<Partial<Record<TranslationKey, string>>> | null = null;

function loadCs(): Promise<Partial<Record<TranslationKey, string>>> {
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
    delete document.documentElement.dataset.publicLocale;
  }, [lang]);

  useEffect(() => {
    if (lang === 'cs' && !csCache) {
      setCsReady(false);
      void loadCs().then(() => setCsReady(true));
    } else if (lang === 'en') {
      setCsReady(true);
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    // A language the build does not ship is ignored rather than half-applied,
    // so a stale deep link or a saved account preference cannot strand a
    // visitor in a dictionary that is not there.
    if (!isEnabled(next)) return;
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
