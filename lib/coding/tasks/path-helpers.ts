/** Helpers for the short paths' task bodies (`paths-*.ts`).
 *
 * English only: the Czech fields stay empty, which the content contract
 * accepts unless `CODING_REQUIRE_CS=1`. */

import type { CallTest, Localized } from '../../../shared/coding-catalog';

export const en = (value: string): Localized => ({ en: value, cs: '' });

/** A visible check. `edge` marks the boundary cases the contract counts. */
export const check = (call: string, expected: unknown, label?: string, edge = false): CallTest => ({
  call,
  expected,
  ...(label ? { label: en(label) } : {}),
  ...(edge ? { edge: true } : {}),
});

const MDN_JS = 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/';

/** A reference into MDN's JavaScript reference, by path under it. */
export const mdn = (title: string, path: string) => ({ title: en(title), url: MDN_JS + path });

/** A reference anywhere else, by full URL. */
export const doc = (title: string, url: string) => ({ title: en(title), url });
