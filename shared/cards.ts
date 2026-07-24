/** Finite, cosmetic "Shark Cards" catalog shared by browser and server code.
 *
 * Cards are earned only by finishing a subject's daily Today queue and never
 * bought, sold, or traded for anything that affects learning, XP, or ranking —
 * they are a pure collection layer. Each subject's album is its real topics
 * (banded into rarities) plus a small shared shark-family chase set. Visuals are
 * procedural (a rarity glyph + a hue derived from the id), so no raster art is
 * shipped. Localized names live in the client i18n tables: topic cards reuse the
 * existing topic label, family cards use `card.family.<slug>.name`. */

import { SUBJECT_SCOPE_CATALOG, type ScopeSubjectId } from './subject-catalog';

export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CardDef {
  id: string;
  subject: ScopeSubjectId;
  rarity: CardRarity;
  glyph: string;
  /** 0–359 hue for the procedural card gradient. */
  hue: number;
  /** Topic id for a topic card; the client resolves its localized label. */
  topic?: string;
  /** i18n name slug for a shared family card. */
  family?: string;
}

export const PACK_SIZE = 3;

export const RARITY_ORDER: readonly CardRarity[] = ['common', 'rare', 'epic', 'legendary'];

const RARITY_GLYPH: Record<CardRarity, string> = {
  common: '•',
  rare: '◆',
  epic: '✦',
  legendary: '❖',
};

// Shared chase cards: the StudyShark family plus the Sharkira coach. They appear
// in every subject's album so the rarest pulls feel special across subjects.
const FAMILY_CARDS: { slug: string; rarity: CardRarity; hue: number }[] = [
  { slug: 'sharkira', rarity: 'legendary', hue: 268 },
  { slug: 'geo', rarity: 'epic', hue: 150 },
  { slug: 'quant', rarity: 'epic', hue: 210 },
  { slug: 'chrono', rarity: 'epic', hue: 28 },
  { slug: 'reef', rarity: 'rare', hue: 190 },
];

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Band a subject's topics into rarities by position: the earlier, foundational
// topics are common; the later, advanced topics are the rare chase cards.
function topicRarity(index: number, count: number): CardRarity {
  const ratio = count <= 1 ? 0 : index / (count - 1);
  if (ratio >= 0.85) return 'legendary';
  if (ratio >= 0.6) return 'epic';
  if (ratio >= 0.3) return 'rare';
  return 'common';
}

const CACHE = new Map<ScopeSubjectId, CardDef[]>();

/** The complete, finite album for a subject (topic cards + family chase set). */
export function subjectCards(subject: ScopeSubjectId): CardDef[] {
  const cached = CACHE.get(subject);
  if (cached) return cached;
  const topics = SUBJECT_SCOPE_CATALOG[subject].topics;
  const topicCards: CardDef[] = topics.map((topic, i) => {
    const rarity = topicRarity(i, topics.length);
    return {
      id: `${subject}-topic-${topic}`,
      subject,
      rarity,
      glyph: RARITY_GLYPH[rarity],
      hue: hashSeed(`${subject}:${topic}`) % 360,
      topic,
    };
  });
  const familyCards: CardDef[] = FAMILY_CARDS.map((f) => ({
    id: `family-${f.slug}`,
    subject,
    rarity: f.rarity,
    glyph: RARITY_GLYPH[f.rarity],
    hue: f.hue,
    family: f.slug,
  }));
  const all = [...topicCards, ...familyCards];
  CACHE.set(subject, all);
  return all;
}

export function cardById(subject: ScopeSubjectId, id: string): CardDef | undefined {
  return subjectCards(subject).find((c) => c.id === id);
}

/** Total collectible cards in a subject's album. */
export function subjectCardCount(subject: ScopeSubjectId): number {
  return subjectCards(subject).length;
}

// Pack odds. Draw 1–2 use the base table; the final draw is upgraded so every
// pack yields at least a rare-or-better "chase" slot.
const BASE_WEIGHTS: Record<CardRarity, number> = { common: 58, rare: 27, epic: 12, legendary: 3 };
const CHASE_WEIGHTS: Record<CardRarity, number> = { common: 0, rare: 60, epic: 32, legendary: 8 };

function rollRarity(rng: () => number, weights: Record<CardRarity, number>): CardRarity {
  const total = RARITY_ORDER.reduce((sum, r) => sum + weights[r], 0);
  let roll = rng() * total;
  for (const rarity of RARITY_ORDER) {
    roll -= weights[rarity];
    if (roll < 0) return rarity;
  }
  return 'common';
}

function pickOfRarity(cards: CardDef[], rarity: CardRarity, rng: () => number): CardDef | undefined {
  // Prefer the exact rarity, then step down (down to common) so a small album
  // that lacks legendaries still returns a card.
  const order = RARITY_ORDER.slice(0, RARITY_ORDER.indexOf(rarity) + 1).reverse();
  for (const target of order) {
    const pool = cards.filter((c) => c.rarity === target);
    if (pool.length > 0) return pool[Math.floor(rng() * pool.length)];
  }
  return cards[Math.floor(rng() * cards.length)];
}

/** Deterministically roll one pack (card ids, duplicates allowed) from a seed.
 * The same (subject, seed) always yields the same pack, so a server grant and a
 * client preview agree and replays never diverge. */
export function rollPack(subject: ScopeSubjectId, seed: string): string[] {
  const cards = subjectCards(subject);
  if (cards.length === 0) return [];
  const rng = mulberry32(hashSeed(`${subject}:${seed}`));
  const out: string[] = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    const weights = i === PACK_SIZE - 1 ? CHASE_WEIGHTS : BASE_WEIGHTS;
    const rarity = rollRarity(rng, weights);
    const card = pickOfRarity(cards, rarity, rng);
    if (card) out.push(card.id);
  }
  return out;
}
