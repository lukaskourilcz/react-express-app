// The contract between react-isolated.ts, which runs in the API, and the guest
// runner (scripts/react-sandbox-entry.ts, bundled to
// lib/coding/generated/react-sandbox.cjs), which grades one React submission
// inside a disposable VM. It lives apart from both so the launch contracts can
// start the real guest bundle with the same flags and read its output by the
// same rules, without the Sandbox SDK.
import type { ReactSuiteOutcome } from './react-runner';
import { suiteCaseCount } from './react-hidden';

/** Node flags for the guest. With code generation from strings disallowed, a
 * host function the component reaches through jsdom or React cannot compile
 * `return process` through its `.constructor`; the page realm itself already
 * refuses `eval` and `Function(...)` (lib/coding/react-runner.ts). */
export const GUEST_NODE_FLAGS = ['--max-old-space-size=256', '--disallow-code-generation-from-strings'];

/** What the guest reads from its input file, then deletes before learner code runs. */
export interface GuestInput {
  suite: string;
  appSource: string;
  nonce: string;
}

/** The line that carries the result: the nonce, one space, the JSON. It
 * starts with a line break, so nothing printed before it can join it. */
export const guestResultLine = (nonce: string, json: string): string => `\n${nonce} ${json}\n`;

/**
 * Reads the verdict out of the guest's stdout. Only a line that starts with
 * this run's nonce counts, and there must be exactly one; the JSON must have
 * the outcome's shape; and a run that compiled must report exactly as many
 * cases as the suite declares (visible and hidden together). Anything else is
 * a runner failure, never a pass. Pass counts are recomputed from the cases.
 */
export function readGuestResult(stdout: string, nonce: string, suite: string): ReactSuiteOutcome {
  const marker = `\n${nonce} `;
  const start = stdout.indexOf(marker);
  if (start < 0 || stdout.indexOf(marker, start + 1) >= 0) throw new Error('React runner printed no result');
  const end = stdout.indexOf('\n', start + marker.length);
  const data = stdout.slice(start + marker.length, end < 0 ? undefined : end);
  if (data.length > 256_000) throw new Error('Invalid React runner response');
  const result = JSON.parse(data) as ReactSuiteOutcome;
  if (
    !result ||
    !Array.isArray(result.cases) ||
    result.cases.length > 500 ||
    !result.cases.every(
      (one) =>
        one &&
        typeof one.name === 'string' &&
        (one.status === 'pass' || one.status === 'fail') &&
        (one.error === null || typeof one.error === 'string'),
    ) ||
    typeof result.timedOut !== 'boolean' ||
    (result.compileError !== null && typeof result.compileError !== 'string')
  ) {
    throw new Error('Malformed React runner response');
  }
  // A run that compiled reports every case the suite declares, and no others.
  if (result.compileError === null && result.cases.length !== suiteCaseCount(suite)) {
    throw new Error('React runner reported the wrong number of cases');
  }
  const passed = result.cases.filter((one) => one.status === 'pass').length;
  return {
    ...result,
    passed,
    total: Math.max(1, result.cases.length),
    failed: Math.max(1, result.cases.length) - passed,
  };
}
