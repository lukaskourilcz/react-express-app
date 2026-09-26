// A manifest's text in the reader's language. Kept apart from the activity
// views, whose editor and test runner a list that only names paths (the
// roadmap's discovery section, the Profile card) has no use for.
import { useCallback } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Localized, LocalizedList } from '../../../../shared/learning-paths';

export function useLoc() {
  const { lang } = useLanguage();
  return useCallback((value: Localized | undefined) => (value ? (lang === 'cs' ? value.cs || value.en : value.en) : ''), [lang]);
}

export function useLocList() {
  const { lang } = useLanguage();
  return useCallback(
    (value: LocalizedList | undefined): string[] => (value ? (lang === 'cs' && value.cs.length ? value.cs : value.en) : []),
    [lang],
  );
}
