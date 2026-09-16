import { useEffect, type RefObject } from 'react';

/**
 * Caps a scrolling list at its first `rows` children by measuring them.
 *
 * Rows in these lists have no fixed height: a Czech label wraps where the
 * English one did not, a failed test carries an extra error line, zoom changes
 * everything. So the cap is measured from the real rows rather than guessed in
 * CSS, and it follows them through a ResizeObserver. The measured height lands
 * in `--row-cap` on the container, which the stylesheet reads as `max-height`.
 *
 * Pass `null` to lift the cap; `key` is anything whose change should trigger a
 * fresh measurement (the number of rows, the run that produced them).
 */
export function useRowCap(ref: RefObject<HTMLElement | null>, rows: number | null, key: unknown): void {
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    if (rows === null) {
      box.style.removeProperty('--row-cap');
      return;
    }
    const list = box.matches('ul, ol') ? box : box.querySelector('ul, ol') ?? box;
    const children = Array.from(list.children).slice(0, rows) as HTMLElement[];
    const first = children[0];
    const last = children[children.length - 1];
    if (!first || !last) return;
    const size = () => {
      const height = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
      box.style.setProperty('--row-cap', `${Math.ceil(height) + 1}px`);
    };
    size();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(size);
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [ref, rows, key]);
}
