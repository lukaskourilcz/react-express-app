// Which read a coding task page makes (#587 C23). A free task reads its brief
// (public, cached per task) and the caller's part apart; a Premium task and a
// Learn link read the combined answer, since the server refuses the brief of
// Premium content to everyone as to a guest and answers a Learn link by POST.
// It reads the coding index's projected `free` flag (shared/coding-index.ts,
// from shared/tiers.ts isFreeCodingTask) and lives apart from coding/api.ts,
// which the profile and the Learn runner import too: only the task screen
// pays for the index.
import { CODING_INDEX } from '../../../shared/coding-index';

let freeIds: ReadonlySet<string> | undefined;

/** Whether a task page reads its brief and the caller's part apart. */
export function splitsTaskRead(id: string, learnSession?: string): boolean {
  freeIds ??= new Set(CODING_INDEX.filter((task) => task.free === true).map((task) => task.id));
  return !learnSession && freeIds.has(id);
}
