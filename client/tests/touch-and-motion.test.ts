// What a phone and a reduced-motion setting get, read from the stylesheets
// themselves: jsdom matches no media query, so the rules inside the
// `(pointer: coarse)` and `(prefers-reduced-motion: reduce)` blocks are
// checked as written. The browser sweeps (check:responsive, routes-axe)
// measure the same screens at phone widths.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addSheet, declared, mediaRules } from './css';

describe('touch targets on a coarse pointer', () => {
  const coarse = mediaRules(addSheet('appShell'), 'pointer: coarse');

  // Measured in the round-3 audit: 40, 36, 31, 28 and 34px.
  it.each([
    ['.rm-node button', 'a Learn map level, locked or Premium'],
    ['.rm-skillcheck-cta', 'the Learn map’s Skill check'],
    ['.rm-part-pill', 'a career roadmap part'],
    ['.lp-module__title a', 'a learning path link on the career roadmap'],
    ['.play-category-chip', 'a Play category chip'],
  ])('raises %s (%s) to 44px', (selector) => {
    expect(declared(coarse, selector, 'min-height')).toBe('44px');
  });

  it('gives a level node 44px of width as well', () => {
    expect(declared(coarse, '.rm-node button', 'min-width')).toBe('44px');
  });

});

// UX audit U1 (#573): one control height on every pointer, set once here and
// in the two tokens, not page by page.
describe('control heights on every pointer', () => {
  const sheet = addSheet('appShell');
  const topLevel = [...sheet.cssRules].filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);
  const fine = mediaRules(sheet, 'pointer: fine');
  const theme = readFileSync(new URL('../src/styles/astryx-theme.css', import.meta.url), 'utf8');

  it.each([
    ['--ss-width-task', '640px'],
    ['--ss-width-narrow', '800px'],
    ['--ss-width-standard', '1000px'],
    ['--ss-width-wide', '1200px'],
    ['--ss-control-height', '44px'],
    ['--ss-control-height-compact', '36px'],
  ])('defines %s as %s in astryx-theme.css', (token, value) => {
    expect(theme).toMatch(new RegExp(`${token}:\\s*${value};`));
  });

  it.each(['.astryx-button', '.astryx-segmented-control-item'])('floors %s at the control height outside any media query', (selector) => {
    expect(declared(topLevel, selector, 'min-height')).toBe('var(--ss-control-height)');
    expect(declared(topLevel, selector, 'min-width')).toBe('var(--ss-control-height)');
  });

  it('keeps !important on the shared floor, the only way past Astryx\u2019s StyleX specificity', () => {
    // jsdom drops the priority of a var() value, so this reads the source.
    const shell = readFileSync(new URL('../src/styles/app-shell.css', import.meta.url), 'utf8');
    expect(shell).toMatch(/\.astryx-button,\n\.astryx-segmented-control-item \{\n  min-height: var\(--ss-control-height\) !important;\n  min-width: var\(--ss-control-height\) !important;/);
  });

  it('raises the text input itself, not only its box, so a click or tap measures 44px', () => {
    expect(declared(topLevel, '.astryx-text-input', 'min-height')).toBe('var(--ss-control-height)');
    expect(declared(topLevel, '.astryx-text-input > input', 'min-height')).toBe('var(--ss-control-height)');
  });

  it('no longer scopes the shared Astryx floor to coarse pointers', () => {
    const coarse = mediaRules(sheet, 'pointer: coarse');
    expect(declared(coarse, '.astryx-button', 'min-height')).toBe('');
    expect(declared(coarse, '.astryx-text-input', 'min-height')).toBe('');
  });

  it('drops toolbar controls inside .ss-compact to 36px on a fine pointer only', () => {
    expect(declared(fine, '.ss-compact .astryx-button', 'min-height')).toBe('var(--ss-control-height-compact)');
    expect(declared(fine, '.ss-compact .astryx-segmented-control-item', 'min-height')).toBe('var(--ss-control-height-compact)');
    expect(declared(topLevel, '.ss-compact .astryx-button', 'min-height')).toBe('');
  });

  it('keeps a 44px hit area around a compact control', () => {
    expect(declared(fine, '.ss-compact .astryx-button::before', 'position')).toBe('absolute');
    expect(declared(fine, '.ss-compact .astryx-button::before', 'inset')).toBe(
      'calc((var(--ss-control-height-compact) - var(--ss-control-height)) / 2)',
    );
  });
});

describe('reduced motion on the Learn map', () => {
  it('stops the current level’s fin as well as the node under it', () => {
    const reduced = mediaRules(addSheet('roadmap'), 'prefers-reduced-motion: reduce');
    expect(declared(reduced, '.rm-bob', 'animation')).toMatch(/^none/);
    expect(declared(reduced, '.rm-current-fin', 'animation')).toMatch(/^none/);
  });
});
