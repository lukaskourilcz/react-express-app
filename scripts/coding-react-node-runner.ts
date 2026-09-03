// Runs one React suite against one App module under jsdom, the way the browser
// harness does with a real DOM: compile with esbuild, resolve the suite's four
// imports (the fetch stub, React, Testing Library, and the App), collect the
// cases with the shared mini-jest, and render with @testing-library/react.
// Test-only: production grading of React tasks happens in the browser harness.
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';
import { asRunnableModule, FETCH_STUB_SOURCE } from '../lib/coding/react-support';
import { createMiniJest, type MiniJestRun } from '../shared/coding-mini-jest';

const nodeRequire = createRequire(import.meta.url);

let rtl: typeof import('@testing-library/react') | null = null;

async function ensureRuntime() {
  if (rtl) return rtl;
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
  rtl = await import('@testing-library/react');
  return rtl;
}

const compile = (source: string, loader: 'jsx' | 'js' = 'jsx') =>
  transformSync(source, { loader, format: 'cjs', jsx: 'transform', target: 'node20' }).code;

function runModule(source: string, resolve: (request: string) => unknown, loader: 'jsx' | 'js' = 'jsx', extra: Record<string, unknown> = {}) {
  const module = { exports: {} as Record<string, unknown> };
  const names = ['require', 'module', 'exports', ...Object.keys(extra)];
  // eslint-disable-next-line no-new-func -- compiling authored fixtures and reference solutions, never learner input
  new Function(...names, compile(source, loader))(resolve, module, module.exports, ...Object.values(extra));
  return module.exports;
}

export interface ReactSuiteOutcome extends MiniJestRun {
  compileError: string | null;
}

/** Runs `suite` against `appSource` (a component body or a full module). */
export async function runReactSuite(input: { suite: string; appSource: string }): Promise<ReactSuiteOutcome> {
  const testing = await ensureRuntime();
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
    if (request === './fetchStub' || request === './fetchStub.js') return runModule(FETCH_STUB_SOURCE, resolve, 'js');
    if (request === '@testing-library/react') return testing;
    if (request === '@testing-library/jest-dom') return {};
    return nodeRequire(request);
  };

  try {
    runModule(input.suite, resolve, 'jsx', jest.globals);
  } catch (error) {
    return { cases: [], passed: 0, failed: 1, total: 1, compileError: `compiling suite: ${(error as Error).message.split('\n')[0]}` };
  }
  const run = await jest.run({ afterEach: () => testing.cleanup(), timeoutMs: 5_000 });
  if (run.total === 0) return { ...run, failed: 1, total: 1, compileError: compileError ?? 'suite registered no test cases' };
  return { ...run, compileError };
}
