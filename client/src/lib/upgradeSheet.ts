// The one upgrade sheet, as a tiny store. Anything can ask for it: a Premium
// lock on the map, a coding card, or the API client when the server answers
// 402 `premium_required`. `UpgradeSheetHost` in App renders it, so there is
// exactly one sheet on screen however many places asked.
import { useSyncExternalStore } from 'react';
import type { GatedKind } from '../../../shared/tiers';

export interface UpgradeRequest {
  /** What was refused, when the request came from a lock or a 402. */
  kind?: GatedKind;
  ref?: string;
  /** The API client asked, for a 402, rather than the learner's press. */
  fromResponse?: boolean;
  /** Increments per request, so asking twice re-announces the sheet. */
  id: number;
}

type UpgradeDetail = { kind?: GatedKind; ref?: string; fromResponse?: boolean };

/** The query key root of the account's plan (`./entitlement`). Kept here so the
 * sheet's host can refresh the plan without loading anything else. */
export const ENTITLEMENT_QUERY_ROOT = ['entitlement'] as const;

let current: UpgradeRequest | null = null;
let counter = 0;
// What had focus when the sheet opened: the lock that was pressed. The sheet
// unmounts on close, and a dialog removed from the page drops focus to
// <body>, so the host gives focus back to this instead.
let opener: HTMLElement | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function openUpgradeSheet(detail: UpgradeDetail = {}): void {
  // A second request while the sheet is open keeps the first opener: focus
  // is inside the sheet by then.
  if (!current && typeof document !== 'undefined') {
    const active = document.activeElement;
    opener = active instanceof HTMLElement && active !== document.body ? active : null;
  }
  counter += 1;
  current = { ...detail, id: counter };
  emit();
}

/** The element that had focus when the sheet opened, handed out once. */
export function takeUpgradeOpener(): HTMLElement | null {
  const element = opener;
  opener = null;
  return element;
}

export function closeUpgradeSheet(): void {
  if (!current) return;
  current = null;
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useUpgradeRequest(): UpgradeRequest | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

// ── A sheet that opens after a reload ──────────────────────────────────────
//
// When the sheet's code fails a second time in one document, the press
// reloads the page (UpgradeSheetHost), since Chromium up to 155 and Safari
// answer a repeated import of a failed module from memory. This mark lets the
// next document open the sheet the learner asked for, as `devshark:auth-resume`
// finishes a sign-in (lib/authReturn.ts).

const RESUME_KEY = 'devshark:upgrade-resume';
// Every GatedKind (the compiler holds the list to the type); anything else in
// storage is dropped.
const KINDS: Record<GatedKind, true> = {
  'learn-level': true,
  'learn-part-test': true,
  'coding-task': true,
  'evolving-stage': true,
  'learning-path': true,
  'merch-redemption': true,
};
const isGatedKind = (value: unknown): value is GatedKind => typeof value === 'string' && Object.prototype.hasOwnProperty.call(KINDS, value);
/** Long enough for a slow reload, short enough that a tab reopened later never
 * opens the sheet by itself. */
export const UPGRADE_RESUME_MAX_AGE_MS = 60_000;

export function markUpgradeResume(detail: { kind?: GatedKind; ref?: string }, now = Date.now()): void {
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify({ kind: detail.kind, ref: detail.ref, at: now }));
  } catch {
    // Without storage the next document cannot open it; the learner presses again.
  }
}

export function clearUpgradeResume(): void {
  try {
    sessionStorage.removeItem(RESUME_KEY);
  } catch {
    // ignore
  }
}

/** The request the document before this one could not open, removed as it is
 * read; null when there is none or it is stale. */
export function takeUpgradeResume(now = Date.now()): { kind?: GatedKind; ref?: string } | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { kind?: unknown; ref?: unknown; at?: unknown };
    if (typeof value.at !== 'number' || now < value.at || now - value.at > UPGRADE_RESUME_MAX_AGE_MS) return null;
    return {
      kind: isGatedKind(value.kind) ? value.kind : undefined,
      ref: typeof value.ref === 'string' && value.ref.length <= 256 ? value.ref : undefined,
    };
  } catch {
    return null;
  }
}
