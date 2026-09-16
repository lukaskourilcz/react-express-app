import { describe, expect, it } from 'vitest';
import {
  ACCENT_SOFT_ALPHA,
  accentOnSoft,
  accentSoft,
  accentSoftContrast,
  compositeOver,
  contrastRatio,
} from '../src/lib/contrast';
import { SUBJECTS, SUBJECT_ORDER } from '../src/lib/subjects';

// The accent-on-tint pair is the one place the design system cannot check a
// colour by eye: --brand-accent-soft is composited at runtime from whichever
// subject is active, so "does the chip text pass 4.5:1" has fourteen answers,
// not one. geoShark's orange-700 was 4.34:1 on a white card and failed a real
// axe scan of /profile. These tests are the arithmetic behind the fix, so a
// new subject accent or a nudged brand hex fails here rather than in a manual
// audit months later.

/** WCAG 2.2 AA, 1.4.3 Contrast (Minimum), text below 18.66px bold. */
const AA_SMALL_TEXT = 4.5;

describe('WCAG primitives', () => {
  it('matches the reference ratios for black, white and mid grey', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // #767676 is the canonical "smallest grey that passes on white".
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.55);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#c2410c', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#c2410c'), 10);
  });

  it('composites the soft tint to the value axe measured', () => {
    // axe-core read #f8e8e2 off the failing chip: geography's accent at 12%
    // over a white .ss-panel.
    expect(compositeOver('#c2410c', ACCENT_SOFT_ALPHA, '#ffffff')).toBe('#f8e8e2');
    expect(compositeOver('#c2410c', 0, '#ffffff')).toBe('#ffffff');
    expect(compositeOver('#c2410c', 1, '#ffffff')).toBe('#c2410c');
  });

  it('writes the soft token with the alpha it measures against', () => {
    expect(accentSoft('#c2410c')).toBe('rgba(194, 65, 12, 0.12)');
  });
});

describe('--brand-accent-on-soft', () => {
  it('reproduces the violation: the plain accent misses the bar for some subjects', () => {
    // The regression this fixes. If --brand-accent alone ever cleared 4.5:1
    // for every subject, the derived token would be dead weight — so assert
    // the problem is real before asserting the fix.
    const failing = SUBJECT_ORDER.flatMap((id) => {
      const s = SUBJECTS[id];
      return ([['light', s.accent], ['dark', s.accentBright]] as const)
        .filter(([mode, text]) => accentSoftContrast(text, s.accent, mode) < AA_SMALL_TEXT)
        .map(([mode]) => `${id}/${mode}`);
    });
    expect(failing).toEqual(['webdev/light', 'geography/light', 'math/light', 'biology/light', 'poker/dark']);
  });

  for (const id of SUBJECT_ORDER) {
    const s = SUBJECTS[id];
    for (const [mode, text] of [['light', s.accent], ['dark', s.accentBright]] as const) {
      it(`clears 4.5:1 for ${id} in ${mode} mode`, () => {
        const derived = accentOnSoft(text, s.accent, mode);
        expect(accentSoftContrast(derived, s.accent, mode)).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
      });
    }
  }

  it('leaves an accent that already passes exactly as it is', () => {
    // history and chess never had a problem; their chips must keep their hex.
    expect(accentOnSoft(SUBJECTS.history.accent, SUBJECTS.history.accent, 'light')).toBe(SUBJECTS.history.accent);
    expect(accentOnSoft(SUBJECTS.chess.accent, SUBJECTS.chess.accent, 'light')).toBe(SUBJECTS.chess.accent);
    expect(accentOnSoft(SUBJECTS.poker.accent, SUBJECTS.poker.accent, 'light')).toBe(SUBJECTS.poker.accent);
  });

  it('keeps the accent hue and moves lightness in the readable direction', () => {
    const hue = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === min) return 0;
      const d = max - min;
      if (max === r) return (((g - b) / d + (g < b ? 6 : 0)) / 6) * 360;
      if (max === g) return (((b - r) / d + 2) / 6) * 360;
      return (((r - g) / d + 4) / 6) * 360;
    };
    const lightness = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
    };

    const geo = SUBJECTS.geography;
    const darker = accentOnSoft(geo.accent, geo.accent, 'light');
    // Within one 1/255 rounding step of the source hue: no colour shift the
    // brand did not ask for.
    expect(Math.abs(hue(darker) - hue(geo.accent))).toBeLessThan(1);
    expect(lightness(darker)).toBeLessThan(lightness(geo.accent));

    const poker = SUBJECTS.poker;
    const lighter = accentOnSoft(poker.accentBright, poker.accent, 'dark');
    expect(Math.abs(hue(lighter) - hue(poker.accentBright))).toBeLessThan(1);
    expect(lightness(lighter)).toBeGreaterThan(lightness(poker.accentBright));
  });

  it('moves no further than it has to', () => {
    // A quarter of a step back from the derived lightness must fail, or the
    // walk overshot and the chip is darker than the brand needs.
    for (const id of SUBJECT_ORDER) {
      const s = SUBJECTS[id];
      for (const [mode, text] of [['light', s.accent], ['dark', s.accentBright]] as const) {
        const derived = accentOnSoft(text, s.accent, mode);
        if (derived === text) continue;
        const ratio = accentSoftContrast(derived, s.accent, mode);
        // One 0.5%-lightness step is worth well under 0.2 of a ratio point at
        // these luminances, so a minimal result sits just above the bar.
        expect(ratio).toBeLessThan(AA_SMALL_TEXT + 0.2);
      }
    }
  });

  it('agrees with the pre-paint default baked into reset.css', () => {
    // styles/reset.css hard-codes the Web Dev values so the first paint is not
    // a failing chip. They have to be the same numbers.
    const webdev = SUBJECTS.webdev;
    expect(accentOnSoft(webdev.accent, webdev.accent, 'light')).toBe('#2a712a');
    expect(accentOnSoft(webdev.accentBright, webdev.accent, 'dark')).toBe('#4caf50');
  });
});
