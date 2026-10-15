import assert from 'node:assert/strict';
import { runChecks } from '../lib/coding/sandbox';
import { SORT_PARITY_CASES } from './fixtures/coding-sort';

export async function sortParityReport() {
  const code = `const cases={${SORT_PARITY_CASES.map(test => `${JSON.stringify(test.id)}:()=>(${test.expression})`).join(',')}};const inspect=id=>cases[id]();`;
  const tests = SORT_PARITY_CASES.map(test => ({
    call: `inspect(${JSON.stringify(test.id)})`,
    // Fixed, checked-in test expressions only; no learner text runs on the host.
    expected: Function('"use strict";return (' + test.expression + ');')(),
  }));
  const result = await runChecks({ code, visible: tests, hidden: [], shuffle: list => [...list] });
  return { node: process.version, codeError: result.visible.codeError,
    cases: SORT_PARITY_CASES.map((test, index) => ({ id: test.id, expected: tests[index].expected, ...result.visible.results[index] })) };
}

export async function checkSortParity() {
  const report = await sortParityReport();
  assert.equal(report.codeError, null, 'sort parity program compiles');
  assert.equal(report.cases.length, 37);
  for (const row of report.cases) assert.equal(row.pass, true, row.id + ': ' + JSON.stringify(row));
  console.log('PASS integrity: 37 Node/worker sort cases, including frozen writeback, sparse/proxy/accessor effects and zero/singleton compatibility');
}
