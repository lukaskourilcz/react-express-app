/** Server-only reference solutions and hidden assertions for the FDE
 * diagnostic. Never imported from client code, and never from `../catalog`.
 *
 * Both activities hand the learner working-looking code that is already
 * broken, so the hidden assertions target the half-fix: the loop bound
 * corrected while the caller's array is still written into, the copy made
 * while the last page is still dropped, and a narrowing repaired for the
 * rejected state alone. The type assertions guard the other shortcut —
 * widening the parameter until the compiler stops objecting. */

import type { PathCodeSolution } from '../types';

export const FDE_DIAGNOSTIC_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-diagnostic-debug-js': {
    solution: [
      'const collectAll = async (fetchPage, known) => {',
      '  const out = [...known];',
      '  const first = await fetchPage(1);',
      '  out.push(...first.items);',
      '',
      '  let page = 2;',
      '  while (page <= first.pageCount) {',
      '    const next = await fetchPage(page);',
      '    out.push(...next.items);',
      '    page += 1;',
      '  }',
      '',
      '  return out;',
      '};',
    ].join('\n'),
    hiddenTests: [
      {
        call: "__collect([['a'], ['b'], ['c'], ['d'], ['e'], ['f']], []).then(function (r) { return r.result; })",
        expected: ['a', 'b', 'c', 'd', 'e', 'f'],
        async: true,
      },
      {
        call: "__collect([['a'], ['b', 'c', 'd']], []).then(function (r) { return r.result; })",
        expected: ['a', 'b', 'c', 'd'],
        async: true,
      },
      {
        call: "__collect([['a'], ['b'], ['c']], []).then(function (r) { return r.requested; })",
        expected: [1, 2, 3],
        async: true,
      },
      {
        call: "__collect([[], ['b'], []], ['x']).then(function (r) { return r.result; })",
        expected: ['x', 'b'],
        async: true,
      },
      {
        call: "__collect([['a'], ['b']], ['x', 'y']).then(function (r) { return r.callerUnchanged; })",
        expected: true,
        async: true,
        criterion: 'no-mutation',
      },
      {
        call: "__collect([['a'], ['b']], ['x', 'y']).then(function (r) { return r.sameArray; })",
        expected: false,
        async: true,
        criterion: 'no-mutation',
      },
      {
        call: "__collect([['a', 'b']], ['x']).then(function (r) { return r.callerUnchanged && r.result.length === 3; })",
        expected: true,
        async: true,
        criterion: 'no-mutation',
      },
    ],
  },
  'fde-v1-diagnostic-debug-ts': {
    solution: [
      "type SyncOutcome =",
      "  | { state: 'applied'; recordId: string }",
      "  | { state: 'queued'; recordId: string; retryAfterMs: number }",
      "  | { state: 'rejected'; recordId: string; error: string };",
      '',
      'const describeOutcome = (outcome: SyncOutcome): string => {',
      "  if (outcome.state === 'applied') {",
      "    return 'applied ' + outcome.recordId;",
      '  }',
      '',
      "  if (outcome.state === 'queued') {",
      "    return 'queued ' + outcome.recordId + ' in ' + outcome.retryAfterMs + 'ms';",
      '  }',
      '',
      "  return 'rejected ' + outcome.recordId + ': ' + outcome.error;",
      '};',
    ].join('\n'),
    hiddenTests: [
      {
        call: "describeOutcome({ state: 'queued', recordId: 'q-1', retryAfterMs: 1500 })",
        expected: 'queued q-1 in 1500ms',
      },
      {
        call: "describeOutcome({ state: 'rejected', recordId: 'x-9', error: 'CROSS_TENANT' })",
        expected: 'rejected x-9: CROSS_TENANT',
        criterion: 'discriminant',
      },
      {
        call: "[{ state: 'rejected', recordId: 'a', error: 'E1' }, { state: 'queued', recordId: 'b', retryAfterMs: 10 }, { state: 'applied', recordId: 'c' }].map(function (one) { return describeOutcome(one); })",
        expected: ['rejected a: E1', 'queued b in 10ms', 'applied c'],
        criterion: 'discriminant',
      },
      {
        call: "describeOutcome({ state: 'applied', recordId: 'r-10', error: 'LEFTOVER' })",
        expected: 'applied r-10',
        criterion: 'discriminant',
      },
      {
        call: "typeof describeOutcome({ state: 'rejected', recordId: 'r-11', error: 'BAD_REQUEST' })",
        expected: 'string',
      },
      {
        call: "describeOutcome({ state: 'queued', recordId: 'r-12', retryAfterMs: 250 }) === describeOutcome({ state: 'queued', recordId: 'r-12', retryAfterMs: 400 })",
        expected: false,
      },
    ],
    hiddenTypeTests: [
      {
        code: "const __hidden1: string = describeOutcome({ state: 'rejected', recordId: 'r-1', error: 'E' });",
        label: 'a rejected outcome describes to text',
      },
      {
        code: "const __hidden2: string = describeOutcome({ state: 'queued', recordId: 'r-2', retryAfterMs: 10 });",
        label: 'a queued outcome describes to text',
      },
      {
        code: "describeOutcome({ recordId: 'r-3' });",
        label: 'an outcome without a state is not a SyncOutcome',
        rejects: true,
      },
      {
        code: "describeOutcome('applied');",
        label: 'a bare string is not a SyncOutcome',
        rejects: true,
      },
      {
        code: "describeOutcome({ state: 'applied', recordId: 'r-4', retryAfterMs: 10 });",
        label: 'an applied outcome carries no retry delay',
        rejects: true,
      },
    ],
  },
};
