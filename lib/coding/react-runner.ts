// Runs one React suite against one App module under jsdom, with the same
// compiler and the same mini-jest the browser harness uses, so a verdict from
// the server and a verdict from the learner's Run button are produced by the
// same rules.
//
// Server-side grading is what makes a React verdict trustworthy: the browser
// harness stays for the preview and for fast local feedback, but `passed` is
// decided here, where the learner cannot reach.
//
// Two details this module exists to get right:
//
//  * React exports `act` only from its DEVELOPMENT build, and Testing Library
//    needs it. A serverless function runs with NODE_ENV=production, where a
//    plain `require('react')` returns a build with no `act` at all — RTL then
//    falls back to the `react-dom/test-utils` shim, which calls the missing
//    `React.act` and throws on the first `render()`. The runtime is therefore
//    loaded once with NODE_ENV pinned to development, and the value is put
//    back immediately afterwards.
//
//  * jsdom, React and Testing Library are heavy. Everything here is imported
//    lazily, so only a React submission pays for them; a JavaScript or
//    TypeScript submission never loads a line of it.

import { transform } from 'sucrase';
import { asRunnableModule, FETCH_STUB_SOURCE } from '../../shared/coding-react-support';
import { createMiniJest, type MiniJestRun } from '../../shared/coding-mini-jest';

/** How long one suite may take before it is called a timeout. */
export const REACT_SUITE_TIMEOUT_MS = 5_000;

type TestingLibrary = typeof import('@testing-library/react');

interface Runtime {
  testing: TestingLibrary;
  /** What a `require` inside the learner's module or the suite resolves to. */
  modules: Record<string, unknown>;
}

let runtime: Runtime | null = null;
let runtimeError: string | null = null;

/** A CJS package loaded through `import()` exposes its exports as `default`. */
const cjs = (namespace: unknown): unknown =>
  (namespace as { default?: unknown })?.default ?? namespace;

/**
 * jsdom + a development React + Testing Library, prepared once per warm
 * instance. The globals go on `globalThis` because that is where React and
 * Testing Library look for the document.
 */
async function ensureRuntime(): Promise<Runtime> {
  if (runtime) return runtime;
  if (runtimeError) throw new Error(runtimeError);

  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  const win = dom.window as unknown as Record<string, unknown>;
  for (const key of [
    'window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'InputEvent',
    'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'AbortController', 'DOMException',
    'MutationObserver', 'SVGElement', 'Text', 'Element', 'CustomEvent', 'FocusEvent',
  ]) {
    if (win[key] !== undefined) Object.defineProperty(globalThis, key, { value: win[key], configurable: true, writable: true });
  }
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

  // The narrow window described at the top of the file: load React, the
  // renderer and Testing Library against the development build, then restore
  // the environment for everything else in the process.
  const previous = process.env.NODE_ENV;
  let modules: Record<string, unknown>;
  try {
    process.env.NODE_ENV = 'development';
    const react = cjs(await import('react')) as { act?: unknown };
    const reactDom = cjs(await import('react-dom'));
    const reactDomClient = cjs(await import('react-dom/client'));
    const jsxRuntime = cjs(await import('react/jsx-runtime'));
    const testing = cjs(await import('@testing-library/react')) as TestingLibrary;
    if (typeof react.act !== 'function') {
      runtimeError = 'React was loaded without `act`, so no Testing Library suite can run';
      throw new Error(runtimeError);
    }
    modules = {
      react,
      'react-dom': reactDom,
      'react-dom/client': reactDomClient,
      'react/jsx-runtime': jsxRuntime,
      'react/jsx-dev-runtime': jsxRuntime,
      '@testing-library/react': testing,
      '@testing-library/jest-dom': {},
    };
    runtime = { testing, modules };
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
  return runtime;
}

/** The same compile the browser frame performs, so both agree on the syntax. */
const compile = (source: string): string =>
  transform(source, { transforms: ['jsx', 'imports'], jsxRuntime: 'automatic', production: true, filePath: 'file.jsx' }).code;

function runModule(source: string, resolve: (request: string) => unknown, extra: Record<string, unknown> = {}) {
  const module = { exports: {} as Record<string, unknown> };
  const names = ['require', 'module', 'exports', ...Object.keys(extra)];
  // eslint-disable-next-line no-new-func -- the learner's component runs here, inside the graded process and nowhere near the database
  new Function(...names, compile(source))(resolve, module, module.exports, ...Object.values(extra));
  return module.exports;
}

export interface ReactSuiteOutcome extends MiniJestRun {
  /** Set when the component or the suite could not be compiled or loaded. */
  compileError: string | null;
  /** True when a case ran past the per-case budget. */
  timedOut: boolean;
}

/** Runs `suite` against `appSource` (a component body or a full module). */
export async function runReactSuite(input: { suite: string; appSource: string }): Promise<ReactSuiteOutcome> {
  const { testing, modules } = await ensureRuntime();
  const jest = createMiniJest();
  let compileError: string | null = null;
  let appModule: unknown = null;

  const resolve = (request: string): unknown => {
    if (request === './App' || request === './App.js' || request === './App.jsx') {
      if (appModule) return appModule;
      try {
        appModule = runModule(asRunnableModule(input.appSource), resolve);
      } catch (error) {
        compileError = `compiling App: ${(error as Error).message.split('\n')[0]}`;
        appModule = { default: () => null };
      }
      return appModule;
    }
    if (request === './fetchStub' || request === './fetchStub.js') return runModule(FETCH_STUB_SOURCE, resolve);
    if (request in modules) return modules[request];
    throw new Error(`Cannot find module '${request}'`);
  };

  try {
    runModule(input.suite, resolve, jest.globals);
  } catch (error) {
    return {
      cases: [], passed: 0, failed: 1, total: 1, timedOut: false,
      compileError: `compiling suite: ${(error as Error).message.split('\n')[0]}`,
    };
  }
  const run = await jest.run({ afterEach: () => testing.cleanup(), timeoutMs: REACT_SUITE_TIMEOUT_MS });
  const timedOut = run.cases.some((one) => one.status === 'fail' && /timed out/i.test(one.error ?? ''));
  if (run.total === 0) {
    return { ...run, failed: 1, total: 1, timedOut, compileError: compileError ?? 'suite registered no test cases' };
  }
  return { ...run, timedOut, compileError };
}
