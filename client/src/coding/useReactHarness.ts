// The bridge to the sandboxed React harness (client/sandbox). One iframe, one
// run at a time, every message tagged with the run's token: a late message
// from an earlier run is dropped, a run that says nothing within the budget
// is reported as timed out and the frame is reloaded.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MiniJestCase } from '../../../shared/coding-mini-jest';

export const HARNESS_URL = '/sandbox/index.html';
const RUN_TIMEOUT_MS = 20_000;
const READY_TIMEOUT_MS = 20_000;

export interface HarnessRun {
  token: string;
  status: 'running' | 'compile-error' | 'done' | 'timeout';
  compileError: string | null;
  previewError: string | null;
  cases: MiniJestCase[];
  logs: { level: string; text: string }[];
  passed: number;
  failed: number;
  total: number;
  /** false when the run was preview-only. */
  ran: boolean;
}

export interface HarnessHandle {
  ready: boolean;
  run: HarnessRun | null;
  /** Compiles, optionally runs the suite, and renders the preview. */
  start: (files: Record<string, string>, options: { tests: boolean; preview: boolean }) => Promise<HarnessRun>;
  reload: () => void;
  iframeRef: (node: HTMLIFrameElement | null) => void;
  /** Changes on reload; use it as the iframe's React key so the frame remounts. */
  frameKey: number;
}

const newToken = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function useReactHarness(): HarnessHandle {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [run, setRun] = useState<HarnessRun | null>(null);
  const pending = useRef<{ token: string; resolve: (run: HarnessRun) => void; timer: number } | null>(null);
  const current = useRef<HarnessRun | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const readyWaiters = useRef<((ready: boolean) => void)[]>([]);
  const readyRef = useRef(false);
  const generation = useRef(0);

  // Every caller must settle, including callers waiting for the frame to boot.
  const cancel = useCallback(() => {
    generation.current++;
    readyRef.current = false;
    readyWaiters.current.splice(0).forEach(resolve => resolve(false));
    if (pending.current) {
      window.clearTimeout(pending.current.timer);
      pending.current.resolve({ ...current.current!, token: pending.current.token, status: 'timeout' });
      pending.current = null;
    }
    current.current = null;
  }, []);

  const settle = useCallback((next: HarnessRun) => {
    current.current = next;
    setRun(next);
    if (pending.current && pending.current.token === next.token && (next.status === 'done' || next.status === 'compile-error' || next.status === 'timeout')) {
      window.clearTimeout(pending.current.timer);
      pending.current.resolve(next);
      pending.current = null;
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!frame.current || event.source !== frame.current.contentWindow) return;
      const data = event.data as { type?: string; token?: string } & Record<string, unknown>;
      if (!data || typeof data.type !== 'string') return;
      if (data.type === 'ready') {
        readyRef.current = true;
        setReady(true);
        readyWaiters.current.splice(0).forEach((resolve) => resolve(true));
        return;
      }
      const active = current.current;
      if (!active || data.token !== active.token) return;
      switch (data.type) {
        case 'compiled':
          return;
        case 'compile-error':
          settle({ ...active, status: 'compile-error', compileError: String(data.message ?? 'Compile error') });
          return;
        case 'test':
          settle({
            ...active,
            cases: [...active.cases, { name: String(data.name), status: data.status === 'pass' ? 'pass' : 'fail', error: (data.error as string | null) ?? null, durationMs: Number(data.durationMs ?? 0) }],
          });
          return;
        case 'console':
          settle({ ...active, logs: [...active.logs, { level: String(data.level), text: String(data.text) }].slice(-200) });
          return;
        case 'preview-error':
          settle({ ...active, previewError: String(data.message ?? 'Render error') });
          return;
        case 'done':
          // The frame closes a build error with an empty `done`; the error is
          // the result, so the count of no cases must not replace it.
          if (active.status === 'compile-error') return;
          settle({ ...active, status: 'done', passed: Number(data.passed ?? 0), failed: Number(data.failed ?? 0), total: Number(data.total ?? 0), ran: data.ran !== false });
          return;
        default:
      }
    };
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('message', onMessage); cancel(); };
  }, [cancel, settle]);

  const reload = useCallback(() => {
    cancel();
    setReady(false);
    setFrameKey((k) => k + 1);
  }, [cancel]);

  const waitReady = useCallback(() => new Promise<boolean>((resolve) => {
    if (readyRef.current && frame.current?.contentWindow) return resolve(true);
    const finish = (value: boolean) => {
      window.clearTimeout(timer);
      readyWaiters.current = readyWaiters.current.filter(waiter => waiter !== finish);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(false), READY_TIMEOUT_MS);
    readyWaiters.current.push(finish);
  }), []);

  const start = useCallback(async (files: Record<string, string>, options: { tests: boolean; preview: boolean }): Promise<HarnessRun> => {
    const token = newToken();
    const epoch = ++generation.current;
    readyWaiters.current.splice(0).forEach(resolve => resolve(false));
    const base: HarnessRun = { token, status: 'running', compileError: null, previewError: null, cases: [], logs: [], passed: 0, failed: 0, total: 0, ran: options.tests };
    current.current = base;
    setRun(base);
    if (pending.current) {
      window.clearTimeout(pending.current.timer);
      pending.current.resolve({ ...base, token: pending.current.token, status: 'timeout' });
      pending.current = null;
    }
    const isReady = await waitReady();
    if (epoch !== generation.current) return { ...base, status: 'timeout' };
    const target = frame.current?.contentWindow;
    if (!isReady || !target) {
      const timedOut: HarnessRun = { ...base, status: 'timeout' };
      settle(timedOut);
      return timedOut;
    }
    return new Promise<HarnessRun>((resolve) => {
      const timer = window.setTimeout(() => {
        const timedOut: HarnessRun = { ...(current.current ?? base), status: 'timeout' };
        settle(timedOut);
        reload();
      }, RUN_TIMEOUT_MS);
      pending.current = { token, resolve, timer };
      target.postMessage({ type: 'run', token, files, preview: options.preview, tests: options.tests }, '*');
    });
  }, [reload, settle, waitReady]);

  const iframeRef = useCallback((node: HTMLIFrameElement | null) => {
    frame.current = node;
    if (!node) setReady(false);
  }, []);

  return useMemo(() => ({ ready, run, start, reload, iframeRef, frameKey }), [ready, run, start, reload, iframeRef, frameKey]);
}
