// Learning paths handed to a named account without the usual prerequisite
// ladder or skill-check run.
//
// Grants are resolved on the server from the verified token's email claim and
// merged into the extras blob `/api/quiz/roadmap?resource=progress` returns, so
// the browser can never mint one for itself — the same rule the skill-check
// unlocks follow.
//
// A grant only opens a path early. Learning stays free for everyone, and a
// grant never touches content, explanations, XP, scores, streaks, ranks, or
// leaderboards.

import { isRoadmapTopic, type RoadmapTopic } from './roadmap';

/** Paths the owner account can open regardless of prerequisites. */
const OWNER_GRANTS: readonly RoadmapTopic[] = ['system-design'];

/**
 * The topics granted to `email`, or an empty array for everyone else.
 * `ownerEmail` comes from the stored game settings, so the owner address can be
 * changed without a deploy.
 */
export function grantedTopicsFor(
  email: string | null | undefined,
  ownerEmail: string,
): RoadmapTopic[] {
  if (typeof email !== 'string' || !email) return [];
  if (email.toLowerCase() !== ownerEmail.toLowerCase()) return [];
  return [...OWNER_GRANTS];
}

/** `unlocked` plus any grants for `email`, de-duplicated and order-stable. */
export function withGrantedTopics(
  unlocked: string[],
  email: string | null | undefined,
  ownerEmail: string,
): string[] {
  const grants = grantedTopicsFor(email, ownerEmail).filter(
    (topic) => isRoadmapTopic(topic) && !unlocked.includes(topic),
  );
  return grants.length > 0 ? [...unlocked, ...grants] : unlocked;
}
