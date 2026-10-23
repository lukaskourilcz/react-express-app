import { expect, it } from 'vitest';
import { codingListCopy, codingListEn } from '../src/i18n/translations.codingLists';
import { en } from '../src/i18n/translations';

// The Coding lists' copy lives beside the shell dictionary, not in it, so the
// first load stays at its budget; it must neither repeat a shell key nor lose
// a placeholder.
it('fills placeholders as t() does and shares no key with the shell dictionary', () => {
  expect(codingListCopy('coding.evolving.showAll', { n: 10 })).toBe('Show all 10 challenges');
  expect(codingListCopy('premium.projectsRule', { stages: '1, 2 and 3' })).toBe('Stages 1, 2 and 3 of every project come with the free plan. Premium opens the rest.');
  expect(codingListCopy('premium.projectsRule')).toContain('{stages}');
  for (const key of Object.keys(codingListEn)) expect(key in en, key).toBe(false);
});
