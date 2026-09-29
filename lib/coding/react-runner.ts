// Runs one React suite against one App module under jsdom, with the same
// compiler and the same mini-jest the browser harness uses, so a verdict from
// the server and a verdict from the learner's Run button are produced by the
// same rules.
//
// This module is NOT a security boundary. Run it only for trusted reference
// solutions in local tests, or inside the disposable microVM used by
// react-isolated.ts. API handlers must never evaluate learner code here.
//
// The component, the suite and the fetch fixtures are evaluated in a separate
// JavaScript realm (a node:vm context) whose global object holds the page:
// jsdom's window and document, timers and a few web APIs. Node's `process`,
// `require`, `module` and the host's global object are not on it, and code
// generation from strings (`eval`, `Function(...)`) is switched off there, so
// `Function('return this')()` cannot climb out to the host either. The guest
// process (scripts/react-sandbox-entry.ts) also starts Node with
// --disallow-code-generation-from-strings, so a host function reached through
// jsdom or React cannot compile code with `.constructor` either. Learner code
// therefore cannot write files, end the process or print the result itself.
// It still shares a realm with the suite, so this is not a claim that no
// component can ever influence its own verdict: see
// docs/react-grading-operations.md.
//
// Three details this module exists to get right:
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
//
//  * Node reports a promise nobody handled on `process`, which the page realm
//    does not have. A suite that checks for them listens on `window`, as it
//    would in a browser, so the runner forwards each one there as an
//    `unhandledrejection` event.

import { compileFunction, createContext, runInContext, type Context } from 'node:vm';
import { transform } from 'sucrase';
import { asRunnableModule, FETCH_STUB_SOURCE, watchFormSubmits, type FormSubmitTarget } from '../../shared/coding-react-support';
import { createMiniJest, type MiniJestRun } from '../../shared/coding-mini-jest';
import { LOCAL_FETCH_SOURCE } from '../../shared/coding-fullstack-support';

/** How long one suite may take before it is called a timeout. */
export const REACT_SUITE_TIMEOUT_MS = 5_000;

type TestingLibrary = typeof import('@testing-library/react');

interface Runtime {
  testing: TestingLibrary;
  /** What a `require` inside the learner's module or the suite resolves to. */
  modules: Record<string, unknown>;
  /** jsdom's window, where unhandled rejections are reported. */
  window: Record<string, unknown>;
}

/** jsdom's browser globals, installed on the host for React and Testing Library. */
const DOM_GLOBALS = [
  'window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'InputEvent',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'AbortController', 'DOMException',
  'MutationObserver', 'SVGElement', 'Text', 'Element', 'CustomEvent', 'FocusEvent',
];

/** Everything the page realm's global object carries besides its own
 * JavaScript built-ins: the jsdom globals above and the web APIs a component
 * may call. Nothing here leads to `process`, `require` or the filesystem. */
const PAGE_GLOBALS = [
  ...DOM_GLOBALS, 'navigator',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'structuredClone',
  'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'AbortSignal', 'atob', 'btoa', 'crypto', 'performance',
  'fetch', 'Headers', 'Request', 'Response', 'FormData', 'Blob',
];

/** A console that goes nowhere: the result travels on stdout, and nothing a
 * component logs is shown to anyone. */
const SILENT_CONSOLE = `(() => {
  const console = {};
  for (const name of ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'table', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'timeLog', 'count', 'countReset', 'assert', 'clear']) console[name] = () => {};
  return console;
})()`;

/** The suite hands Testing Library regular expressions and functions made in
 * the page realm, and Testing Library tells a matcher's kind with `instanceof
 * RegExp` and `instanceof Function`, which is false for a value from another
 * realm. So in this process both answer by what the value is, whichever realm
 * made it. Only processes that grade React load this module; the API does
 * not. */
function recognizeOtherRealms() {
  const ordinary = Function.prototype[Symbol.hasInstance];
  const source = Object.getOwnPropertyDescriptor(RegExp.prototype, 'source')!.get!;
  const isRegExp = (value: unknown): boolean => {
    if (typeof value !== 'object' || value === null) return false;
    try { source.call(value); return true; } catch { return false; }
  };
  Object.defineProperty(RegExp, Symbol.hasInstance, {
    configurable: true,
    value(this: unknown, value: unknown) { return (this === RegExp && isRegExp(value)) || ordinary.call(this, value); },
  });
  Object.defineProperty(Function, Symbol.hasInstance, {
    configurable: true,
    value(this: unknown, value: unknown) { return (this === Function && typeof value === 'function') || ordinary.call(this, value); },
  });
}

/** A fresh page realm for one run. The global object starts with no
 * prototype, so `this.constructor` inside it finds the realm's own `Object`
 * and never the host's. */
function createPageRealm(): Context {
  const page = createContext(Object.create(null), {
    name: 'react-page',
    codeGeneration: { strings: false, wasm: false },
  });
  const host = globalThis as Record<string, unknown>;
  for (const key of PAGE_GLOBALS) {
    if (host[key] !== undefined) Object.defineProperty(page, key, { value: host[key], configurable: true, writable: true });
  }
  Object.defineProperty(page, 'console', { value: runInContext(SILENT_CONSOLE, page), configurable: true, writable: true });
  return page;
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

  const { JSDOM, VirtualConsole } = await import('jsdom');
  // window.console goes nowhere, like the page realm's own console: the
  // verdict travels on stdout, and nothing a component logs is shown to anyone.
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const win = dom.window as unknown as Record<string, unknown>;
  for (const key of DOM_GLOBALS) {
    if (win[key] !== undefined) Object.defineProperty(globalThis, key, { value: win[key], configurable: true, writable: true });
  }
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  recognizeOtherRealms();

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
    runtime = { testing, modules, window: win };
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
  return runtime;
}

