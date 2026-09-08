/** Server-only reference solution and hidden assertions for FDE M09.
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible assertions of `fde-v1-m09-retry-circuit` prove the happy path,
 * the capped backoff, one non-retryable status and one probe. The hidden ones
 * take the shortcuts they leave open: a failure streak that should have
 * expired with the window, a success that should have cleared it, a 404 and a
 * 500 on either side of the retry rule, a rejection carrying no status at
 * all, a burst of sends against an open circuit, three concurrent sends at
 * half-open, a second base and cap, and two circuits sharing one dependency
 * without sharing state. */

import type { PathCodeSolution } from '../types';

export const FDE_M09_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m09-retry-circuit': {
    solution: `const createCircuit = options => {
  const call = options.call;
  const failureThreshold = options.failureThreshold;
  const windowMs = options.windowMs;
  const cooldownMs = options.cooldownMs;
  const retries = options.retries;
  const baseDelayMs = options.baseDelayMs;
  const maxDelayMs = options.maxDelayMs;

  let phase = 'closed';
  let failures = 0;
  let lastFailureAt = null;
  let openedAt = 0;
  let probeInFlight = false;

  const statusOf = error => (error && typeof error.status === 'number' ? error.status : null);

  const retryable = error => {
    const status = statusOf(error);
    if (status === null) return true;
    if (status === 429) return true;
    return status >= 500;
  };

  const state = () => {
    if (phase === 'open' && Date.now() - openedAt >= cooldownMs) return 'half-open';
    return phase;
  };

  const open = () => {
    phase = 'open';
    openedAt = Date.now();
    failures = 0;
    lastFailureAt = null;
  };

  const recordSuccess = () => {
    phase = 'closed';
    failures = 0;
    lastFailureAt = null;
  };

  const recordFailure = () => {
    const now = Date.now();
    failures = lastFailureAt !== null && now - lastFailureAt > windowMs ? 1 : failures + 1;
    lastFailureAt = now;
    if (failures >= failureThreshold) open();
  };

  const send = async request => {
    const current = state();

    if (current === 'open') return { ok: false, reason: 'circuit-open', attempts: 0 };

    if (current === 'half-open') {
      if (probeInFlight) return { ok: false, reason: 'circuit-open', attempts: 0 };
      probeInFlight = true;
      phase = 'half-open';
      try {
        const value = await call(request);
        probeInFlight = false;
        recordSuccess();
        return { ok: true, value, attempts: 1 };
      } catch (error) {
        probeInFlight = false;
        open();
        return { ok: false, reason: 'failed', status: statusOf(error), attempts: 1 };
      }
    }

    let attempts = 0;
    let lastError = null;
    for (;;) {
      attempts += 1;
      try {
        const value = await call(request);
        recordSuccess();
        return { ok: true, value, attempts };
      } catch (error) {
        lastError = error;
        if (!retryable(error) || attempts > retries) break;
        await sleep(Math.min(baseDelayMs * Math.pow(2, attempts - 1), maxDelayMs));
      }
    }
    recordFailure();
    return { ok: false, reason: 'failed', status: statusOf(lastError), attempts };
  };

  return { send, state };
};`,
    hiddenTests: [
      {
        call:
          "(function () { var d = __dependency('4'); var c = __circuit(d, { windowMs: 1000 }); return __drive(c, 2).then(function () { return sleep(1500); }).then(function () { return c.send({ id: 'R' }); }).then(function () { return { state: c.state(), calls: d.calls.length }; }); })()",
        expected: { state: 'closed', calls: 3 },
        label: 'a failure older than the window restarts the streak instead of continuing it',
        async: true,
      },
      {
        call:
          "(function () { var d = __dependency('44o44'); var c = __circuit(d); return __drive(c, 5).then(function () { return { state: c.state(), calls: d.calls.length }; }); })()",
        expected: { state: 'closed', calls: 5 },
        label: 'a success between failures clears the consecutive count',
        async: true,
      },
      {
        call:
          "(function () { var d = __dependency([404]); var c = __circuit(d); return c.send({ id: 'R' }).then(function (out) { return { status: out.status, attempts: out.attempts, calls: d.calls.length }; }); })()",
        expected: { status: 404, attempts: 1, calls: 1 },
        label: 'a 404 is not retried either',
        async: true,
        criterion: 'no-retry-on-4xx',
      },
      {
        call:
          "(function () { var d = __dependency([500, 'o']); var c = __circuit(d); return c.send({ id: 'R' }).then(function (out) { return { ok: out.ok, attempts: out.attempts }; }); })()",
        expected: { ok: true, attempts: 2 },
        label: 'a 500 is retried and the second attempt succeeds',
        async: true,
        criterion: 'no-retry-on-4xx',
      },
      {
        call:
          "(function () { var d = __dependency('x'); var c = __circuit(d); return c.send({ id: 'R' }).then(function (out) { return { ok: out.ok, reason: out.reason, status: out.status, attempts: out.attempts }; }); })()",
        expected: { ok: false, reason: 'failed', status: null, attempts: 3 },
        label: 'a rejection carrying no status is retryable and reports status null',
        async: true,
      },
      {
        call:
          "(function () { var d = __dependency('4'); var c = __circuit(d); return __drive(c, 3).then(function () { return __drive(c, 5); }).then(function (out) { return { calls: d.calls.length, reasons: out.map(function (one) { return one.reason; }), attempts: out.map(function (one) { return one.attempts; }) }; }); })()",
        expected: {
          calls: 3,
          reasons: ['circuit-open', 'circuit-open', 'circuit-open', 'circuit-open', 'circuit-open'],
          attempts: [0, 0, 0, 0, 0],
        },
        label: 'nothing reaches the dependency for as long as the circuit stays open',
        async: true,
        criterion: 'open-refuses-fast',
      },
      {
        call:
          "(function () { var d = __dependency('444o'); var c = __circuit(d); return __drive(c, 3).then(function () { return sleep(2000); }).then(function () { return Promise.all([c.send({ id: 'A' }), c.send({ id: 'B' }), c.send({ id: 'C' })]); }).then(function (out) { return { calls: d.calls.length, passed: out.filter(function (one) { return one.ok; }).length, refused: out.filter(function (one) { return one.reason === 'circuit-open'; }).length }; }); })()",
        expected: { calls: 4, passed: 1, refused: 2 },
        label: 'three sends at once on a half-open circuit still make exactly one call',
        async: true,
        criterion: 'single-probe',
      },
      {
        call:
          "(function () { var d = __dependency('5'); var c = __circuit(d, { retries: 3, baseDelayMs: 50, maxDelayMs: 120 }); return c.send({ id: 'R' }).then(function () { return __gaps(d); }); })()",
        expected: [0, 50, 100, 120],
        label: 'the cap holds at a different base and ceiling',
        async: true,
      },
    ],
  },
};
