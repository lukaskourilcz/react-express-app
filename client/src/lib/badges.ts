// Server-synced badges. This wrapper reads the server-verified earned set (S3)
// and merges it with the shared `SERVER_BADGES` catalog and the two client-only
// signals from `achievements.ts` into one render list. Locked badges are shown
// as explicit goals. Badge eligibility is never claimed by the client — the
// server recomputes it from verified stats + mastery and persists a stable
// earned date; we only decorate that with catalog metadata and i18n KEYS.

import { apiFetch } from './api';
import { CODING_BADGES, SERVER_BADGES, type BadgeTier } from '../../../shared/badges';
import { CURRENT_PRODUCT } from './products';
import { CLIENT_ONLY_BADGES, type AchievementContext } from './achievements';
import type { SubjectId } from './subjects';
import type { TranslationKey } from '../i18n/translations';

/** One server-earned badge with its stable earned timestamp. */
export interface EarnedBadge {
  id: string;
  earnedAt: string;
}

/** GET /api/user/badges result. */
export interface SyncBadgesResult {
  earned: EarnedBadge[];
  masteredLevels: number;
}

/** A badge ready to render: catalog metadata + earned state + i18n KEYS. */
export interface BadgeView {
  id: string;
  tier: BadgeTier;
  glyph: string;
  earned: boolean;
  /** Stable earned timestamp for server badges; null for locked or client-only. */
  earnedAt: string | null;
  /** True for the display-only client signals (perfect, bookmarker). */
  clientOnly: boolean;
  labelKey: TranslationKey;
  descKey: TranslationKey;
}

/** Local context needed to evaluate the two client-only badges. */
export interface ClientBadgeContext {
  perfectQuizzes: number;
  bookmarkCount: number;
}

export const badgeLabelKey = (id: string): TranslationKey => `badge.${id}.label` as TranslationKey;
export const badgeDescKey = (id: string): TranslationKey => `badge.${id}.desc` as TranslationKey;

// Tier + glyph for the client-only badges (which live in achievements.ts and
// carry no tier/glyph of their own). Chosen to sit apart from the server glyphs.
const CLIENT_BADGE_META: Record<string, { tier: BadgeTier; glyph: string }> = {
  perfect: { tier: 'silver', glyph: '☆' },
  bookmarker: { tier: 'bronze', glyph: '❏' },
};

/**
 * Sync + read this subject's earned badges. Triggering the endpoint also
 * persists any newly-earned badges server-side. Never throws: offline /
 * signed-out / migration-missing resolve to an empty earned set (every badge
 * then renders as a locked goal, and the client-only signals still evaluate).
 */
export async function syncBadges(subject: SubjectId): Promise<SyncBadgesResult> {
  try {
    const res = await apiFetch<{ earned?: unknown; masteredLevels?: unknown }>(
      `/api/user/badges?subject=${encodeURIComponent(subject)}`,
    );
    const earned: EarnedBadge[] = Array.isArray(res.earned)
      ? res.earned
          .filter(
            (e): e is { id: string; earnedAt: string } =>
              !!e && typeof e === 'object' &&
              typeof (e as { id?: unknown }).id === 'string' &&
              typeof (e as { earnedAt?: unknown }).earnedAt === 'string',
          )
          .map((e) => ({ id: e.id, earnedAt: e.earnedAt }))
      : [];
    return { earned, masteredLevels: Number(res.masteredLevels) || 0 };
  } catch {
    return { earned: [], masteredLevels: 0 };
  }
}

/**
 * Merge the server-earned set with the full `SERVER_BADGES` catalog and the two
 * client-only signals into one ordered render list (server badges first, in
 * catalog order, then the client-only signals). Locked badges are included as
 * goals. Pure — no network.
 */
export function mergeBadges(
  earned: EarnedBadge[],
  clientCtx: ClientBadgeContext,
): BadgeView[] {
  const earnedMap = new Map(earned.map((e) => [e.id, e.earnedAt]));

  const serverViews: BadgeView[] = SERVER_BADGES.map((b) => ({
    id: b.id,
    tier: b.tier,
    glyph: b.glyph,
    earned: earnedMap.has(b.id),
    earnedAt: earnedMap.get(b.id) ?? null,
    clientOnly: false,
    labelKey: badgeLabelKey(b.id),
    descKey: badgeDescKey(b.id),
  }));

  // devShark adds the coding badges after the shared set; StudyShark has no
  // coding track, so the ids never appear in its earned set either.
  const codingViews: BadgeView[] = CURRENT_PRODUCT.id === 'devshark'
    ? CODING_BADGES.map((b) => ({
      id: b.id,
      tier: b.tier,
      glyph: b.glyph,
      earned: earnedMap.has(b.id),
      earnedAt: earnedMap.get(b.id) ?? null,
      clientOnly: false,
      labelKey: badgeLabelKey(b.id),
      descKey: badgeDescKey(b.id),
    }))
    : [];

  const ctx: AchievementContext = {
    stats: null,
    bookmarkCount: clientCtx.bookmarkCount,
    perfectQuizzes: clientCtx.perfectQuizzes,
  };
  const clientViews: BadgeView[] = CLIENT_ONLY_BADGES.map((b) => {
    const meta = CLIENT_BADGE_META[b.id] ?? { tier: 'bronze' as BadgeTier, glyph: '◇' };
    return {
      id: b.id,
      tier: meta.tier,
      glyph: meta.glyph,
      earned: b.check(ctx),
      earnedAt: null,
      clientOnly: true,
      labelKey: badgeLabelKey(b.id),
      descKey: badgeDescKey(b.id),
    };
  });

  return [...serverViews, ...codingViews, ...clientViews];
}
