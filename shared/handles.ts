/**
 * The handle rule: the address friends add you by, and since migration 055
 * the sharkname the boards show. One copy for the API (lib/friends-handlers.ts)
 * and the client (client/src/lib/friends.ts), so the two cannot drift from each
 * other or from the database, which enforces the same rule again
 * (user_handles_handle_check and user_handles_not_reserved).
 *
 * 3 to 32 characters: letters, digits, hyphens and underscores, starting and
 * ending with a letter or digit. Migration 033 allowed 24; 055 raised it to 32
 * so a generated sharkname such as `shark-so-fat-it-cant-swim` fits.
 */

export const HANDLE_MAX_LENGTH = 32;

export const HANDLE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,30}[A-Za-z0-9]$/;

/** The words migration 033's CHECK refuses as a whole handle, lower-cased. */
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'support', 'help', 'staff', 'team',
  'shark', 'studyshark', 'devshark', 'sharkira', 'learner', 'anonymous',
  'me', 'you', 'system', 'root', 'null', 'undefined',
]);

/** True when the database would accept `value` (after trimming) as a handle. */
export function isValidHandle(value: string): boolean {
  const handle = value.trim();
  return HANDLE_PATTERN.test(handle) && !RESERVED_HANDLES.has(handle.toLowerCase());
}
