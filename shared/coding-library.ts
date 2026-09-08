/** Saved challenges and named collections (issue #157).
 *
 * A learner's library is a bookmark list plus any number of named collections,
 * all keyed by the stable coding task id. It is a reading list, never an
 * entitlement: a saved task that the learner's plan does not currently allow
 * stays in the library with an explanation and cannot be launched. */

export const MAX_COLLECTIONS = 20;
export const MAX_COLLECTION_ITEMS = 200;
export const MAX_BOOKMARKS = 500;
export const MAX_COLLECTION_NAME = 40;

export interface CodingCollection {
  id: string;
  name: string;
  /** Ascending; the learner's own order. */
  position: number;
  taskIds: string[];
  updatedAt: string;
}

export interface CodingLibraryResponse {
  bookmarks: string[];
  collections: CodingCollection[];
  limits: {
    collections: number;
    itemsPerCollection: number;
    bookmarks: number;
    nameLength: number;
  };
}

export type CodingLibraryAction =
  | { action: 'bookmark'; taskId: string }
  | { action: 'unbookmark'; taskId: string }
  | { action: 'create-collection'; name: string }
  | { action: 'rename-collection'; id: string; name: string }
  | { action: 'delete-collection'; id: string }
  | { action: 'reorder-collections'; ids: string[] }
  | { action: 'add-to-collection'; id: string; taskId: string }
  | { action: 'remove-from-collection'; id: string; taskId: string };

/** A collection name has to be something a person typed, and short enough to
 * render in a chip. Control characters, runs of whitespace and empty names are
 * refused rather than silently stored. */
export function normalizeCollectionName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .split('')
    .map((char) => (char.codePointAt(0)! < 0x20 || char.codePointAt(0) === 0x7f ? ' ' : char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length === 0 || cleaned.length > MAX_COLLECTION_NAME) return null;
  return cleaned;
}

export const isCollectionId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value);
