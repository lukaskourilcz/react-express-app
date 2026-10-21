/** Helpers for the short paths' task bodies (`paths-*.ts`). */

import type { CallTest } from '../../../shared/coding-catalog';

/** A visible check. `edge` marks the boundary cases the contract counts. */
export const check = (call: string, expected: unknown, label?: string, edge = false): CallTest => ({
  call,
  expected,
  ...(label ? { label } : {}),
  ...(edge ? { edge: true } : {}),
});

const MDN_JS = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/';

/** A reference into MDN's JavaScript reference, by path under it. */
export const mdn = (title: string, path: string) => ({ title, url: MDN_JS + path });

/** A reference anywhere else, by full URL. */
export const doc = (title: string, url: string) => ({ title, url });
