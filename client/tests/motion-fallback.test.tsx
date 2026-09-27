// Motion's features chunk (lib/motion.tsx). When it did not load, every `m`
// element stayed at its initial opacity 0, and the page with it, under a
// working header. A failed load now marks the document, and app-shell.css
// shows each `m` element as its animation ends.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LazyMotion } from 'motion/react';
import { reportError } from '../src/lib/sentry';
import { loadMotionFeatures, m, MotionItem } from '../src/lib/motion';

vi.mock('../src/lib/sentry', () => ({ reportError: vi.fn(), initSentry: vi.fn() }));

afterEach(() => {
  vi.mocked(reportError).mockClear();
  delete document.documentElement.dataset.motion;
});

const chunkError = (name: string) => new TypeError(`Failed to fetch dynamically imported module: http://localhost:3000/assets/${name}.js`);

describe('Motion’s features chunk', () => {
  it('marks the document when it does not load, reports once, and never rejects', async () => {
    const settled = vi.fn();
    void loadMotionFeatures(() => Promise.reject(chunkError('motion-features-AAAA'))).then(settled, settled);
    await vi.waitFor(() => expect(document.documentElement.dataset.motion).toBe('off'));
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(expect.any(TypeError), expect.objectContaining({ chunkLoad: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).not.toHaveBeenCalled();
  });

  it('leaves the document alone when it loads', async () => {
    const features = await loadMotionFeatures(() => import('../src/lib/motion-features').then((mod) => mod.default));
    expect(features).toBeTruthy();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it('gives every m element the data-m attribute app-shell.css shows them by', async () => {
    await act(async () => {
      render(
        <LazyMotion features={() => loadMotionFeatures(() => Promise.reject(chunkError('motion-features-BBBB')))} strict>
          <m.div data-testid="box" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>the page</m.div>
          <MotionItem>an item</MotionItem>
        </LazyMotion>,
      );
    });
    await vi.waitFor(() => expect(document.documentElement.dataset.motion).toBe('off'));
    const box = screen.getByTestId('box');
    expect(box).toHaveAttribute('data-m');
    // Held at its initial style, as Motion leaves it without its features;
    // the stylesheet is what shows it (tests/browser/route-errors.spec.ts).
    expect(box.style.opacity).toBe('0');
    expect(screen.getByText('an item')).toHaveAttribute('data-m');
  });
});
