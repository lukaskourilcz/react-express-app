// The Learn page's section layout rules from the UX audit (U4, #576), read
// from Roadmap.css. jsdom applies no @media block, so the rules inside one are
// read from the sheet (tests/css.ts).
import { describe, expect, it } from 'vitest';
import { addSheet, declared, mediaRules } from './css';
import { railColumns } from '../src/components/learn/SectionRail';

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
    // The visitor's device-only note runs the row's width (learn-01).
    expect(declared(wide, '.rm-section-note', 'max-width')).toBe('none');
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

describe('the topic rail (learn-07)', () => {
  it('fits at most five tiles a row in the 800px column, in even rows, and two on a phone', () => {
    const sheet = addSheet('roadmap');
    // The column count comes from SectionRail (--rm-rail-cols, railColumns);
    // a tile is never narrower than 148px.
    expect(declared(topRules(sheet), '.rm-topic-rail', 'grid-template-columns')).toBe(
      'repeat(auto-fill, minmax(max(148px, calc((100% - (var(--rm-rail-cols, 5) - 1) * 10px) / var(--rm-rail-cols, 5) - 1px)), 1fr))',
    );
    // No narrower override: 148px tiles give two columns at 360px and 390px.
    expect(declared(mediaRules(sheet, 'max-width'), '.rm-topic-rail', 'grid-template-columns')).toBe('');
  });

  it('shares the tiles evenly across the rows five a row needs', () => {
    expect([10, 9, 8, 7, 6, 5, 4, 3, 11].map(railColumns)).toEqual([5, 5, 4, 4, 3, 5, 4, 3, 4]);
    expect(railColumns(0)).toBe(5);
  });

  it('marks a locked tile with its lock glyph only, not a dashed edge or a fade', () => {
    const rules = topRules(addSheet('roadmap'));
    expect(declared(rules, ".rm-topic-pill[data-locked='true']", 'border-style')).toBe('');
    expect(declared(rules, ".rm-topic-pill[data-locked='true']", 'opacity')).toBe('');
    expect(declared(rules, '.rm-topic-progress .ss-premium-label', 'text-transform')).toBe('none');
  });
});

describe('a section with nothing open (learn-09)', () => {
  it('sits in the column on its left edge, with no card of its own', () => {
    const rules = topRules(addSheet('roadmap'));
    expect(declared(rules, '.rm-section-empty', 'max-width')).toBe('');
    expect(declared(rules, '.rm-section-empty', 'border')).toBe('');
    expect(declared(rules, '.rm-section-empty', 'background-color')).toBe('');
    expect(declared(rules, '.rm-section-empty', 'margin-left')).toBe('0px');
    expect(declared(rules, '.rm-section-empty__actions', 'display')).toBe('flex');
  });
});

describe('the next-step card (learn-06)', () => {
  it('is one 72px row with a 4px bar at the text\'s width', () => {
    const sheet = addSheet('roadmap');
    const rules = topRules(sheet);
    expect(declared(rules, '.rm-overview-card', 'min-height')).toBe('72px');
    expect(declared(rules, '.rm-overview-card', 'padding')).toBe('14px 20px');
    expect(declared(rules, '.rm-overview-progress', 'height')).toBe('4px');
    expect(declared(rules, '.rm-overview-progress', 'width')).toBe('100%');
    // On a phone Continue takes its own full-width row.
    const phone = mediaRules(sheet, 'max-width: 560px');
    expect(declared(phone, '.rm-overview-card', 'flex-wrap')).toBe('wrap');
    expect(declared(phone, '.rm-overview-card > .ss-swim-cta', 'flex')).toBe('1 0 100%');
  });
});
