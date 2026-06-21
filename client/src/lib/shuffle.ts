// Presentation-time shuffling for the learning path.
//
// The roadmap is an unscored learning mode whose answer key is shipped to the
// client, so a plain (non-cryptographic) shuffle is fine here. What matters for
// the learner is *variety*: questions and answers must not appear in the same
// order every time, otherwise the position of the right answer becomes
// memorisable. `shuffleDifferentFrom` guarantees the new arrangement differs
// from the previous one (the order shown "before"), so replays never reproduce
// the same layout.

/** Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** True when two arrays hold the same elements in the same positions. */
function sameOrder<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * Shuffle `items` into an order that is positionally different from `avoid`
 * (which must contain the same elements). Tries random shuffles first; if those
 * keep matching (tiny arrays, bad luck) it falls back to the first adjacent swap
 * that breaks the match. Arrays shorter than 2 — or whose elements are all
 * identical — are returned unchanged, since no distinguishable reorder exists.
 */
export function shuffleDifferentFrom<T>(items: T[], avoid: T[]): T[] {
  if (items.length < 2) return items.slice();
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = shuffle(items);
    if (!sameOrder(candidate, avoid)) return candidate;
  }
  // Deterministic fallback: any adjacent swap that yields a different order.
  const out = items.slice();
  for (let i = 0; i < out.length - 1; i++) {
    [out[i], out[i + 1]] = [out[i + 1], out[i]];
    if (!sameOrder(out, avoid)) return out;
    [out[i], out[i + 1]] = [out[i + 1], out[i]];
  }
  return out;
}
