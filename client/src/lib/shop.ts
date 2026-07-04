// In-app token shop. A small catalogue of consumable boosters, permanent
// cosmetics, and Learn-path unlocks, paid for with tokens (see tokens.ts).
// Cosmetics + boosters are localStorage-backed; path unlocks route through
// the roadmap store so they participate in the cross-device account sync.

import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { spendTokens, getTokens } from './tokens';
import type { RoadmapTopic } from '../types/quiz';
import {
  STARTER_TOPICS,
  getExtraUnlocks,
  getRoadmapProgress,
  isTopicUnlocked,
  unlockExtraTopics,
} from './roadmap';
import { getCategoryHexColor } from './categories';
import { getGameConfig, type GameConfig } from './gameConfig';

export type ProductKind = 'booster' | 'ring' | 'flair' | 'path';

export interface Product {
  id: string;
  kind: ProductKind;
  price: number;
  /** Emoji shown on the product card (and, for flairs, the equipped flair). */
  emoji: string;
  /** Ring colour (rings only), or the topic accent (paths). */
  color?: string;
  /** For `path` products: the roadmap topic this unlocks. */
  topic?: RoadmapTopic;
}

// Default token prices (the configurable defaults live in lib/settings-store.ts
// and client/src/lib/gameConfig.ts; these are the static fallbacks). The live
// price is resolved per purchase/display via priceOf() from the game config.
const STATIC_CATALOGUE: Product[] = [
  { id: 'double-xp', kind: 'booster', price: 75, emoji: '⚡' },

  { id: 'ring-emerald', kind: 'ring', price: 200, emoji: '⬤', color: '#10b981' },
  { id: 'ring-gold', kind: 'ring', price: 250, emoji: '⬤', color: '#d4af37' },
  { id: 'ring-violet', kind: 'ring', price: 375, emoji: '⬤', color: '#8b5cf6' },

  { id: 'flair-rocket', kind: 'flair', price: 150, emoji: '🚀' },
  { id: 'flair-flame', kind: 'flair', price: 300, emoji: '🔥' },
  { id: 'flair-crown', kind: 'flair', price: 500, emoji: '👑' },
];

/** Default tokens to instantly unlock one learning path the user hasn't earned. */
export const PATH_UNLOCK_PRICE = 200;

// All non-starter topics are buyable. Starters are always free / always open.
// Ordered the same way the Learn-page topic strip is, so the shop list mirrors
// the map visually.
// 'cool-stuff' is Play-mode-only (no learning path), so it isn't buyable.
const PATH_TOPICS: RoadmapTopic[] = [
  'typescript', 'react', 'nextjs', 'nodejs',
  'git', 'dsa', 'algorithms',
  'abbreviations', 'general', 'ai', 'rhf-zod',
  'databases', 'system-design', 'testing', 'devops', 'security',
];

const PATH_PRODUCTS: Product[] = PATH_TOPICS.map<Product>((topic) => ({
  id: `path-${topic}`,
  kind: 'path',
  price: PATH_UNLOCK_PRICE,
  emoji: '🗺️',
  color: getCategoryHexColor(topic),
  topic,
}));

// Each product resolves its display copy from i18n keys derived from the id:
// `shop.item.<id>.name` and `shop.item.<id>.desc` (paths use a shared template
// with the topic label interpolated in).
export const CATALOGUE: readonly Product[] = [...STATIC_CATALOGUE, ...PATH_PRODUCTS];

const byId = new Map(CATALOGUE.map((p) => [p.id, p]));
export const productById = (id: string): Product | undefined => byId.get(id);

/** The live token price of a product, resolved from the game config (per-product
 *  override for catalogue items, the shared path-unlock price for paths), falling
 *  back to the product's static base price. */
export function priceOf(product: Product, config: GameConfig = getGameConfig()): number {
  if (product.kind === 'path') return config.shop.pathUnlockPrice;
  return config.shop.prices[product.id] ?? product.price;
}

/** True if the path's topic is already accessible (starter / prereq met / bought). */
export function isPathAlreadyUnlocked(topic: RoadmapTopic): boolean {
  if (STARTER_TOPICS.includes(topic)) return true;
  return isTopicUnlocked(getRoadmapProgress(), topic, new Set(getExtraUnlocks()));
}

