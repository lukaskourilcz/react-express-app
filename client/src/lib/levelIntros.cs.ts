// Czech (cs) translations of the per-level intro panels (see levelIntros.ts).
// Same shape and ordering as LEVEL_INTROS; consulted by levelIntro() when the
// UI language is Czech, falling back to English when an entry is missing.
// Placeholder — populated once translations are assembled.

import type { RoadmapTopic } from '../types/quiz';

export const LEVEL_INTROS_CS: Partial<Record<RoadmapTopic, string[]>> = {};
