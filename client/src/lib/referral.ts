// Invitations (step D8b, #228). An account's invite link is `/?ref=<code>`.
//
// The browser's part is small on purpose. It keeps the code from the link it
// was opened with, offers it once the visitor has signed in, and forgets it as
// soon as the server has answered. The server decides everything else: it
// binds the code only while the account is new and only once, and it pays both
// sides after the friend's first Learn level. Nothing here names an amount,
// and an invitation never changes access, XP, scores, streaks or ranks.

import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from './api';
import { isReferralCode } from '../../../shared/rewards';

const STORAGE_KEY = 'devshark:referral';
/** A code nobody signed up with in 30 days is dropped. The server's own
 * sign-up window is shorter; this only keeps storage from growing stale. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredReferral {
  code: string;
  savedAt: number;
}

function readStored(now: number): StoredReferral | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredReferral>;
    if (isReferralCode(parsed.code) && typeof parsed.savedAt === 'number' && now - parsed.savedAt <= MAX_AGE_MS) {
      return { code: parsed.code, savedAt: parsed.savedAt };
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked or the value is not JSON: nothing is kept.
  }
  return null;
}

/**
 * Keep the invite code from the address bar and take `ref` out of the URL, so
 * a link the visitor copies onwards does not carry someone else's code. The
 * first invitation wins: a second link does not replace a code already kept.
 * Runs once, before the router mounts.
 */
export function captureReferralFromUrl(
  location: Pick<Location, 'href'> = window.location,
  history: Pick<History, 'replaceState' | 'state'> = window.history,
  now: number = Date.now(),
): string | null {
  let url: URL;
  try {
    url = new URL(location.href);
  } catch {
    return null;
  }
  const raw = url.searchParams.get('ref');
  if (raw === null) return null;
  url.searchParams.delete('ref');
  try {
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // A sandboxed frame may refuse; the code is still kept.
  }
  const code = raw.trim().toLowerCase();
  if (!isReferralCode(code)) return null;
  const kept = readStored(now);
  if (kept) return kept.code;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, savedAt: now } satisfies StoredReferral));
  } catch {
    return null;
  }
  return code;
}

/** The code kept from an invite link, if any. */
export const storedReferral = (now: number = Date.now()): string | null => readStored(now)?.code ?? null;

export function forgetReferral(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export type ReferralClaimStatus = 'recorded' | 'already' | 'unknown' | 'self' | 'closed' | 'off';
export interface ReferralClaimResult {
  status: ReferralClaimStatus;
  /** Coins each side gets. */
  coins: number;
}

/**
 * Offer the kept code for the signed-in account. The server's answer is final,
 * so the code is forgotten whatever it says; only an unreachable server, a
 * rate limit or a server error keeps it for the next page load.
 */
export async function claimStoredReferral(): Promise<ReferralClaimResult | null> {
  const code = storedReferral();
  if (!code) return null;
  try {
    const result = await apiFetch<ReferralClaimResult>('/api/user/referral', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    forgetReferral();
    return result;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    if (status >= 400 && status < 500 && status !== 401 && status !== 429) forgetReferral();
    return null;
  }
}

/** The caller's invite link and counts. Counts only: the server never sends
 * who a friend is. `enabled` is false when the owner has turned invitations
 * off or the migration is not installed yet. */
export interface ReferralSummary {
  enabled: boolean;
  code?: string;
  coins?: number;
  cap?: number;
  /** Friends who finished a first Learn level and paid this account. */
  credited?: number;
  /** Friends who signed up with the link and have not finished a level yet. */
  pending?: number;
  /** This account's own invitation, if a friend invited it. */
  invited?: 'pending' | 'credited' | null;
}

export const referralKey = ['rewards', 'referral'] as const;

export function useReferral(enabled: boolean) {
  return useQuery({
    queryKey: referralKey,
    enabled,
    queryFn: ({ signal }) => apiFetch<ReferralSummary>('/api/user/referral', { signal }),
    staleTime: 60_000,
  });
}

/** The link a learner shares. */
export const inviteLink = (code: string, origin: string = window.location.origin): string => `${origin}/?ref=${code}`;
