// What a phone and a reduced-motion setting get, read from the stylesheets
// themselves: jsdom matches no media query, so the rules inside the
// `(pointer: coarse)` and `(prefers-reduced-motion: reduce)` blocks are
// checked as written. The browser sweeps (check:responsive, routes-axe)
// measure the same screens at phone widths.
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

  it('raises the text input itself, not only its box, so a tap measures 44px', () => {
    expect(declared(coarse, '.astryx-text-input', 'min-height')).toBe('44px');
    // 42px inside the box's two 1px borders.
    expect(declared(coarse, '.astryx-text-input > input', 'min-height')).toBe('42px');
  });
});

describe('reduced motion on the Learn map', () => {
  it('stops the current level’s fin as well as the node under it', () => {
    const reduced = mediaRules(addSheet('roadmap'), 'prefers-reduced-motion: reduce');
    expect(declared(reduced, '.rm-bob', 'animation')).toMatch(/^none/);
    expect(declared(reduced, '.rm-current-fin', 'animation')).toMatch(/^none/);
  });
});
