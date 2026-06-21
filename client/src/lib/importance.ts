// Importance display helpers for the /dev console.
//
// The score itself (1–10, "how important is this for a student to know?") is
// resolved on the server and arrives on each AdminQuestion (DB override →
// hand-judged score → heuristic). The client only needs to band/label/colour it.

export type ImportanceBand = 'filler' | 'low' | 'medium' | 'high' | 'essential';

export function importanceBand(score: number): ImportanceBand {
  if (score <= 3) return 'filler';
  if (score <= 5) return 'low';
  if (score <= 7) return 'medium';
  if (score <= 9) return 'high';
  return 'essential';
}

export const IMPORTANCE_BAND_LABEL: Record<ImportanceBand, string> = {
  filler: 'Filler (1–3)',
  low: 'Low (4–5)',
  medium: 'Medium (6–7)',
  high: 'High (8–9)',
  essential: 'Essential (10)',
};
