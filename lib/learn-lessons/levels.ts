/** Which Learn levels open with a lesson (#492), by topic and 1-based level.
 *
 * Kept apart from the registry in `./index.ts`, so the level map in
 * `lib/roadmap.ts` can name a level's lesson without loading lesson bodies
 * into every handler that reads the map. `scripts/test-launch-contracts.ts`
 * checks that every id here resolves in the registry and every level exists.
 *
 * DSA Foundations levels 1 and 2 carry the two lessons of the path's first
 * module (docs/learn-sections-fde-flagship-plan.md, section 12.2). They are
 * also the Big O introduction at /learn/big-o. */

export const LEVEL_LESSONS: Readonly<Partial<Record<string, Readonly<Record<number, string>>>>> = {
  dsa: {
    1: 'dsa-v1-d01-l1', 2: 'dsa-v1-d01-l2', 3: 'dsa-v1-d02-l1', 4: 'dsa-v1-d02-l2',
    5: 'dsa-learn-d03', 6: 'dsa-v1-d04-l1', 7: 'dsa-v1-d04-l2', 8: 'dsa-learn-d05',
    9: 'dsa-learn-d06', 10: 'dsa-learn-d07', 11: 'dsa-learn-d08',
    12: 'dsa-v1-d09-l1', 13: 'dsa-v1-d09-l2', 14: 'dsa-learn-complexity-practice', 15: 'dsa-learn-foundation-review',
  },
};

/** The lesson a level opens with, or null for a level that starts with its
 * questions. */
export function levelLessonId(topic: string, level: number): string | null {
  return LEVEL_LESSONS[topic]?.[level] ?? null;
}
