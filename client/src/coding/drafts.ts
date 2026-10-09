// A learner's code for one task lives in two places: a copy on this device,
// written a second after they stop typing and again when they press Run or
// Submit, and, signed in, the account draft the server keeps, saved on Run and
// Submit only. The task screen and a Learn level's coding step both open one
// of the two and save through here.
//
// The device copy records the account draft's time it builds on: the time
// the screen loaded, or a later time a save from this tab returned. While
// the account draft still has that time, nothing else saved it since, and the
// device copy is the newer. Once it has moved, another device (or a save
// whose answer never came back) wrote it, and nothing here can say which is
// newer: the clocks of two machines do not. The account draft opens then, and
// the copy on this device is set aside and offered back, never dropped. A
// device copy from before these times were kept stands, as every one used to.
//
// An account save sends the same time, and the server refuses it when the
// account draft moved since (migration 059): the page then says so and lets
// the learner keep this code over the other or open the other one. Typing
// never moves that time; only a save the account confirmed does, or the
// learner's choice to save over the other draft.
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../lib/api';
import { DRAFT_KEY, KEPT_DRAFTS, accountEpoch, beforeAccountChange, keptDrafts } from '../lib/accountData';
import { signedInAccount } from '../lib/auth';
import { readJSON, readString, removeStored, writeJSON, writeString } from '../lib/storage';
import { CODING_CODE_LIMIT_BYTES, type CodingDraftResponse } from '../../../shared/coding-api';
import { saveCodingDraft } from './api';

// Under the account prefix, so a chosen sign-out forgets them and an
// involuntary one keeps them for the account (lib/accountData.ts).
const draftKey = (id: string) => `devshark:coding:draft:${id}`;
const draftTimeKey = (id: string) => `devshark:coding:draft-time:${id}`;
// A device copy that another draft replaced on screen, kept until the learner
// takes it back or the account confirms a save of this task.
const asideKey = (id: string) => `devshark:coding:draft-aside:${id}`;

