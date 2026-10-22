// The FDE completion card lists each competency with its counts. A long name
// once ran past its column and the ellipsis hid the counts (B14 visual QA,
// #510): only the name may shorten.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShareCardFile, fitLabel } from '../src/lib/shareCard';

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

// A 2D context with every drawing call recorded and no `roundRect`, as in
// Safari before 16 and Firefox before 112, which the build still targets.
function fakeContext() {
  const calls: string[] = [];
  const record = (name: string) => () => { calls.push(name); };
  const ctx = new Proxy({ calls } as Record<string, unknown>, {
    get(target, key: string) {
      if (key in target) return target[key];
      if (key === 'roundRect') return undefined;
      if (key === 'measureText') return (text: string) => ({ width: text.length * 10 });
      if (key === 'createLinearGradient') return () => ({ addColorStop: () => {} });
      return record(key);
    },
    set(target, key: string, value) { target[key] = value; return true; },
  });
  return { ctx, calls };
}

describe('createShareCardFile', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('draws the card where the browser has no roundRect', async () => {
    const { ctx, calls } = fakeContext();
    vi.stubGlobal('Path2D', class {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, done: BlobCallback) {
      done(new Blob(['png'], { type: 'image/png' }));
    });
    const file = await createShareCardFile({ brand: 'devShark', label: 'Typing', headline: '62 WPM', detail: '97%', date: '22 October 2026', accent: '#2d7a2d', fileSuffix: 'typing' });
    expect(file?.name).toBe('devshark-typing.png');
    expect(calls).toContain('arcTo');
  });
});
