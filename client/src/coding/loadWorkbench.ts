import { useEffect, useState } from 'react';
import type { CodingWorkbench as CodingWorkbenchView } from './CodingWorkbench';
import { routeChunk } from '../lib/routePreload';
import { RELOAD_GRACE_MS, isChunkLoadError, reloadOnPress } from '../lib/routeRecovery';
import { editorWantedHere, loadEditor } from './loadEditor';

// The editor, the test runner and the hint ladder serve a task and nothing
// else, and with CodeMirror they are most of the section's code. The lists no
// longer wait for them: a task screen loads them beside its task, a pointer on
// a task link starts them, and a list on screen warms the workbench, without
// CodeMirror, once it is idle (perf baseline #587 C03).
let workbenchView: typeof CodingWorkbenchView | null = null;
let workbenchPending: Promise<typeof import('./CodingWorkbench')> | null = null;
const importWorkbench = () => {
  if (!workbenchPending) {
    workbenchPending = import('./CodingWorkbench').then((module) => {
      // Loaded once, drawn at once by every task screen after it.
      workbenchView = module.CodingWorkbench;
      return module;
    });
    // A failed fetch is forgotten, so the next attempt asks the network again.
    workbenchPending.catch(() => { workbenchPending = null; });
  }
  return workbenchPending;
};
/** The editor as well, where the task will show one: a phone that shows the
 * puzzle or the "bigger screen" note does not fetch CodeMirror (C12). Settles
 * with the workbench once the editor has settled too, so the task draws whole;
 * an editor that failed fails alone, in its own box, when it is drawn. */
export const preloadTaskWorkbench = routeChunk(
  (pathname) => /^\/coding\/(?!system-design\/)[^/]+\/[^/]+$/.test(pathname),
  () => {
    const editor = editorWantedHere() ? loadEditor().catch(() => undefined) : undefined;
    return importWorkbench().then(async (module) => { await editor; return module; });
  },
);

/** The workbench alone, for the lists' idle warm-up: a loader with no path
 * of its own, sharing the task's import of the workbench. */
const warmWorkbench = routeChunk(() => false, importWorkbench);

/** The workbench once its code is in (null while it loads), whether the load
 * failed, and whether a retry is reloading the page. `attempt` counts the
 * learner's Try again presses, each of which asks again in place. When a press
 * meets the same chunk failure, as in a browser that remembers failed module
 * fetches, it reloads the page (reloadOnPress in lib/routeRecovery.ts). The
 * first load and the idle warm-up never reload. */
export function useWorkbench(needed: boolean, attempt: number) {
  const [View, setView] = useState(() => workbenchView);
  const [failed, setFailed] = useState(false);
  const [reloading, setReloading] = useState(false);
  useEffect(() => {
    if (!needed || View) return;
    let live = true;
    let grace = 0;
    preloadTaskWorkbench().then((module) => {
      if (live) { setFailed(false); setView(() => module.CodingWorkbench); }
    }, async (error: unknown) => {
      if (live && attempt > 0 && isChunkLoadError(error)) {
        setReloading(true);
        // Busy until the new document arrives; a refused reload (the
        // leave-page prompt) gives the button back.
        if (await reloadOnPress()) await new Promise((resolve) => { grace = window.setTimeout(resolve, RELOAD_GRACE_MS); });
        if (live) setReloading(false);
      }
      if (live) setFailed(true);
    });
    return () => { live = false; window.clearTimeout(grace); };
  }, [needed, View, attempt]);
  return { View, failed, reloading };
}

/** Fetch the workbench's code when the browser has nothing else to do, so a
 * task opened from a list finds it ready. CodeMirror is not part of it: a
 * list visitor who opens no task, or opens one on a phone, never needs it, and
 * a pointer, focus or touch on a task link starts it (routePreload). A visitor
 * who asked the browser to save data gets the workbench when they open a task
 * instead, as the runner waits for their first Run (warmRunner in
 * runner/run-tests.ts). */
export function useWarmWorkbench() {
  useEffect(() => {
    if (workbenchView) return;
    if ((navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const warm = () => { warmWorkbench().catch(() => undefined); };
    // Safari has no requestIdleCallback; a short timer stands in for it.
    const host = window as Pick<Window, 'cancelIdleCallback'> & { requestIdleCallback?: Window['requestIdleCallback'] };
    if (host.requestIdleCallback) {
      const id = host.requestIdleCallback(warm, { timeout: 3000 });
      return () => host.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(id);
  }, []);
}

