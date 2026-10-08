// A learner's code for one task lives in two places: a copy on this device,
// written when they press Run or Submit, and, signed in, the account draft the
// server keeps. The task screen and a Learn level's coding step both open the
// newer of the two and save through here.
//
// The device copy records when it was written and the account draft's time
// as this device last saw it. While the account draft still has that time,
// nothing else saved it since, and the device copy is the newer whatever the
// clocks say. Once it has moved, another device (or this one, earlier) saved
// it, and the two times decide. A device copy from before the times were kept
// stands, as every device copy used to.
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { readJSON, readString, removeStored, writeJSON, writeString } from '../lib/storage';
import { CODING_CODE_LIMIT_BYTES, type CodingDraftResponse } from '../../../shared/coding-api';
import { saveCodingDraft } from './api';

const draftKey = (id: string) => `devshark:coding:draft:${id}`;
// Under the account prefix too, so a sign-out forgets it with the copy.
const draftTimeKey = (id: string) => `devshark:coding:draft-time:${id}`;

interface DraftTime {
  /** When this device wrote the copy, in its own clock. */
  at: number;
  /** The account draft's updated_at this device had when it did, or null. */
  base: string | null;
}

/** The copy of a task's code on this device, or null. */
export const deviceDraft = (id: string): string | null => readString(draftKey(id));

/** Keep `code` on this device. `base` is the account draft's time as this
 * screen loaded it (null for none, or for a guest). */
export function keepDeviceDraft(id: string, code: string, base: string | null = null): void {
  writeString(draftKey(id), code);
  writeJSON(draftTimeKey(id), { at: Date.now(), base } satisfies DraftTime);
}

export function forgetDeviceDraft(id: string): void {
  removeStored(draftKey(id));
  removeStored(draftTimeKey(id));
}

/** Whether the account would take this code: it refuses more than Submit may send. */
export const fitsDraftLimit = (code: string): boolean => new TextEncoder().encode(code).length <= CODING_CODE_LIMIT_BYTES;

/** Which copy the editor opened when the two differed: 'account' when the
 * account draft was newer and replaced this device's copy, 'device' when this
 * device's copy was newer than the account draft. */
export type DraftConflict = 'account' | 'device';

export interface OpeningDraft {
  code: string | null;
  conflict: DraftConflict | null;
}

/** The code a task opens with: the newer of this device's copy and the
 * account draft (`account`, saved at `accountAt`). Reads only; a caller that
 * opened the account draft over a device copy forgets the copy itself. */
export function openingDraft(id: string, account: string | null, accountAt: string | null | undefined): OpeningDraft {
  const device = deviceDraft(id);
  if (device === null) return { code: account, conflict: null };
  if (account === null || account === device) return { code: device, conflict: null };
  const time = readJSON<Partial<DraftTime> | null>(draftTimeKey(id), null);
  const saved = accountAt ? Date.parse(accountAt) : NaN;
  // A time missing on either side (a copy from before they were kept, or an
  // evolving stage's start made from the stage before): the copy stands.
  if (typeof time?.at !== 'number' || !Number.isFinite(saved)) return { code: device, conflict: null };
  if ((time.base ?? null) === accountAt || saved <= time.at) return { code: device, conflict: 'device' };
  return { code: account, conflict: 'account' };
}

/** Save the code a learner ran or submitted: on this device first, so a
 * failed account save still leaves it here, then to the account. A save the
 * account took lets the device copy go unless `keepOnDevice` (an evolving
 * stage's code is also the next stage's offline start). Code over the limit
 * is not saved at all: the account would refuse it, and Submit says why. */
export function saveDraft(id: string, code: string, { signedIn, base, keepOnDevice = false }: { signedIn: boolean; base: string | null; keepOnDevice?: boolean }): void {
  if (!fitsDraftLimit(code)) return;
  keepDeviceDraft(id, code, base);
  if (!signedIn) return;
  saveCodingDraft(id, code).then(() => {
    if (!keepOnDevice && deviceDraft(id) === code) forgetDeviceDraft(id);
  }).catch(() => { /* the device copy above stands */ });
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
