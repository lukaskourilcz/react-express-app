// In-app token shop. A small catalogue of consumable boosters, permanent
// cosmetics, and Learn-path unlocks, paid for with tokens (see tokens.ts).
//
// The shop is PER SUBJECT (platform): purchases are paid from the active
// subject's wallet and land in the active subject's inventory, so boosters and
// cosmetics bought on one platform belong to that platform. Path products are
// generated for every subject; the Shop page shows only the active subject's.
//
// Cosmetics + boosters are localStorage-backed; path unlocks route through
// the roadmap store so they participate in the cross-device account sync.

import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { spendTokens, getTokens } from './tokens';
import type { RoadmapTopic } from '../types/quiz';
import {
  STARTER_TOPICS,
  TOPIC_PREREQS,
  getExtraUnlocks,
  getRoadmapProgress,
  isTopicUnlocked,
  unlockExtraTopics,
} from './roadmap';
import { getCategoryHexColor } from './categories';
import { getGameConfig, type GameConfig } from './gameConfig';
import { getSubject, useSubject, isSubjectId, SUBJECTS, SUBJECT_ORDER, type SubjectId } from './subjects';

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
  /** For `path` products: the subject that topic belongs to. */
  subject?: SubjectId;
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

// Every subject's buyable paths: its non-starter topics that are actually
// gated by prereqs (starters and zero-prereq topics are always open, so
// there's nothing to sell). Ordered per subject the same way the Learn-page
// topic strip is, so each shop list mirrors its map visually.
const PATH_PRODUCTS: Product[] = SUBJECT_ORDER.flatMap((subject) =>
  SUBJECTS[subject].topics
    .filter((topic) => !STARTER_TOPICS.includes(topic) && (TOPIC_PREREQS[topic] ?? []).length > 0)
    .map<Product>((topic) => ({
      id: `path-${topic}`,
      kind: 'path',
      price: PATH_UNLOCK_PRICE,
      emoji: '🗺️',
      color: getCategoryHexColor(topic),
      topic,
      subject,
    })),
);

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

// v1 held ONE inventory shared by every subject; v2 keys inventories by subject.
const INVENTORY_KEY_LEGACY = 'devquiz:shop:inventory:v1';
const INVENTORY_KEY = 'devquiz:shop:inventory:v2';
const EMPTY: Inventory = { owned: [], ring: null, flair: null, doubleXp: 0 };

type InventoryMap = Partial<Record<SubjectId, Inventory>>;

function sanitizeInventory(raw: unknown): Inventory {
  if (!raw || typeof raw !== 'object') return { ...EMPTY, owned: [] };
  const rec = raw as Partial<Inventory>;
  const doubleXp = Number(rec.doubleXp);
  return {
    owned: Array.isArray(rec.owned) ? rec.owned.filter((x): x is string => typeof x === 'string') : [],
    ring: typeof rec.ring === 'string' ? rec.ring : null,
    flair: typeof rec.flair === 'string' ? rec.flair : null,
    doubleXp: Number.isFinite(doubleXp) && doubleXp > 0 ? Math.floor(doubleXp) : 0,
  };
}

function sanitizeInventories(raw: unknown): InventoryMap {
  const out: InventoryMap = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isSubjectId(k)) out[k] = sanitizeInventory(v);
  }
  return out;
}

function readInventories(): InventoryMap {
  const raw = readJSON<Record<string, unknown> | null>(INVENTORY_KEY, null);
  if (raw !== null) return sanitizeInventories(raw);
  // One-time migration: the pre-split inventory was shared by all subjects.
  // Attribute it to the subject active right now (same rule as XP + tokens).
  const legacy = readJSON<Partial<Inventory> | null>(INVENTORY_KEY_LEGACY, null);
  const migrated: InventoryMap = legacy !== null ? { [getSubject()]: sanitizeInventory(legacy) } : {};
  writeJSON(INVENTORY_KEY, migrated);
  return migrated;
}

const readInventory = (subject: SubjectId = getSubject()): Inventory =>
  readInventories()[subject] ?? { ...EMPTY, owned: [] };

const inventoryStore = createStore<InventoryMap>(readInventories);

