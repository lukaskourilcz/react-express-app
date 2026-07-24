// Shark Cards — the finite, cosmetic per-subject collectible album. This is the
// client wrapper over the shared, pure `shared/cards.ts` catalog plus the two
// account endpoints (S2): read the collection + server-authoritative "a pack is
// ready" flag, and claim today's pack once the Today target is met.
//
// Cards are earned ONLY by finishing the daily Today queue and never affect
// access, XP, scores, streaks, ranks, or AI. `packAvailable` is authoritative —
// it is never recomputed on the client. Localized names are returned as i18n
// KEYS (the component calls t()): topic cards reuse the existing topic label
// (`category.<topic>`), family chase cards use `card.family.<slug>.name`.

import { apiFetch } from './api';
import {
  subjectCards,
  cardById,
  subjectCardCount,
  PACK_SIZE,
  RARITY_ORDER,
  type CardDef,
  type CardRarity,
} from '../../../shared/cards';
import { categoryLabelKey } from './categories';
import type { SubjectId } from './subjects';
import type { TranslationKey } from '../i18n/translations';

// Mirrors the server's DAILY_TARGET. The collection response echoes `target`;
// this is the offline/fallback default only.
export const CARDS_DAILY_TARGET = 3;

export { subjectCards, cardById, subjectCardCount, PACK_SIZE, RARITY_ORDER };
export type { CardDef, CardRarity };

/** One owned card row from the server (a card id + how many copies + when first pulled). */
export interface OwnedCard {
  card_id: string;
  count: number;
  first_earned_at: string;
}

/** GET /api/user/cards result — the album state for a subject. */
export interface CollectionResult {
  cards: OwnedCard[];
  /** Server-authoritative: a pack is ready to claim right now. Never recomputed. */
  packAvailable: boolean;
  target: number;
  /** Total collectible cards in this subject's album. */
  total: number;
}

/** POST /api/user/cards result — the outcome of a pack claim. `cards` are the
 * rolled card ids (empty for `not-yet` / `error`). Normalized so the component
 * always gets a `cards` array. */
export interface PackResult {
  status: 'not-yet' | 'granted' | 'claimed' | 'error';
  cards: string[];
  target: number;
}

/** A card id resolved to its shared visual def + i18n name/rarity KEYS. */
export interface ResolvedCard {
  def: CardDef;
  /** i18n KEY for the card's display name — the component calls t(nameKey). */
  nameKey: TranslationKey;
  /** i18n KEY for the rarity label (`card.rarity.<rarity>`). */
  rarityLabelKey: TranslationKey;
  /** True for a shared shark-family chase card (vs. a subject topic card). */
  isFamily: boolean;
}

/** i18n key for a rarity label. */
export const rarityLabelKey = (rarity: CardRarity): TranslationKey =>
  `card.rarity.${rarity}` as TranslationKey;

/** i18n key for a shared family card's display name. */
export const familyNameKey = (slug: string): TranslationKey =>
  `card.family.${slug}.name` as TranslationKey;

/**
 * Resolve a card id to its visual definition and localized name/rarity KEYS.
 * Returns null for an id that isn't in this subject's album (the component then
 * skips or renders a neutral placeholder). Topic cards reuse the shared topic
 * label; family cards use the shark-family name key.
 */
export function resolveCard(subject: SubjectId, id: string): ResolvedCard | null {
  const def = cardById(subject, id);
  if (!def) return null;
  const nameKey = def.family
    ? familyNameKey(def.family)
    : categoryLabelKey(def.topic ?? '');
  return {
    def,
    nameKey,
    rarityLabelKey: rarityLabelKey(def.rarity),
    isFamily: Boolean(def.family),
  };
}

function sanitizeOwned(input: unknown): OwnedCard[] {
  if (!Array.isArray(input)) return [];
  const out: OwnedCard[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    if (typeof c.card_id !== 'string') continue;
    out.push({
      card_id: c.card_id,
      count: Number(c.count) || 0,
      first_earned_at: typeof c.first_earned_at === 'string' ? c.first_earned_at : '',
    });
  }
  return out;
}

/**
 * Read a subject's owned cards + the authoritative pack-ready flag. Never
 * throws: offline / signed-out / migration-missing all resolve to an empty
 * album with `packAvailable: false` and the correct album `total` (which is a
 * pure, client-known constant).
 */
export async function getCollection(subject: SubjectId): Promise<CollectionResult> {
  const total = subjectCardCount(subject);
  try {
    const res = await apiFetch<Partial<CollectionResult>>(
      `/api/user/cards?subject=${encodeURIComponent(subject)}`,
    );
    return {
      cards: sanitizeOwned(res.cards),
      packAvailable: res.packAvailable === true,
      target: typeof res.target === 'number' ? res.target : CARDS_DAILY_TARGET,
      total: typeof res.total === 'number' ? res.total : total,
    };
  } catch {
    return { cards: [], packAvailable: false, target: CARDS_DAILY_TARGET, total };
  }
}

/**
 * Claim today's pack for a subject. The server re-verifies the daily target
 * (never trusting the client) and returns `granted` (fresh), `claimed` (already
 * granted today), or `not-yet`. Never throws: a failure resolves to
 * `{ status: 'error', cards: [] }` so the component can show a claim error.
 */
export async function claimPack(subject: SubjectId): Promise<PackResult> {
  try {
    const res = await apiFetch<{ status?: unknown; cards?: unknown; target?: unknown }>(
      '/api/user/cards',
      { method: 'POST', body: JSON.stringify({ subject }) },
    );
    const status =
      res.status === 'granted' || res.status === 'claimed' || res.status === 'not-yet'
        ? res.status
        : 'error';
    const cards = Array.isArray(res.cards)
      ? res.cards.filter((c): c is string => typeof c === 'string')
      : [];
    return {
      status,
      cards,
      target: typeof res.target === 'number' ? res.target : CARDS_DAILY_TARGET,
    };
  } catch {
    return { status: 'error', cards: [], target: CARDS_DAILY_TARGET };
  }
}
