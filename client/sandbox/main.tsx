// The self-hosted React harness. One sandboxed iframe (opaque origin, no
// network) renders the learner's App for the Preview tab and runs the task's
// Testing Library suite for the Results tab. The parent drives it with
// postMessage; every message carries the run token, so a late result from an
// earlier run is ignored by the parent. There is no second client, no hidden
// "done" gate and no listener that outlives its target, which is what made
// the Sandpack-based predecessor hang until a refresh.
import React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as JsxRuntime from 'react/jsx-runtime';
import * as RTL from '@testing-library/react';
import { transform } from 'sucrase';
import { createMiniJest } from '../../shared/coding-mini-jest';
import { asRunnableModule, FETCH_STUB_SOURCE } from '../../shared/coding-react-support';

interface RunMessage {
  type: 'run';
  token: string;
  files: Record<string, string>;
  preview: boolean;
  tests: boolean;
}

type Outgoing =
  | { type: 'ready' }
  | { type: 'compiled'; token: string }
  | { type: 'compile-error'; token: string; message: string }
  | { type: 'test'; token: string; name: string; status: 'pass' | 'fail'; error: string | null; durationMs: number }
  | { type: 'console'; token: string; level: string; text: string }
  | { type: 'preview-error'; token: string; message: string }
  | { type: 'done'; token: string; passed: number; failed: number; total: number; ran: boolean };

const post = (message: Outgoing) => window.parent.postMessage(message, '*');

// Testing Library wants this while a suite runs; React warns about unwrapped
// updates when it is left on, so the preview render turns it off again.
const actEnvironment = (on: boolean) => {
  (window as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = on;
};
actEnvironment(false);

// Suites and the preview share this fetch stub: the sandbox has no network.
// eslint-disable-next-line no-new-func -- fixtures authored in the repository, not learner input
new Function(FETCH_STUB_SOURCE)();

let currentToken = '';
let previewRoot: ReactDOMClient.Root | null = null;

const forward = (level: 'log' | 'info' | 'warn' | 'error' | 'debug') => {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    original(...args);
    if (!currentToken) return;
    const text = args.map((value) => {
      if (typeof value === 'string') return value;
      try { return JSON.stringify(value) ?? String(value); } catch { return String(value); }
    }).join(' ');
    post({ type: 'console', token: currentToken, level, text: text.slice(0, 2_000) });
  };
};
(['log', 'info', 'warn', 'error', 'debug'] as const).forEach(forward);

const compile = (source: string): string =>
  transform(source, { transforms: ['jsx', 'imports'], jsxRuntime: 'automatic', production: true, filePath: 'file.jsx' }).code;

const BUILTINS: Record<string, unknown> = {
  react: React,
  'react-dom': ReactDOM,
  'react-dom/client': ReactDOMClient,
  'react/jsx-runtime': JsxRuntime,
  'react/jsx-dev-runtime': JsxRuntime,
  '@testing-library/react': RTL,
  '@testing-library/jest-dom': {},
};

