// Profile card actions share one height (UX audit social-account-06): every
// card action is the default Astryx size, which the shared control floor
// (app-shell.css) holds at 44px on every pointer. Connect GitHub, the only
// primary in its card, used to be the smallest button on the page (28px).
// A small in-row utility (Retry inside a banner) may stay size="sm".
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(`../src/components/${path}`, import.meta.url), 'utf8');

/** Every <Button …> opening tag in a file, attributes included. */
const buttons = (code: string) => code.match(/<Button\b[^>]*?\/?>/gs) ?? [];

describe('Profile card actions', () => {
  it.each(['coding/GithubGardenCard.tsx', 'SharknameCard.tsx', 'paths/LearningPathsCard.tsx'])(
    '%s sizes no card action below the default',
    (file) => {
      const small = buttons(source(file)).filter((tag) => /size="sm"/.test(tag));
      // Only the banner's Retry, an in-row utility, stays small.
      expect(small.every((tag) => tag.includes("t('quiz.retry')"))).toBe(true);
    },
  );

  it('keeps the account actions at the default size', () => {
    const tags = buttons(source('Profile.tsx'));
    const account = tags.filter((tag) => /profile\.(signOutEverywhere|deleteAction)/.test(tag));
    expect(account).toHaveLength(2);
    account.forEach((tag) => expect(tag).not.toMatch(/size=/));
  });

  it('holds every Astryx button at the shared 44px control height on every pointer', () => {
    const shell = readFileSync(new URL('../src/styles/app-shell.css', import.meta.url), 'utf8');
    expect(shell).toMatch(/\.astryx-button,\s*\.astryx-segmented-control-item \{\s*min-height: var\(--ss-control-height\) !important;/);
  });
});
