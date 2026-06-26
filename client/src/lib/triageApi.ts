// Loads the pre-computed question-bank triage verdicts (see /triage in the repo
// and triage/README.md). The verdicts are a static overlay keyed by question id;
// the live question text + current deleted state come from the admin API at
// runtime, so this only carries the scores/decision per id.

export interface TriageVerdict {
  /** category */
  cat: string;
  /** difficulty */
  diff: number;
  /** relevance 1-5 */
  rel: number;
  /** discrimination 1-5 */
  disc: number;
  /** difficulty_fit 1-5 */
  fit: number;
  /** clarity 1-5 */
  clar: number;
  /** mean of the four axes */
  mean: number;
  /** any gate tripped */
  gate: boolean;
  /** gate reasons (ambiguous | wrong_or_outdated | trivial_recall) */
  greasons: string[];
  /** flagged as a redundant near-duplicate */
  dup: boolean;
  /** 'keep' | 'cut' under the default rule */
  dec: 'keep' | 'cut';
  /** all reasons contributing to the decision */
  reasons: string[];
  /** judge note (≤1 sentence; present when cut or any score ≤2) */
  note: string;
}

export interface TriageMeta {
  total: number;
  keep: number;
  cut: number;
  generatedFrom: string;
  keepRule: string;
}

export interface TriageData {
  meta: TriageMeta;
  verdicts: Record<string, TriageVerdict>;
}

let cache: TriageData | null = null;

/** Fetch the triage verdicts (cached for the session). */
export async function loadTriageVerdicts(signal?: AbortSignal): Promise<TriageData> {
  if (cache) return cache;
  const res = await fetch('/triage-verdicts.json', { signal });
  if (!res.ok) throw new Error(`Could not load triage verdicts (${res.status})`);
  cache = (await res.json()) as TriageData;
  return cache;
}

export const GATE_LABEL: Record<string, string> = {
  ambiguous: 'Ambiguous',
  wrong_or_outdated: 'Wrong / outdated',
  trivial_recall: 'Trivial recall',
};
