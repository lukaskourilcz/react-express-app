// The first page of a visit asks for its task as the section's code arrives,
// before the task screen renders (perf baseline #587 C16). Its own module, so
// the screen's call to let go costs nothing where no early read was made.
import { QueryObserver, type QueryClient } from '@tanstack/react-query';
import { codingTaskQuery } from './api';

let earlyRead: (() => void) | null = null;
/** Longest the early read keeps an answer the screen has not taken. */
const EARLY_READ_HOLD_MS = 15_000;

/** Ask for a task as the section's code arrives on the first page of a
 * visit, before the task screen renders. An observer of its own keeps the
 * answer (gcTime 0 would drop it) until the screen's read takes it over and
 * calls releaseCodingTaskRead, or EARLY_READ_HOLD_MS passes. */
export function startCodingTaskRead(client: QueryClient, id: string, learnSession?: string): void {
  if (earlyRead) return;
  const observer = new QueryObserver(client, codingTaskQuery(id, learnSession));
  const stop = observer.subscribe(() => {});
  const timer = window.setTimeout(() => earlyRead?.(), EARLY_READ_HOLD_MS);
  earlyRead = () => { window.clearTimeout(timer); stop(); earlyRead = null; };
}

/** The task screen's read is on: the early read lets go of its answer. */
export function releaseCodingTaskRead(): void {
  earlyRead?.();
}
