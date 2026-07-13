// Synchronous JSON storage facade over AsyncStorage.
//
// The web gamification libs (tokens, shop, xp, settings, bookmarks, …) were
// written against localStorage, which is synchronous. React Native's
// AsyncStorage is not, so we keep an in-memory mirror: `hydrateStorage()` loads
// the known keys once at startup, reads then hit memory synchronously, and
// writes update memory immediately while flushing to disk in the background.
import AsyncStorage from '@react-native-async-storage/async-storage';

const mem = new Map<string, string>();

// The keys the synchronous stores rely on. Hydrated eagerly so the first read
// after startup returns the persisted value rather than the fallback.
const KNOWN_KEYS = [
  'devquiz:tokens:balance:v1',
  'devquiz:tokens:registration-bonus:v1',
  'devquiz:shop:inventory:v1',
  'devquiz:xp:quest:v1',
  'devquiz:xp:rank-seen:v1',
  'devquiz:perfect-quiz-count',
  'devquiz:settings',
  'devquiz:bookmarks',
  'devquiz:bookmarked-questions',
  'devquiz:roadmap:unlocks:v1',
  'devquiz:track',
  'devquiz:color-mode',
];

/** Load persisted values into the in-memory mirror. Call once at startup. */
export async function hydrateStorage(): Promise<void> {
  try {
    const pairs = await AsyncStorage.multiGet(KNOWN_KEYS);
    for (const [k, v] of pairs) if (v != null) mem.set(k, v);
  } catch {
    // best effort — stores fall back to defaults
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = mem.get(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  mem.set(key, raw);
  void AsyncStorage.setItem(key, raw).catch(() => {});
}
