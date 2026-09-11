// Friends — the client wrapper for the handle, the lookup and the list.
//
// There is no directory to browse. An account is reachable only by a handle
// its owner claimed, matched exactly, so this module has a lookup and not a
// search: one handle in, one answer out. Everything a friend's row contains is
// computed by the server from the server's own records; nothing here is ever
// the source of a number.

import { apiFetch } from './api';

export interface HandleState {
  /** null until the learner claims one — and until then nobody can find them. */
  handle: string | null;
  /** False means no new person can find you. It does not unmake a friendship. */
  discoverable: boolean;
  /** ISO 3166-1 alpha-2, or null for no flag. Declaring one is optional. */
  country: string | null;
  /** When the handle may next change, or null when it never has been set. */
  canChangeAt: string | null;
}

/** How the caller stands with the account they looked up. `none` covers both
 * "no relationship" and "they blocked you", on purpose: a block that announces
 * itself is a signal, and that is the one thing it must not be. */
export type FriendState =
  | 'none' | 'self' | 'accepted' | 'blocked'
  | 'pending_in' | 'pending_out' | 'declined_in' | 'declined_out';

export interface LookupResult {
  found: boolean;
  handle?: string;
  state?: FriendState;
}

export interface Friend {
  handle: string;
  picture: string | null;
  /** ISO 3166-1 alpha-2, or null. Shown as a flag, never ranked. */
  country: string | null;
  /** Owned and worn. A picture, and never a term in the ordering. */
  crown: boolean;
  currentStreak: number;
  longestStreak: number;
  totalCorrect: number;
  totalQuestions: number;
  accuracyPct: number;
  activeToday: boolean;
}

export interface FriendRequest {
  handle: string;
  direction: 'incoming' | 'outgoing';
}

export interface FriendsResponse {
  friends: Friend[];
  requests: FriendRequest[];
}

// `api/user/[op].ts` is a dynamic route: the last path segment *is* the op, the
// same way /api/user/advisor and /api/user/cards reach theirs.
const OP = (op: string) => `/api/user/${op}`;

/** Same shape the database enforces, so a typo is answered without a round trip. */
export const HANDLE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,22}[A-Za-z0-9]$/;
export const isValidHandle = (value: string): boolean => HANDLE_PATTERN.test(value.trim());

export const getHandle = (): Promise<HandleState> => apiFetch<HandleState>(OP('friends-handle'));

export const setHandle = (handle: string): Promise<{ handle: string }> =>
  apiFetch(OP('friends-handle'), { method: 'PUT', body: JSON.stringify({ handle: handle.trim() }) });

export const setDiscoverable = (discoverable: boolean): Promise<{ discoverable: boolean }> =>
  apiFetch(OP('friends-handle'), { method: 'PUT', body: JSON.stringify({ discoverable }) });

/** `''` clears it. The server stores no empty string: blank means no flag. */
export const setCountry = (country: string): Promise<{ country: string | null }> =>
  apiFetch(OP('friends-handle'), { method: 'PUT', body: JSON.stringify({ country }) });

export const lookupFriend = (handle: string, signal?: AbortSignal): Promise<LookupResult> =>
  apiFetch(`/api/user/friends-lookup?handle=${encodeURIComponent(handle.trim())}`, { signal });

export const requestFriend = (handle: string): Promise<{ state: FriendState }> =>
  apiFetch(OP('friends-request'), { method: 'POST', body: JSON.stringify({ handle }) });

export const respondFriend = (handle: string, accept: boolean): Promise<{ state: FriendState }> =>
  apiFetch(OP('friends-respond'), { method: 'POST', body: JSON.stringify({ handle, accept }) });

export const removeFriend = (handle: string): Promise<{ removed: boolean }> =>
  apiFetch(OP('friends-remove'), { method: 'POST', body: JSON.stringify({ handle }) });

export const listFriends = (): Promise<FriendsResponse> => apiFetch<FriendsResponse>(OP('friends-list'));
