// Safe localStorage access. Every read/write is wrapped so a disabled,
// full, or private-mode storage degrades gracefully instead of throwing.
// Used by settings, bookmarks, achievements, color mode and language.

/** Read and JSON-parse a value, returning `fallback` if missing or unparseable. */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

/** JSON-stringify and store a value, ignoring quota/private-mode failures. */
export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore — storage is best-effort
  }
}

/** Read a raw string value (no JSON parsing), or null if missing/unavailable. */
export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Store a raw string value, ignoring quota/private-mode failures. */
export function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore — storage is best-effort
  }
}
