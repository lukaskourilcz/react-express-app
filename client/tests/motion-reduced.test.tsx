// With reduced motion asked for when the page opens, Motion's 14 KB feature
// chunk is not loaded at all (perf baseline #587 C18): every `m` element shows
// at once through the stylesheet rule a failed load uses, and an exiting one
// leaves at once.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { AnimatePresence, LazyMotion } from 'motion/react';
import { m, motionFeaturesFor, MotionProvider } from '../src/lib/motion';

vi.mock('../src/lib/sentry', () => ({ reportError: vi.fn(), initSentry: vi.fn() }));

afterEach(() => {
  delete document.documentElement.dataset.motion;
});

describe('Motion with reduced motion', () => {
  it('loads no features and marks the document, so the stylesheet shows every element', async () => {
    const load = vi.fn(() => import('../src/lib/motion-features').then((mod) => mod.default));
    const settled = vi.fn();
    void motionFeaturesFor(true, load).then(settled, settled);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(load).not.toHaveBeenCalled();
    expect(settled).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.motion).toBe('off');
  });

  it('loads the features as before without it', async () => {
    const load = vi.fn(() => import('../src/lib/motion-features').then((mod) => mod.default));
    await expect(motionFeaturesFor(false, load)).resolves.toBeTruthy();
    expect(load).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it('reads the preference as the provider mounts', async () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)', media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
    }) as MediaQueryList);
    await act(async () => {
      render(<MotionProvider><m.div data-testid="box" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>page</m.div></MotionProvider>);
    });
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(document.documentElement.dataset.motion).toBe('off');
    expect(screen.getByTestId('box')).toHaveAttribute('data-m');
  });

  it('removes an exiting element at once and still says its exit is complete', async () => {
    const exited = vi.fn();
    let hide = () => {};
    function Toast() {
      const [shown, setShown] = useState(true);
      hide = () => setShown(false);
      return (
        <AnimatePresence onExitComplete={exited}>
          {shown && <m.div key="toast" data-testid="toast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>XP</m.div>}
        </AnimatePresence>
      );
    }
    await act(async () => {
      render(<LazyMotion features={() => motionFeaturesFor(true)} strict><Toast /></LazyMotion>);
    });
    expect(screen.getByTestId('toast')).toBeInTheDocument();
    await act(async () => hide());
    expect(screen.queryByTestId('toast')).toBeNull();
    expect(exited).toHaveBeenCalledTimes(1);
  });
});
