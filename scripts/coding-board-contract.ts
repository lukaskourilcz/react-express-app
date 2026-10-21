import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transform } from 'sucrase';
import { CODING_TASKS } from '../lib/coding/catalog';
import { solutionFor } from '../lib/coding/solutions';
import { stripComments } from '../lib/coding/solutions/strip-comments';

export function codingBoardContracts(): void {
  const cases: [string, unknown][] = [
    ['try { throw 1; } catch { /* Keep state usable. */ } return 7;', 7],
    ['if (true) { /* Empty branch. */ } else { /* Also empty. */ } return 8;', 8],
    ['{ /* Standalone block. */ } return 9;', 9],
    ['const value = { /* Empty object. */ }; return Object.keys(value).length;', 0],
    ['const url = "https://example.test/a"; // author note\nreturn url;', 'https://example.test/a'],
    ['return `/* literal */ ${"// value"}`;', '/* literal */ // value'],
    ['return /[/]/.test("/"); /* note */', true],
    ['return /https?:\\/\\//.test("https://example.test");', true],
  ];
  for (const [source, expected] of cases) {
    const stripped = stripComments(source);
    assert.equal(new Function(stripped)(), expected, source);
    assert.equal(stripComments(stripped), stripped, 'comment stripping is idempotent');
  }
  const jsx = stripComments('return <main>{/* Hidden note. */}<span>Visible</span></main>;');
  const compiled = transform(jsx, { transforms: ['jsx'], production: true }).code;
  const element = new Function('React', compiled)(React);
  assert.equal(renderToStaticMarkup(element), '<main><span>Visible</span></main>');
  assert.equal(stripComments(jsx), jsx);

  // Sucrase rejects malformed syntax rather than recovering an AST as the
  // TypeScript transpiler can. Parse the exact served strings, including boards.
  let programs = 0;
  for (const task of CODING_TASKS.filter(task => task.track === 'react')) {
    const solution = solutionFor(task.id)!;
    for (const [kind, source] of Object.entries({ solution: solution.solution, junior: solution.junior, senior: solution.senior })) {
      if (!source) continue;
      assert.doesNotThrow(() => transform(source, {
        transforms: ['typescript', 'jsx', 'imports'], production: true, filePath: `${task.id}-${kind}.tsx`,
      }), `${task.id}/${kind}: the exact served React program must parse`);
      programs++;
    }
  }
  assert.ok(programs > 0);
  console.log(`Coding boards: block/object/JSX comment regressions pass; ${programs} served React programs strictly parse.`);
}
