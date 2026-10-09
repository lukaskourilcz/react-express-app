// A learner's code for one task lives in two places: a copy on this device,
// written when they press Run or Submit, and, signed in, the account draft the
// server keeps. The task screen and a Learn level's coding step both open one
// of the two and save through here.
//
// The device copy records the account draft's time it builds on: the time
// the screen loaded, or a later time a save from this device returned. While
// the account draft still has that time, nothing else saved it since, and the
// device copy is the newer. Once it has moved, another device (or a save
// whose answer never came back) wrote it, and nothing here can say which is
// newer: the clocks of two machines do not. The account draft opens then, and
// the copy on this device is set aside and offered back, never dropped. A
// device copy from before these times were kept stands, as every one used to.
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { readJSON, readString, removeStored, writeJSON, writeString } from '../lib/storage';
import { CODING_CODE_LIMIT_BYTES, type CodingDraftResponse } from '../../../shared/coding-api';
import { saveCodingDraft } from './api';

const draftKey = (id: string) => `devshark:coding:draft:${id}`;
// Under the account prefix too, so a sign-out forgets it with the copy.
const draftTimeKey = (id: string) => `devshark:coding:draft-time:${id}`;

interface DraftTime {
  /** The account draft's updated_at this copy builds on, or null for none.
   * It outlives a copy the account took, for the next copy to build on. */
  base: string | null;
}

/** The record of this device's copy, or null for none (or one from before
 * the times were kept). */
function draftTime(id: string): DraftTime | null {
  const time = readJSON<unknown>(draftTimeKey(id), null);
  return time && typeof time === 'object' && 'base' in time ? { base: typeof time.base === 'string' ? time.base : null } : null;
}
/** The later of two account draft times. Both come from the server's clock,
 * so unlike a device's time they compare. */
const later = (a: string | null, b: string | null | undefined): string | null =>
  !b ? a : !a || Date.parse(b) > Date.parse(a) ? b : a;

/** The copy of a task's code on this device, or null. */
export const deviceDraft = (id: string): string | null => readString(draftKey(id));

/** Keep `code` on this device. `base` is the account draft's time as this
 * screen loaded it (null for none, or for a guest); a later one a save from
 * this device returned counts instead. */
export function keepDeviceDraft(id: string, code: string, base: string | null = null): void {
  writeString(draftKey(id), code);
  writeJSON(draftTimeKey(id), { base: later(base, draftTime(id)?.base) } satisfies DraftTime);
}

export function forgetDeviceDraft(id: string): void {
  removeStored(draftKey(id));
  removeStored(draftTimeKey(id));
}

/** Whether the account would take this code: it refuses more than Submit may send. */
export const fitsDraftLimit = (code: string): boolean => new TextEncoder().encode(code).length <= CODING_CODE_LIMIT_BYTES;

/** Which copy the editor opened when the two differed: 'account' when the
 * account draft was saved since this device's copy began, which is then set
 * aside; 'device' when this device's copy builds on the account draft as it
 * still is. */
export type DraftConflict = 'account' | 'device';

export interface OpeningDraft {
  code: string | null;
  conflict: DraftConflict | null;
  /** With 'account': the copy on this device, for the learner to take back. */
  setAside?: string;
}

/** The code a task opens with: this device's copy or the account draft
 * (`account`, saved at `accountAt`). Reads only, and drops nothing: a copy
 * set aside stays on this device until the next Run or Submit replaces it. */
export function openingDraft(id: string, account: string | null, accountAt: string | null | undefined): OpeningDraft {
  const device = deviceDraft(id);
  if (device === null) return { code: account, conflict: null };
  if (account === null || account === device) return { code: device, conflict: null };
  const time = draftTime(id);
  // A time missing on either side (a copy from before they were kept, or an
  // evolving stage's start made from the stage before): the copy stands.
  if (!time || !accountAt) return { code: device, conflict: null };
  if (time.base === accountAt) return { code: device, conflict: 'device' };
  return { code: account, conflict: 'account', setAside: device };
}

// One save per task at a time, in the order they were made: two in flight
// could land in either order and leave the account holding the older code.
// A save still waiting when a newer one is made is not sent at all.
const sending = new Map<string, Promise<void>>();
const newest = new Map<string, number>();
let saves = 0;

/** Save the code a learner ran or submitted: on this device first, so a
 * failed account save still leaves it here, then to the account. A save the
 * account took lets the device copy go unless `keepOnDevice` (an evolving
 * stage's code is also the next stage's offline start), and the copy here,
 * now or next, builds on the time the account returned. Code over the limit
 * is not saved at all: the account would refuse it, and Submit says why. */
export function saveDraft(id: string, code: string, { signedIn, base, keepOnDevice = false }: { signedIn: boolean; base: string | null; keepOnDevice?: boolean }): void {
  if (!fitsDraftLimit(code)) return;
  keepDeviceDraft(id, code, base);
  if (!signedIn) return;
  const turn = ++saves;
  newest.set(id, turn);
  const save = (sending.get(id) ?? Promise.resolve()).then(async () => {
    if (newest.get(id) !== turn) return;
    try {
      // No time from a server older than this client: the copy goes as before.
      const updatedAt = (await saveCodingDraft(id, code))?.updatedAt ?? null;
      if (updatedAt) writeJSON(draftTimeKey(id), { base: later(updatedAt, draftTime(id)?.base) } satisfies DraftTime);
      if (deviceDraft(id) === code && !keepOnDevice) removeStored(draftKey(id));
    } catch { /* the device copy above stands */ }
  });
  sending.set(id, save);
  void save.then(() => { if (sending.get(id) === save) sending.delete(id); });
}

/** The account draft of one task, with its time. */
export function fetchCodingDraft(id: string, signal?: AbortSignal): Promise<CodingDraftResponse> {
  return apiFetch<CodingDraftResponse>(`/api/user/[op]?op=coding-draft&id=${encodeURIComponent(id)}`, { signal });
}

/** The account draft, read fresh each time a screen opens the task. One
 * that cannot load is not retried: the screen opens the device copy. */
export const codingDraftQuery = (id: string) => queryOptions({
  queryKey: ['coding', 'draft', id] as const,
  queryFn: ({ signal }) => fetchCodingDraft(id, signal),
  staleTime: 0,
  gcTime: 0,
  retry: false,
});