interface DraftTime {
  /** The account draft's updated_at this copy builds on, or null for none. */
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

// What this tab knows and storage does not, per task: the latest account
// draft time its code builds on (a save from this tab returned it, or the
// learner chose to save over a draft of that time; another tab's saves are
// not this tab's to build on), the code it last wrote to the device copy, and
// the time of a draft the account refused to overwrite. All of it belongs to
// the account signed in, and goes when that changes.
const builtOn = new Map<string, string>();
const written = new Map<string, string>();
const conflicts = new Map<string, string>();
const conflictListeners = new Set<() => void>();
const conflictChanged = () => conflictListeners.forEach((listener) => listener());

/** The time a screen's code builds on: what it opened, or later. */
const baseOf = (id: string, base: string | null) => later(base, builtOn.get(id));

/** The copy of a task's code on this device, or null. */
export const deviceDraft = (id: string): string | null => readString(draftKey(id));

/** Keep `code` on this device. `base` is the account draft's time as this
 * screen opened it (null for none, or for a guest); a later one a save from
 * this tab returned counts instead. A different copy here built on another
 * time (another device's draft opened over it, or another tab wrote it) is
 * set aside, not overwritten. `epoch` (lib/accountData.ts) is the account
 * the screen opened under: once that account is gone, nothing is written. */
export function keepDeviceDraft(id: string, code: string, base: string | null = null, epoch?: number): void {
  if (epoch !== undefined && epoch !== accountEpoch()) return;
  const at = baseOf(id, base);
  const current = deviceDraft(id);
  const time = draftTime(id);
  if (current !== null && current !== code && time && time.base !== at) writeString(asideKey(id), current);
  writeString(draftKey(id), code);
  writeJSON(draftTimeKey(id), { base: at } satisfies DraftTime);
  written.set(id, code);
}

/** Take back the copy `code` the page offered: it becomes this device's copy,
 * built on the draft open now (`base`), so the next visit opens it too. */
export function restoreDeviceDraft(id: string, code: string, base: string | null): void {
  cancelAutosave(id);
  keepDeviceDraft(id, code, base);
  if (readString(asideKey(id)) === code) removeStored(asideKey(id));
}

export function forgetDeviceDraft(id: string, epoch?: number): void {
  if (epoch !== undefined && epoch !== accountEpoch()) return;
  removeStored(draftKey(id));
  removeStored(draftTimeKey(id));
  removeStored(asideKey(id));
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
  /** A copy on this device that did not open, for the learner to take back:
   * the one the account draft opened over ('account'), or one set aside on
   * an earlier visit. */
  setAside?: string;
  /** The account this was decided under (lib/accountData.ts accountEpoch). */
  epoch: number;
}

/** The drafts a sign-out the learner did not choose kept for the account
 * signed in now come back as the device copies they were
 * (lib/accountData.ts). A copy a guest wrote here since stays too, set aside
 * beside the account's, never lost under it. */
function takeBackKeptDrafts(): void {
  const held = keptDrafts();
  if (!held || held.userId !== signedInAccount()) return;
  flushAll();
  removeStored(KEPT_DRAFTS);
  const guests = new Map<string, string | null>();
  for (const [key, value] of Object.entries(held.drafts)) {
    const [, kind, id] = DRAFT_KEY.exec(key) ?? [];
    if (!id) continue;
    if (!guests.has(id)) guests.set(id, deviceDraft(id));
    const guest = guests.get(id) ?? null;
    const mine = held.drafts[draftKey(id)];
    if (!kind && guest !== null && guest !== value) writeString(asideKey(id), guest);
    // The account's copy replaces a guest's, with its time; the guest's copy
    // takes the place of the account's set-aside one.
    if (guest === null || !kind || (kind === '-time' ? mine !== undefined : mine === undefined || guest === mine)) writeString(key, value);
  }
}

/** The tasks whose code a sign-out the learner did not choose keeps for an
 * account, out of sight until it signs in. */
export const keptDraftTasks = (): string[] =>
  Object.keys(keptDrafts()?.drafts ?? {}).map((key) => DRAFT_KEY.exec(key)).flatMap((match) => (match && match[1] !== '-time' ? [match[2]] : []));

/** The code a task opens with: this device's copy or the account draft
 * (`account`, saved at `accountAt`). Drops nothing: a copy that did not open
 * stays on this device until the learner takes it back or the account
 * confirms a save of this task. */
export function openingDraft(id: string, account: string | null, accountAt: string | null | undefined): OpeningDraft {
  takeBackKeptDrafts();
  const epoch = accountEpoch();
  const device = deviceDraft(id);
  const aside = readString(asideKey(id));
  const opened = (code: string | null, conflict: DraftConflict | null): OpeningDraft =>
    aside !== null && aside !== code ? { code, conflict, setAside: aside, epoch } : { code, conflict, epoch };
  if (device === null) return opened(account, null);
  if (account === null || account === device) return opened(device, null);
  const time = draftTime(id);
  // A time missing on either side (a copy from before they were kept, or an
  // evolving stage's start made from the stage before): the copy stands.
  if (!time || !accountAt) return opened(device, null);
  if (time.base === accountAt) return opened(device, 'device');
  return { code: account, conflict: 'account', setAside: device, epoch };
}

// Typing keeps a device copy once the learner pauses: nothing is written
// while they type, so the editor never waits on storage, and a reload, a
// closed tab or a crash a second later still finds the code. Leaving the page
// or the task writes what is waiting at once.
const AUTOSAVE_MS = 1_000;
const waiting = new Map<string, { code: string; base: string | null; epoch: number; timer: number }>();

/** Keep `code` on this device about a second after the last keystroke.
 * Never sent to the account, and never moves the copy's time. */
export function autosaveDraft(id: string, code: string, base: string | null, epoch: number): void {
  const before = waiting.get(id);
  if (before) window.clearTimeout(before.timer);
  waiting.set(id, { code, base, epoch, timer: window.setTimeout(() => flushAutosave(id), AUTOSAVE_MS) });
}

/** Write a task's waiting copy now. */
export function flushAutosave(id: string): void {
  const next = waiting.get(id);
  if (!next) return;
  cancelAutosave(id);
  keepDeviceDraft(id, next.code, next.base, next.epoch);
}
function cancelAutosave(id: string): void {
  window.clearTimeout(waiting.get(id)?.timer);
  waiting.delete(id);
}
const flushAll = () => [...waiting.keys()].forEach(flushAutosave);
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll(); });
}
// What was typed reaches storage before the account's drafts are forgotten
// or kept, and this tab's memory of that account goes with them.
beforeAccountChange(() => {
  flushAll();
  builtOn.clear();
  written.clear();
  conflicts.clear();
  conflictChanged();
});

/** The time of the account draft that refused this task's last save from
 * here, saved since from another device or tab; null when none did. */
