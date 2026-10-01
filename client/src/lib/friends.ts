// Friends — the client wrapper for the handle, the lookup and the list.
//
// There is no directory to browse. An account is reachable only by a handle
// its owner claimed, matched exactly, so this module has a lookup and not a
// search: one handle in, one answer out. Everything a friend's row contains is
// computed by the server from the server's own records; nothing here is ever
// the source of a number.

import { apiFetch } from './api';
import { isValidHandle } from '../../../shared/handles';

export { isValidHandle };

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
  /** The handle, or an accepted friend's chosen name (migration 055). */
  displayName?: string;
}

export interface Friend {
  handle: string;
  /** Their sharkname, or their Google name if they chose to show it. */
  displayName: string;
  /** Their Google photo, only when they switched it on; otherwise initials. */
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
  /** Incoming: the asker's chosen name. Outgoing: the other side's sharkname. */
  displayName: string;
  direction: 'incoming' | 'outgoing';
}

/** What friends see of the signed-in learner (op=identity, migration 055). */
export interface Identity {
  /** Friends see `realName` instead of the sharkname. */
  showRealName: boolean;
  /** Friends see `photo` instead of an initials avatar. */
  showPhoto: boolean;
  /** The account's Google name, or null (an email/password account). */
  realName: string | null;
  /** The account's Google photo, or null. */
  photo: string | null;
}

export interface FriendsResponse {
  friends: Friend[];
  requests: FriendRequest[];
}

// `api/user/[op].ts` is a dynamic route: the last path segment *is* the op, the
// same way /api/user/advisor and /api/user/cards reach theirs.
const OP = (op: string) => `/api/user/${op}`;

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

export const getIdentity = (): Promise<Identity> => apiFetch<Identity>(OP('identity'));

/** Send only the switch that changed; the server leaves the other alone. */
export const setIdentity = (change: { showRealName?: boolean; showPhoto?: boolean }): Promise<Identity> =>
  apiFetch(OP('identity'), { method: 'PUT', body: JSON.stringify(change) });
