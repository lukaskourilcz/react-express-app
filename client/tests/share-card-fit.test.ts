// The FDE completion card lists each competency with its counts. A long name
// once ran past its column and the ellipsis hid the counts (B14 visual QA,
// #510): only the name may shorten.
import { describe, expect, it } from 'vitest';
import { fitLabel } from '../src/lib/shareCard';

// Ten pixels per character, so widths are predictable.
const ctx = { measureText: (text: string) => ({ width: text.length * 10 }) as TextMetrics };

describe('fitLabel', () => {
  it('keeps a short label and its figures unchanged', () => {
    expect(fitLabel(ctx, 'Evaluation', ': 3 / 3 / 6', 450)).toBe('Evaluation: 3 / 3 / 6');
  });

  it('shortens only the label, so the figures always show whole', () => {
    const line = fitLabel(ctx, 'Deployment in the customer’s environment', ': 2 / 5 / 7', 450);
    expect(line.endsWith('…: 2 / 5 / 7')).toBe(true);
    expect(line.length * 10).toBeLessThanOrEqual(450);
  });
});
