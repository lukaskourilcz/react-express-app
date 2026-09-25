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
  /** Increments per request, so asking twice re-announces the sheet. */
  id: number;
}

/** The query key root of the account's plan (`./entitlement`). Kept here so the
 * sheet's host can refresh the plan without loading anything else. */
export const ENTITLEMENT_QUERY_ROOT = ['entitlement'] as const;

let current: UpgradeRequest | null = null;
let counter = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function openUpgradeSheet(detail: { kind?: GatedKind; ref?: string } = {}): void {
  counter += 1;
  current = { ...detail, id: counter };
  emit();
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
