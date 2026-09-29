import assert from 'node:assert/strict';
import { runIsolatedReactSuite } from '../lib/coding/react-isolated';
import { CODING_TASKS } from '../lib/coding/catalog';
import { solutionFor } from '../lib/coding/solutions/index';

async function main() {
  assert(
    process.env.REACT_RUNNER_SNAPSHOT_ID,
    'Configure a test snapshot before this integration check',
  );
  const probes = [
    [
      // Learner code has no `process` at all, so no environment to read.
      'credentials',
      'function App(){ return null; }',
      `test('no application credentials',()=>{ expect(typeof process).toBe('undefined'); expect(typeof globalThis.process).toBe('undefined'); });`,
    ],
    [
      'page realm',
      `export const reach = () => [typeof require === 'function' && (() => { try { require('fs'); return 'fs'; } catch { return 'no fs'; } })(), ...[() => Function('return this')(), () => globalThis.constructor.constructor('return process')(), () => document.createElement.constructor('return process')()].map((run) => { try { run(); return 'reached'; } catch { return 'blocked'; } })];
export default function App(){ return null; }`,
      `import { reach } from './App';
test('nothing leads to Node',()=>{ expect(reach()).toEqual(['no fs','blocked','blocked','blocked']); });`,
    ],
    [
      'network',
      'function App(){ return null; }',
      `test('network denied',async()=>{let connected=false;try{await fetch('https://example.com',{signal:AbortSignal.timeout(700)});connected=true;}catch{}expect(connected).toBe(false);});`,
    ],
  ];
  for (const [name, appSource, suite] of probes) {
    const result = await runIsolatedReactSuite({ appSource, suite });
    assert.equal(result.passed, 1, `${name}: ${JSON.stringify(result)}`);
    console.log(`PASS isolated ${name}`);
  }
  for (const id of [
    'react-evolving-form-2',
    'react-uselocalstorage-hook',
    'react-fullstack-stockroom-6',
  ]) {
    const task = CODING_TASKS.find((task) => task.id === id);
    if (!task?.suite) throw new Error(`Missing fixture ${id}`);
    const appSource = solutionFor(task.id)?.solution;
    if (!appSource) throw new Error(`Missing solution ${id}`);
    const result = await runIsolatedReactSuite({
      appSource,
      suite: task.suite,
    });
    assert.equal(result.failed, 0, `${id}: ${JSON.stringify(result)}`);
    console.log(`PASS isolated ${id}: ${result.passed} tests`);
  }
  // The reported forgery: write the verdict file and exit before the suite
  // runs. The component has no `process`, and the API reads no file.
  const forged = await runIsolatedReactSuite({
    appSource: `process.getBuiltinModule('fs').writeFileSync('/vercel/sandbox/result.json', JSON.stringify({ cases: [{ name: 'ok', status: 'pass', error: null, durationMs: 0 }], passed: 1, failed: 0, total: 1, compileError: null, timedOut: false })); process.exit(0); export default function App(){ return null }`,
    suite: `import App from './App'; \ntest('renders nothing yet', () => { expect(typeof App).toBe('function'); });`,
  });
  assert.equal(forged.passed, 0, JSON.stringify(forged));
  assert.match(forged.compileError ?? '', /process is not defined/);
  console.log('PASS a forged result.json and early exit are not a verdict');
  const stuck = await runIsolatedReactSuite({
    appSource: 'while(true){}; export default function App(){return null}',
    suite: `import App from './App'; test('render',()=>{expect(App).toBeTruthy()});`,
  });
  assert.equal(stuck.timedOut, true, JSON.stringify(stuck));
  console.log(
    'PASS synchronous infinite loop terminates outside the API process',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
