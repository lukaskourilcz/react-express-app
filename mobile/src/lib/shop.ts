// In-app token shop — ported from client/src/lib/shop.ts. Boosters + cosmetics
// are stored locally; path unlocks route through the roadmap store so they
// participate in the cross-device account sync (the `extra` blob).
import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { spendTokens, getTokens } from './tokens';
import type { RoadmapTopic } from './roadmapApi';
import {
  STARTER_TOPICS,
  getExtraUnlocks,
  getProgress,
  isTopicUnlocked,
  unlockExtraTopics,
  pushProgressToServer,
} from './roadmapProgress';
import { getCategoryHexColor } from './categories';
import { getGameConfig, type GameConfig } from './gameConfig';

export type ProductKind = 'booster' | 'ring' | 'flair' | 'path';

export interface Product {
  id: string;
  kind: ProductKind;
  price: number;
  emoji: string;
  color?: string;
  topic?: RoadmapTopic;
}

const STATIC_CATALOGUE: Product[] = [
  { id: 'double-xp', kind: 'booster', price: 75, emoji: '⚡' },
  { id: 'ring-emerald', kind: 'ring', price: 200, emoji: '⬤', color: '#10b981' },
  { id: 'ring-gold', kind: 'ring', price: 250, emoji: '⬤', color: '#d4af37' },
  { id: 'ring-violet', kind: 'ring', price: 375, emoji: '⬤', color: '#8b5cf6' },
  { id: 'flair-rocket', kind: 'flair', price: 150, emoji: '🚀' },
  { id: 'flair-flame', kind: 'flair', price: 300, emoji: '🔥' },
  { id: 'flair-crown', kind: 'flair', price: 500, emoji: '👑' },
];

export const PATH_UNLOCK_PRICE = 200;

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

export const CATALOGUE: readonly Product[] = [...STATIC_CATALOGUE, ...PATH_PRODUCTS];

const byId = new Map(CATALOGUE.map((p) => [p.id, p]));
export const productById = (id: string): Product | undefined => byId.get(id);

export function priceOf(product: Product, config: GameConfig = getGameConfig()): number {
  if (product.kind === 'path') return config.shop.pathUnlockPrice;
  return config.shop.prices[product.id] ?? product.price;
}

export function isPathAlreadyUnlocked(topic: RoadmapTopic): boolean {
  if (STARTER_TOPICS.includes(topic)) return true;
  return isTopicUnlocked(getProgress(), topic, new Set(getExtraUnlocks()));
}

export interface Inventory {
  owned: string[];
  ring: string | null;
  flair: string | null;
  doubleXp: number;
}

const INVENTORY_KEY = 'devquiz:shop:inventory:v1';
const EMPTY: Inventory = { owned: [], ring: null, flair: null, doubleXp: 0 };

export function getInventorySnapshot(): Inventory {
  return readInventory();
}

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
  scheduleAccountSync();
}

/** Direct write of authoritative inventory — used by the account-sync merge. */
export function setInventoryFromServer(next: Inventory): void {
  writeJSON(INVENTORY_KEY, next);
  inventoryStore.emit();
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleAccountSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushProgressToServer().catch(() => {});
  }, 800);
}

export function useInventory(): Inventory {
  return useStore(inventoryStore);
}

export type PurchaseResult = 'ok' | 'insufficient' | 'owned' | 'unknown';

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

export function consumeDoubleXpCharge(): boolean {
  const inv = readInventory();
  if (inv.doubleXp <= 0) return false;
  writeInventory({ ...inv, doubleXp: inv.doubleXp - 1 });
  return true;
}

export function useEquippedRingColor(): string | null {
  const inv = useStore(inventoryStore);
  return inv.ring ? byId.get(inv.ring)?.color ?? null : null;
}

export function useEquippedFlair(): string | null {
  const inv = useStore(inventoryStore);
  return inv.flair ? byId.get(inv.flair)?.emoji ?? null : null;
}