function makeRequire(files: Record<string, string>, extra: Record<string, unknown>) {
  const cache = new Map<string, unknown>();
  const require = (request: string): unknown => {
    if (request in BUILTINS) return BUILTINS[request];
    if (request === './fetchStub' || request === './fetchStub.js') return {};
    const key = request.replace(/^\.\//, '/').replace(/\.(jsx?|tsx?)$/, '');
    const file = files[`${key}.js`] ?? files[`${key}.jsx`] ?? files[key];
    if (file === undefined) throw new Error(`Cannot find module '${request}'`);
    if (cache.has(key)) return cache.get(key);
    const module = { exports: {} as Record<string, unknown> };
    cache.set(key, module.exports);
    const source = key === '/App' ? asRunnableModule(file) : file;
    const names = ['require', 'module', 'exports', ...Object.keys(extra)];
    // eslint-disable-next-line no-new-func -- the learner's code runs inside this sandboxed, network-less frame
    new Function(...names, compile(source))(require, module, module.exports, ...Object.values(extra));
    cache.set(key, module.exports);
    return module.exports;
  };
  return require;
}

function unmountPreview() {
  if (previewRoot) {
    try { previewRoot.unmount(); } catch { /* already gone */ }
    previewRoot = null;
  }
  const root = document.getElementById('root');
  if (root) root.innerHTML = '';
}

async function run(message: RunMessage) {
  // Whatever happens below, the parent gets exactly one answer. An unhandled
  // throw here would leave it waiting out its timeout with no verdict, which
  // is the failure mode this harness exists to rule out.
  try {
    await runInner(message);
  } catch (error) {
    if (currentToken !== message.token) return;
    post({ type: 'preview-error', token: message.token, message: `harness: ${String((error as Error)?.message ?? error).split('\n')[0]}` });
    post({ type: 'done', token: message.token, passed: 0, failed: 0, total: 0, ran: false });
  }
}

async function runInner(message: RunMessage) {
  currentToken = message.token;
  unmountPreview();
  RTL.cleanup();
  const files = message.files;
  if (typeof files['/App.js'] !== 'string') {
    post({ type: 'compile-error', token: message.token, message: 'Missing /App.js' });
    return;
  }

  // Compile the App once up front so a syntax error is reported as such.
  try {
    compile(asRunnableModule(files['/App.js']));
  } catch (error) {
    post({ type: 'compile-error', token: message.token, message: String((error as Error)?.message ?? error).split('\n')[0] });
    post({ type: 'done', token: message.token, passed: 0, failed: 0, total: 0, ran: false });
    return;
  }
  post({ type: 'compiled', token: message.token });

  let passed = 0;
  let failed = 0;
  let total = 0;
  if (message.tests && typeof files['/App.test.js'] === 'string') {
    actEnvironment(true);
    const jest = createMiniJest();
    try {
      makeRequire(files, jest.globals)('./App.test.js');
    } catch (error) {
      post({ type: 'test', token: message.token, name: 'suite', status: 'fail', error: `compiling suite: ${String((error as Error)?.message ?? error).split('\n')[0]}`, durationMs: 0 });
      failed = 1;
      total = 1;
    }
    if (total === 0) {
      const outcome = await jest.run({ afterEach: () => RTL.cleanup(), timeoutMs: 5_000 });
      for (const one of outcome.cases) {
        post({ type: 'test', token: message.token, name: one.name, status: one.status, error: one.error, durationMs: one.durationMs });
      }
      passed = outcome.passed;
      failed = outcome.failed;
      total = outcome.total;
      if (total === 0) {
        post({ type: 'test', token: message.token, name: 'suite', status: 'fail', error: 'The suite registered no test cases', durationMs: 0 });
        failed = 1;
        total = 1;
      }
    }
    RTL.cleanup();
    actEnvironment(false);
  }
  if (currentToken !== message.token) return;

  if (message.preview) {
    try {
      const app = makeRequire(files, {})('./App') as { default?: React.ComponentType };
      const App = app.default;
      if (typeof App !== 'function') throw new Error('App.js has no default export');
      const container = document.getElementById('root')!;
      previewRoot = ReactDOMClient.createRoot(container);
      previewRoot.render(React.createElement(App));
    } catch (error) {
      post({ type: 'preview-error', token: message.token, message: String((error as Error)?.message ?? error).split('\n')[0] });
    }
  }
  post({ type: 'done', token: message.token, passed, failed, total, ran: message.tests });
}

window.addEventListener('message', (event: MessageEvent<RunMessage>) => {
  if (event.source !== window.parent) return;
  const data = event.data;
  if (!data || data.type !== 'run' || typeof data.token !== 'string' || !data.files) return;
  void run(data);
});

window.addEventListener('error', (event) => {
  if (currentToken) post({ type: 'preview-error', token: currentToken, message: String(event.message).slice(0, 500) });
});

post({ type: 'ready' });