/** The same compile the browser frame performs, so both agree on the syntax. */
const compile = (source: string): string =>
  transform(source, { transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'automatic', production: true, filePath: 'file.tsx' }).code;

/** Evaluates a CommonJS module inside the page realm. `require` is the only
 * way out, and it resolves a fixed list of names. */
function runModule(page: Context, source: string, resolve: (request: string) => unknown, extra: Record<string, unknown> = {}) {
  const module = runInContext('({ exports: {} })', page) as { exports: Record<string, unknown> };
  const names = ['require', 'module', 'exports', ...Object.keys(extra)];
  compileFunction(compile(source), names, { parsingContext: page })(resolve, module, module.exports, ...Object.values(extra));
  return module.exports;
}

// A promise the component leaves rejected with no handler, such as an aborted
// fetch with no catch, only logs a line in the browser. In Node it would end
// the whole process, and the learner would read a runner failure instead of a
// verdict. So while a suite runs, one listener takes those rejections, tells
// the page the way a browser would, and the checks decide. It stays until a
// turn after the last run ends, because a rejection from the last case's
// cleanup is reported after the run returns.
let runsInFlight = 0;
const ignoreRejection = (reason: unknown, promise: unknown) => {
  const page = runtime?.window as { Event?: new (type: string, init: object) => object; dispatchEvent?: (event: object) => boolean } | undefined;
  if (!page?.Event || !page.dispatchEvent) return;
  try {
    const event = new page.Event('unhandledrejection', { cancelable: true });
    Object.defineProperties(event, { reason: { value: reason }, promise: { value: promise } });
    page.dispatchEvent(event);
  } catch {
    // A listener that throws is the suite's problem, never the runner's.
  }
};
function holdRejections(starting: boolean) {
  if (starting) {
    runsInFlight += 1;
    if (!process.listeners('unhandledRejection').includes(ignoreRejection)) process.on('unhandledRejection', ignoreRejection);
    return;
  }
  runsInFlight -= 1;
  setTimeout(() => {
    if (runsInFlight === 0) process.off('unhandledRejection', ignoreRejection);
  }, 0);
}

export interface ReactSuiteOutcome extends MiniJestRun {
  /** Set when the component or the suite could not be compiled or loaded. */
  compileError: string | null;
  /** True when a case ran past the per-case budget. */
  timedOut: boolean;
}

/** Runs `suite` against `appSource` (a component body or a full module). */
export async function runReactSuite(input: { suite: string; appSource: string }): Promise<ReactSuiteOutcome> {
  const { testing, modules, window: pageWindow } = await ensureRuntime();
  const jest = createMiniJest();
  const page = createPageRealm();
  let compileError: string | null = null;
  let appModule: unknown = null;

  const resolve = (request: string): unknown => {
    if (request === './App' || request === './App.js' || request === './App.jsx') {
      if (appModule) return appModule;
      try {
        appModule = runModule(page, asRunnableModule(input.appSource), resolveForApp);
      } catch (error) {
        compileError = `compiling App: ${(error as Error).message.split('\n')[0]}`;
        appModule = { default: () => null };
      }
      return appModule;
    }
    if (request === './fetchStub' || request === './fetchStub.js') return runModule(page, FETCH_STUB_SOURCE, resolve);
    if (request === './localFetch') return runModule(page, LOCAL_FETCH_SOURCE, resolve);
    if (request in modules) return modules[request];
    throw new Error(`Cannot find module '${request}'`);
  };
  // The component gets React and the fixtures, never Testing Library: with
  // it, a component could reconfigure how the suite's queries and waits run.
  const resolveForApp = (request: unknown): unknown => {
    const name = String(request);
    if (name.startsWith('@testing-library/')) throw new Error(`Cannot find module '${name}'`);
    return resolve(name);
  };

  try {
    runModule(page, input.suite, resolve, jest.globals);
  } catch (error) {
    return {
      cases: [], passed: 0, failed: 1, total: 1, timedOut: false,
      compileError: `compiling suite: ${(error as Error).message.split('\n')[0]}`,
    };
  }
  let run: MiniJestRun;
  holdRejections(true);
  try {
    // A form the component lets submit fails its case, as in the browser
    // harness: in the preview the frame would reload and lose its state.
    run = await jest.run({
      afterEach: () => testing.cleanup(),
      timeoutMs: REACT_SUITE_TIMEOUT_MS,
      watchCase: () => watchFormSubmits(pageWindow as unknown as FormSubmitTarget),
    });
  } finally {
    holdRejections(false);
  }
  // A case that threw has an error, even an empty one. Mini-jest reads an
  // empty message as no error, so a component that threw `new Error('')`
  // passed every case that rendered it.
  if (run.cases.some((one) => one.status === 'pass' && one.error !== null)) {
    const cases = run.cases.map((one) => (one.status === 'pass' && one.error !== null
      ? { ...one, status: 'fail' as const, error: one.error || 'threw an error with no message' }
      : one));
    const passed = cases.filter((one) => one.status === 'pass').length;
    run = { cases, passed, failed: cases.length - passed, total: cases.length };
  }
  const timedOut = run.cases.some((one) => one.status === 'fail' && /timed out/i.test(one.error ?? ''));
  if (run.total === 0) {
    return { ...run, failed: 1, total: 1, timedOut, compileError: compileError ?? 'suite registered no test cases' };
  }
  return { ...run, timedOut, compileError };
}
