import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORY_OPTIONS, contrastRatio, textOnColor } from '../src/lib/categories';

// P1.3 (docs/design/product-ux-audit.md): text on a coloured fill must reach
// WCAG AA's 4.5:1 in both themes, so no fill may carry a fixed white label.

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const CHECKPOINT_GOLD = '#f5a623';
// The score badges on /dev: DevQuestions' SCORE_COLOR and DevTriage's meanColor.
const DEV_SCORE_FILLS = ['#c62828', '#ef6c00', '#f9a825', '#2e7d32', '#558b2f', '#1b5e20'];

describe('text on a coloured fill', () => {
  it('reaches 4.5:1 on every category colour, the checkpoint gold and the dev score colours', () => {
    const fills = [...CATEGORY_OPTIONS.map((category) => category.color), CHECKPOINT_GOLD, ...DEV_SCORE_FILLS];
    for (const fill of fills) {
      expect(contrastRatio(fill, textOnColor(fill)), fill).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps white where white reads and uses the ocean ink on light fills', () => {
    expect(textOnColor('#264de4')).toBe('#fff'); // CSS blue
    expect(textOnColor('#f7df1e')).toBe('#0b141b'); // JavaScript yellow
    expect(textOnColor('#e34c26')).toBe('#0b141b'); // HTML orange: 4.71:1, where #1a1a1a gave 4.42:1
    expect(textOnColor(CHECKPOINT_GOLD)).toBe('#0b141b');
    expect(textOnColor('#8b5cf6')).toBe('#000'); // a mid-tone neither white nor the ink reaches 4.5:1 on
  });
});

describe('theme tokens for text on the accent and on success', () => {
  const theme = read('../src/styles/astryx-theme.css');

  it('pairs --brand-on-accent with the accent of each theme', () => {
    expect(theme).toMatch(/:root[^{]*\{[^}]*--brand-on-accent: #ffffff;/);
    expect(theme).toMatch(/:root\[data-theme='dark'\] \{[^}]*--brand-on-accent: #0b141b;/);
    expect(contrastRatio('#2d7a2d', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#4caf50', '#0b141b')).toBeGreaterThanOrEqual(4.5);
  });

  it('pairs --ss-on-success-strong with --ss-success-strong in both themes', () => {
    expect(theme).toContain('--ss-success-strong: light-dark(#166534, #22c55e);');
    expect(theme).toContain('--ss-on-success-strong: light-dark(#ffffff, #0b141b);');
    expect(contrastRatio('#166534', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#22c55e', '#0b141b')).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves no fixed white text colour on the surfaces P1.3 fixed', () => {
    const files = [
      '../src/components/Today.css',
      '../src/components/Roadmap.css',
      '../src/components/DeepEndScreens.css',
      '../src/components/RoadmapTree.tsx',
      '../src/components/XpToaster.tsx',
      '../src/components/dev/DevQuestions.tsx',
      '../src/components/dev/DevTriage.tsx',
    ];
    for (const file of files) {
      expect(read(file), file).not.toMatch(/(?<![-\w])color:\s*['"]?(#fff\b|#ffffff\b|white\b)/i);
    }
  });
});