export const draftConflict = (id: string | null): string | null => (id ? conflicts.get(id) ?? null : null);
export function subscribeDraftConflicts(listener: () => void): () => void {
  conflictListeners.add(listener);
  return () => conflictListeners.delete(listener);
}
function setConflict(id: string, at: string | null): void {
  if ((conflicts.get(id) ?? null) === at) return;
  if (at) conflicts.set(id, at);
  else conflicts.delete(id);
  conflictChanged();
}

// One save per task at a time, in the order they were made: two in flight
// could land in either order and leave the account holding the older code.
// A save still waiting when a newer one is made is not sent at all.
const sending = new Map<string, Promise<void>>();
const newest = new Map<string, number>();
let saves = 0;

interface SaveOptions {
  signedIn: boolean;
  /** The account draft's time the screen opened (see keepDeviceDraft). */
  base: string | null;
  /** The account the screen opened under (OpeningDraft.epoch). */
  epoch?: number;
  /** An evolving stage's code is also the next stage's offline start. */
  keepOnDevice?: boolean;
}

/** Save the code a learner ran or submitted: on this device first, so a
 * failed account save still leaves it here, then to the account. A save the
 * account took lets the device copy go unless `keepOnDevice`, and the copy
 * here, now or next, builds on the time the account returned. One the
 * account refused because its draft moved since leaves the copy here as it
 * was and records the conflict for the page to ask about. Code over the
 * limit stays on this device only, since the account would refuse it: the
 * answer is 'tooLarge', and the caller says so. */
export function saveDraft(id: string, code: string, { signedIn, base, epoch = accountEpoch(), keepOnDevice = false }: SaveOptions): 'tooLarge' | null {
  if (epoch !== accountEpoch()) return null;
  cancelAutosave(id);
  keepDeviceDraft(id, code, base);
  if (!fitsDraftLimit(code)) return signedIn ? 'tooLarge' : null;
  if (!signedIn) return null;
  const turn = ++saves;
  newest.set(id, turn);
  const save = (sending.get(id) ?? Promise.resolve()).then(async () => {
    if (newest.get(id) !== turn || epoch !== accountEpoch()) return;
    try {
      // No time from a server older than this client: the copy goes as before.
      const updatedAt = (await saveCodingDraft(id, code, baseOf(id, base)))?.updatedAt ?? null;
      if (epoch !== accountEpoch()) return;
      setConflict(id, null);
      removeStored(asideKey(id));
      if (updatedAt) confirm(id, updatedAt);
      if (deviceDraft(id) === code && !keepOnDevice) removeStored(draftKey(id));
    } catch (error) {
      // The device copy above stands. A refusal names the newer draft.
      const at = error instanceof ApiError && error.code === 'draft_conflict' ? error.detail?.updatedAt : null;
      if (typeof at === 'string' && epoch === accountEpoch()) setConflict(id, at);
    }
  });
  sending.set(id, save);
  void save.then(() => { if (sending.get(id) === save) sending.delete(id); });
  return null;
}

/** The account holds this tab's code as of `updatedAt`: later code from here
 * builds on it, and so does a copy this tab wrote since. */
function confirm(id: string, updatedAt: string): void {
  builtOn.set(id, baseOf(id, updatedAt) ?? updatedAt);
  const device = deviceDraft(id);
  if (device !== null && device === written.get(id)) writeJSON(draftTimeKey(id), { base: baseOf(id, draftTime(id)?.base ?? null) } satisfies DraftTime);
}

/** Submit stored an evolving stage's code as its draft at `updatedAt`
 * (CodingVerdictResponse.draftUpdatedAt). */
export function draftStoredBySubmit(id: string, updatedAt: string, epoch: number): void {
  if (epoch === accountEpoch()) confirm(id, updatedAt);
}

/** The learner keeps the code on this device over the draft the account
 * refused to replace: it is saved again, built on that draft's time. */
export function keepDraftOverConflict(id: string, options: Omit<SaveOptions, 'base'>): void {
  const at = conflicts.get(id);
  if (!at) return;
  flushAutosave(id);
  builtOn.set(id, at);
  setConflict(id, null);
  const code = deviceDraft(id);
  if (code !== null) saveDraft(id, code, { ...options, base: at });
}

/** The draft the account refused to replace, for the learner who asked to
 * open it; the copy on this device stays and is offered back. */
export async function takeConflictingDraft(id: string): Promise<CodingDraftResponse> {
  flushAutosave(id);
  const draft = await fetchCodingDraft(id);
  setConflict(id, null);
  return draft;
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
