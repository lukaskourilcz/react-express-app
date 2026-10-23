// The mobile drawer after UX audit shell-public-15: two labelled groups and
// the appearance and sound toggles pinned to its bottom, while the footer's
// pair hides below the nav breakpoint so the toggles live in one place. The
// browser spec (tests/browser/navigation.spec.ts) opens the drawer itself.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addSheet, declared, mediaRules } from './css';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

describe('the mobile drawer', () => {
  const sheet = addSheet('appShell');
  const top = [...sheet.cssRules].filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);

  it('splits Practice from You in the desktop header’s order', () => {
    expect(app).toMatch(/const DRAWER_YOU_ROUTES = \['\/roadmap', '\/collection', '\/leaderboard', '\/shop', '\/premium'\];/);
    expect(app).toMatch(/className="ss-drawer-group" role="group" aria-labelledby=/);
    expect(declared(top, '.ss-drawer-group + .ss-drawer-group', 'border-top')).toBe('1px solid var(--color-border)');
  });

  it('pins the toggles to the bottom as 44px rows and hides the footer pair below 1024px', () => {
    expect(app).toMatch(/<DrawerSettings \/>/);
    expect(declared(top, '.ss-drawer-settings', 'margin-top')).toBe('auto');
    expect(declared(top, '.ss-drawer-settings .ss-drawer-link', 'min-height')).toBe('var(--ss-control-height)');
    expect(declared(mediaRules(sheet, 'max-width: 1023px'), '.ss-footer-settings', 'display')).toBe('none');
  });
});
