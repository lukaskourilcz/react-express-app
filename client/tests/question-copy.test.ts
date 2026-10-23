// The shared question parts read their words from a lazy dictionary
// (translations.question.ts), and their sizes from tokens in their own
// stylesheet, so the app shell carries neither (docs/quality/bundle-budget.json).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/translations';
import { questionEn, questionText } from '../src/i18n/translations.question';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('question copy and tokens', () => {
  it('keeps every question.* key out of translations.ts', () => {
    expect(Object.keys(en).filter((key) => key.startsWith('question.'))).toEqual([]);
    for (const key of Object.keys(questionEn)) expect(key in en).toBe(false);
  });

  it('fills placeholders as t() does', () => {
    expect(questionText('question.keysHint', { max: 4, verb: 'select', next: 'continue' })).toBe('Press 1–4 to select · Enter to continue');
    expect(questionText('question.difficultyLevel', { level: 3 })).toBe('Difficulty 3');
  });

  it('is never imported by the shell', () => {
    for (const file of ['../src/App.tsx', '../src/main.tsx', '../src/i18n/LanguageContext.tsx', '../src/i18n/translations.ts']) {
      expect(read(file)).not.toMatch(/translations\.question|components\/question/);
    }
    expect(read('../src/styles/astryx-theme.css')).not.toMatch(/--ss-question-|--ss-answer-/);
  });
});
