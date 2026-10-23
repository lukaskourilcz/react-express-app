// The Learn page's section layout rules from the UX audit (U4, #576), read
// from Roadmap.css. jsdom applies no @media block, so the rules inside one are
// read from the sheet (tests/css.ts).
import { describe, expect, it } from 'vitest';
import { addSheet, declared, mediaRules } from './css';

const topRules = (sheet: CSSStyleSheet) =>
  [...sheet.cssRules].filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);

describe('the section header (learn-08)', () => {
  it('is one row from 768px: the line on the left, the action on the right', () => {
    const wide = mediaRules(addSheet('roadmap'), 'min-width: 768px');
    expect(declared(wide, '.rm-section-header', 'grid-template-columns')).toBe('minmax(0, 1fr) auto');
    expect(declared(wide, '.rm-section-header', 'align-items')).toBe('center');
    expect(declared(wide, '.rm-section-header', 'column-gap')).toBe('24px');
    expect(declared(wide, '.rm-section-line', 'max-width')).toBe('none');
    expect(declared(wide, '.rm-section-action', 'grid-column')).toBe('2');
    // The note, an error and the saved status run under both.
    for (const selector of ['.rm-section-note', '.rm-section-error', '.rm-section-status']) {
      expect(declared(wide, selector, 'grid-column')).toBe('1 / -1');
    }
  });

  it('stays stacked below 768px', () => {
    const base = topRules(addSheet('roadmap'));
    expect(declared(base, '.rm-section-header', 'grid-template-columns')).toBe('');
  });
});

describe('the section switcher on a phone (learn-20)', () => {
  it('is a vertical list of full-width rows under 640px, name left and percent right', () => {
    const narrow = mediaRules(addSheet('roadmap'), 'max-width: 639px');
    expect(declared(narrow, ".rm-section-switcher [role='radiogroup']", 'flex-direction')).toBe('column');
    expect(declared(narrow, ".rm-section-switcher [role='radiogroup']", 'width')).toBe('100%');
    expect(declared(narrow, '.rm-section-switcher .astryx-segmented-control-item', 'width')).toBe('100%');
    expect(declared(narrow, '.rm-switcher-item', 'justify-content')).toBe('space-between');
    expect(declared(narrow, '.rm-switcher-item__sep', 'display')).toBe('none');
  });
});