/** Snapshot of every subject's inventory, for the account-sync merge. */
export function getInventoriesSnapshot(): Record<string, Inventory> {
  const out: Record<string, Inventory> = {};
  for (const [k, v] of Object.entries(readInventories())) {
    if (v) out[k] = v;
  }
  return out;
}

function writeInventory(subject: SubjectId, next: Inventory): void {
  writeJSON(INVENTORY_KEY, { ...readInventories(), [subject]: next });
  inventoryStore.emit();
  // Push to the account so purchases + equipped cosmetics survive a device
  // switch. Debounced with the token wallet in tokens.ts.
  scheduleAccountSync();
}

/**
 * Merge authoritative per-subject inventories from the account sync: per
 * subject, owned is a set union, equipped is server-wins (if valid, else
 * local), and doubleXp charges are a max — never revoke anything on sync.
 */
export function mergeInventoriesFromServer(server: Record<string, Inventory>): void {
  const local = readInventories();
  const merged: InventoryMap = { ...local };
  for (const [k, remote] of Object.entries(server)) {
    if (!isSubjectId(k)) continue;
    const mine = local[k] ?? { ...EMPTY, owned: [] };
    const theirs = sanitizeInventory(remote);
    const ownedUnion = Array.from(new Set([...mine.owned, ...theirs.owned]));
    merged[k] = {
      owned: ownedUnion,
      ring: ownedUnion.includes(theirs.ring ?? '') ? theirs.ring : mine.ring,
      flair: ownedUnion.includes(theirs.flair ?? '') ? theirs.flair : mine.flair,
      doubleXp: Math.max(mine.doubleXp, theirs.doubleXp),
    };
  }
  writeJSON(INVENTORY_KEY, merged);
  inventoryStore.emit();
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleAccountSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void import('./roadmap').then((m) => m.pushProgressToServer().catch(() => {}));
  }, 800);
}

export function flushInventorySyncNow(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

/** Live inventory of the ACTIVE subject (re-renders on change). */
export function useInventory(): Inventory {
  const map = useStore(inventoryStore);
  const [subject] = useSubject();
  return map[subject] ?? EMPTY;
}

export type PurchaseResult = 'ok' | 'insufficient' | 'owned' | 'unknown';

/**
 * Buy a product: spend its price from the active subject's wallet, then grant
 * it into the active subject's inventory. Cosmetics are a one-time purchase;
 * the Double-XP booster adds a stackable charge; a Learn path routes through
 * the roadmap-unlock store. Returns a status the caller can surface.
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

  const subject = getSubject();
  const inv = readInventory(subject);
  if (product.kind !== 'booster' && inv.owned.includes(id)) return 'owned';
  if (getTokens() < price) return 'insufficient';
  if (!spendTokens(price)) return 'insufficient';

  if (product.kind === 'booster') {
    writeInventory(subject, { ...inv, doubleXp: inv.doubleXp + 1 });
  } else {
    writeInventory(subject, { ...inv, owned: [...inv.owned, id] });
  }
  return 'ok';
}

/** Equip (or, if already equipped, unequip) an owned ring/flair. No-op if unowned. */
export function equip(id: string): void {
  const product = byId.get(id);
  if (!product) return;
  const subject = getSubject();
  const inv = readInventory(subject);
  if (!inv.owned.includes(id)) return;
  if (product.kind === 'ring') {
    writeInventory(subject, { ...inv, ring: inv.ring === id ? null : id });
  } else if (product.kind === 'flair') {
    writeInventory(subject, { ...inv, flair: inv.flair === id ? null : id });
  }
}

/** Consume one of the active subject's Double-XP charges if any are armed. */
export function consumeDoubleXpCharge(): boolean {
  const subject = getSubject();
  const inv = readInventory(subject);
  if (inv.doubleXp <= 0) return false;
  writeInventory(subject, { ...inv, doubleXp: inv.doubleXp - 1 });
  return true;
}

/** Colour of the active subject's equipped avatar ring, or null. */
export function useEquippedRingColor(): string | null {
  const inv = useInventory();
  return inv.ring ? byId.get(inv.ring)?.color ?? null : null;
}

/** Emoji of the active subject's equipped title flair, or null. */
export function useEquippedFlair(): string | null {
  const inv = useInventory();
  return inv.flair ? byId.get(inv.flair)?.emoji ?? null : null;
}
