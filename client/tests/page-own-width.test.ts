// A page never sets its own page max-width (UX audit U1, #573): the route shell
// picks one width per route (components/ui/pageWidth.ts) and the page fills it.
// These pages used to cap themselves at 1080px or 1200px, or took 1000px only
// when another page had loaded DeepEndScreens.css first.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  if (!match) throw new Error(`no rule for ${selector}`);
  return match[1].replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('pages fill the route width', () => {
  it('/shop has no width cap of its own (money-01)', () => {
    const shop = source('components/Shop.tsx');
    expect(shop).not.toMatch(/maxWidth=\{1080\}/);
  });

  it('/leaderboard fills the route column without relying on DeepEndScreens.css (social-account-02)', () => {
    const board = source('components/Leaderboard.tsx');
    expect(board).toContain('<div className="lb">');
    const lb = rule(source('components/Leaderboard.css'), '.lb');
    expect(lb).toContain('width: 100%');
    expect(lb).not.toMatch(/max-width/);
  });

  it('/collection and /cards: the page and the deck fill the route column, one width on both routes (social-account-05)', () => {
    const page = rule(source('coding/Coding.css'), '.cd-page');
    expect(page).toContain('width: 100%');
    expect(page).not.toMatch(/max-width/);
    const deck = rule(source('components/SharkCards.css'), '.sc-deck');
    expect(deck).toContain('width: 100%');
    expect(deck).not.toMatch(/max-width/);
    expect(source('components/Flashcards.tsx')).toContain('<div className="sc-deck">');
  });

  it('the shared .de-page fills the route width, so /profile and /play take the standard width from the shell (social-account-01)', () => {
    const dePage = rule(source('components/DeepEndScreens.css'), '.de-page');
    expect(dePage).toContain('width:100%');
    expect(dePage).not.toMatch(/max-width/);
    expect(source('components/Profile.tsx')).not.toMatch(/maxWidth: 1000/);
  });

  it('the Play lobby and its gates use the shared 640px task column, not 620 or 480px (social-account-01)', () => {
    const play = source('components/Play.tsx');
    expect(play).not.toMatch(/maxWidth: (480|620)\b/);
    expect(play).toMatch(/maxWidth: 'var\(--ss-width-task\)'/);
  });

  it('the Shark Card sign-in, empty and error states use the same 640px task column, not 560 or 520px (social-account-01)', () => {
    expect(rule(source('components/SharkCards.css'), '.sc-state')).toContain('max-width: var(--ss-width-task)');
    const cards = source('components/Flashcards.tsx');
    expect(cards).not.toMatch(/maxWidth: 520\b/);
    expect(cards).toContain("maxWidth: 'var(--ss-width-task)'");
  });

  it('gives the Leaderboard figures fixed 96px columns so the name takes the rest (social-account-02)', () => {
    expect(rule(source('components/Leaderboard.css'), '.lb-col-num')).toContain('width: 96px');
  });
});