interface Inventory {
  /** Cosmetic product ids the learner owns permanently. */
  owned: string[];
  /** Equipped avatar ring id (must be owned), or null. */
  ring: string | null;
  /** Equipped title flair id (must be owned), or null. */
  flair: string | null;
  /** Remaining Double-XP charges (one consumed per quiz). */
  doubleXp: number;
}

const INVENTORY_KEY = 'devquiz:shop:inventory:v1';
const EMPTY: Inventory = { owned: [], ring: null, flair: null, doubleXp: 0 };

function readInventory(): Inventory {
  const raw = readJSON<Partial<Inventory>>(INVENTORY_KEY, EMPTY);
  const doubleXp = Number(raw.doubleXp);
  return {
    owned: Array.isArray(raw.owned) ? raw.owned.filter((x): x is string => typeof x === 'string') : [],
    ring: typeof raw.ring === 'string' ? raw.ring : null,
    flair: typeof raw.flair === 'string' ? raw.flair : null,
    doubleXp: Number.isFinite(doubleXp) && doubleXp > 0 ? Math.floor(doubleXp) : 0,
  };
}

const inventoryStore = createStore<Inventory>(readInventory);

function writeInventory(next: Inventory): void {
  writeJSON(INVENTORY_KEY, next);
  inventoryStore.emit();
}

/** Live inventory (re-renders on change). */
export function useInventory(): Inventory {
  return useStore(inventoryStore);
}

export type PurchaseResult = 'ok' | 'insufficient' | 'owned' | 'unknown';

/**
 * Buy a product: spend its price in tokens, then grant it. Cosmetics are a
 * one-time purchase; the Double-XP booster adds a stackable charge; a Learn
 * path routes through the roadmap-unlock store. Returns a status the caller
 * can surface to the learner.
 */
export function purchase(id: string): PurchaseResult {
  const product = byId.get(id);
  if (!product) return 'unknown';
  const price = priceOf(product);

  if (product.kind === 'path') {
    if (!product.topic) return 'unknown';
    if (isPathAlreadyUnlocked(product.topic)) return 'owned';
    if (getTokens() < price) return 'insufficient';
    if (!spendTokens(price)) return 'insufficient';
    unlockExtraTopics([product.topic]);
    return 'ok';
  }

  const inv = readInventory();
  if (product.kind !== 'booster' && inv.owned.includes(id)) return 'owned';
  if (getTokens() < price) return 'insufficient';
  if (!spendTokens(price)) return 'insufficient';

  if (product.kind === 'booster') {
    writeInventory({ ...inv, doubleXp: inv.doubleXp + 1 });
  } else {
    writeInventory({ ...inv, owned: [...inv.owned, id] });
  }
  return 'ok';
}

/** Equip (or, if already equipped, unequip) an owned ring/flair. No-op if unowned. */
export function equip(id: string): void {
  const product = byId.get(id);
  if (!product) return;
  const inv = readInventory();
  if (!inv.owned.includes(id)) return;
  if (product.kind === 'ring') {
    writeInventory({ ...inv, ring: inv.ring === id ? null : id });
  } else if (product.kind === 'flair') {
    writeInventory({ ...inv, flair: inv.flair === id ? null : id });
  }
}

/** Consume one Double-XP charge if any are armed. Returns true if consumed. */
export function consumeDoubleXpCharge(): boolean {
  const inv = readInventory();
  if (inv.doubleXp <= 0) return false;
  writeInventory({ ...inv, doubleXp: inv.doubleXp - 1 });
  return true;
}

/** Colour of the equipped avatar ring, or null. */
export function useEquippedRingColor(): string | null {
  const inv = useStore(inventoryStore);
  return inv.ring ? byId.get(inv.ring)?.color ?? null : null;
}

/** Emoji of the equipped title flair, or null. */
export function useEquippedFlair(): string | null {
  const inv = useStore(inventoryStore);
  return inv.flair ? byId.get(inv.flair)?.emoji ?? null : null;
}
