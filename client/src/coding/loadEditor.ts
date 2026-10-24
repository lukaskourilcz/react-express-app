// CodeMirror, the workbench's editor, is its own chunk (about 170 KB gzip of
// the workbench's 190): a phone that shows the puzzle or the "bigger screen"
// note instead of an editor never downloads it, a coding list warms the
// workbench without it, and the editor's code is evaluated in a task of its
// own rather than inside the workbench's (perf baseline #587 C03, C12, C21).
import type { Editor as EditorView } from './Editor';

/** Below this width a task waits for a bigger screen, or shows its puzzle,
 * unless the learner chose the editor here (useIsNarrowForEditor). */
export const NARROW_EDITOR_QUERY = '(max-width: 1023.95px)';
// The learner's choice of the editor on a narrow screen, for the rest of the
// browser session (CodingWorkbench).
export const NARROW_EDITOR_KEY = 'devshark:coding:narrow-editor:v1';

export const readNarrowEditor = (): boolean => {
  try { return sessionStorage.getItem(NARROW_EDITOR_KEY) === '1'; } catch { return false; }
};

let loaded: typeof EditorView | null = null;
let pending: Promise<typeof EditorView> | null = null;

/** The editor's code, loaded once. A failed fetch is forgotten, so the next
 * attempt asks the network again. */
export function loadEditor(): Promise<typeof EditorView> {
  if (!pending) {
    pending = import('./Editor').then((module) => {
      loaded = module.Editor;
      return module.Editor;
    });
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

/** The editor, once its code is in; null before. */
export const loadedEditor = (): typeof EditorView | null => loaded;

/** Whether a task opened now would show the editor: a wide screen, or a
 * narrow one where the learner chose the editor. A puzzle or the wait for a
 * bigger screen stands in for it otherwise, and nothing should fetch it. */
export function editorWantedHere(): boolean {
  if (readNarrowEditor()) return true;
  try { return !window.matchMedia(NARROW_EDITOR_QUERY).matches; } catch { return true; }
}
