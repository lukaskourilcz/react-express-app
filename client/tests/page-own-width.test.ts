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

  it('gives the Leaderboard figures fixed 96px columns so the name takes the rest (social-account-02)', () => {
    expect(rule(source('components/Leaderboard.css'), '.lb-col-num')).toContain('width: 96px');
  });
});
