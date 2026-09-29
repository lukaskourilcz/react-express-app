import { vi } from 'vitest';
import { FIRST_DATA_WAIT_MS } from '../src/lib/routeData';
// What the document held when something first appeared in it.
//
// A page that holds its first render for its data draws everything it waited
// for in that first frame; a page that redraws adds it a moment later. An
// awaited `act` runs every commit before it returns, so the final document
// cannot tell the two apart. The observer can: the data a redraw waits for
// arrives in a later task, and the observer reads the document at the end of
// the task that first drew `selector`.
export function firstDraw<T>(selector: string, read: () => T): () => T | undefined {
  let seen: { value: T } | undefined;
  const observer = new MutationObserver(() => {
    if (seen || !document.querySelector(selector)) return;
    seen = { value: read() };
    observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => seen?.value;
}

/** The headings on the page, in order. */
export const headings = () => [...document.querySelectorAll('h1, h2, h3')].map((heading) => heading.textContent ?? '');

/** Stretch the cap a page holds its first render for (FIRST_DATA_WAIT_MS) for
 * the rest of the test. A check that the page drew its data in the first frame
 * must not depend on the stand-in API answering within 1.2 s on a loaded
 * machine; with the cap stretched, the page still draws once, when its data is
 * in. Vitest restores the spy after the test (`restoreMocks`) or call the
 * returned function. */
export function stretchFirstDataWait(ms = 30_000): () => void {
  const realSetTimeout = window.setTimeout.bind(window);
  const spy = vi.spyOn(window, 'setTimeout').mockImplementation(((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
    realSetTimeout(handler, timeout === FIRST_DATA_WAIT_MS ? ms : timeout, ...args)) as typeof window.setTimeout);
  return () => spy.mockRestore();
}
