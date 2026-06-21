// In-app token shop. A small catalogue of consumable boosters and permanent
// cosmetics, paid for with tokens (see tokens.ts). Like the rest of the token
// economy this is localStorage-backed for the MVP — no DB migration. Cosmetics
// are owned forever and can be equipped/unequipped; the Double-XP booster
// stacks "charges" that are consumed one per quiz.

import { readJSON, writeJSON } from './storage';
import { createStore, useStore } from './store';
import { spendTokens, getTokens } from './tokens';

export type ProductKind = 'booster' | 'ring' | 'flair';

export interface Product {
  id: string;
  kind: ProductKind;
  price: number;
  /** Emoji shown on the product card (and, for flairs, the equipped flair). */
  emoji: string;
  /** Ring colour (rings only). */
  color?: string;
}

// Each product resolves its display copy from i18n keys derived from the id:
// `shop.item.<id>.name` and `shop.item.<id>.desc`.
export const CATALOGUE: readonly Product[] = [
  { id: 'double-xp', kind: 'booster', price: 150, emoji: '⚡' },

  { id: 'ring-emerald', kind: 'ring', price: 400, emoji: '⬤', color: '#10b981' },
  { id: 'ring-gold', kind: 'ring', price: 500, emoji: '⬤', color: '#d4af37' },
  { id: 'ring-violet', kind: 'ring', price: 750, emoji: '⬤', color: '#8b5cf6' },

  { id: 'flair-rocket', kind: 'flair', price: 300, emoji: '🚀' },
  { id: 'flair-flame', kind: 'flair', price: 600, emoji: '🔥' },
  { id: 'flair-crown', kind: 'flair', price: 1000, emoji: '👑' },
];

const byId = new Map(CATALOGUE.map((p) => [p.id, p]));
export const productById = (id: string): Product | undefined => byId.get(id);

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
 * one-time purchase; the Double-XP booster adds a stackable charge. Returns a
 * status the caller can surface to the learner.
 */
export function purchase(id: string): PurchaseResult {
  const product = byId.get(id);
  if (!product) return 'unknown';
  const inv = readInventory();
  if (product.kind !== 'booster' && inv.owned.includes(id)) return 'owned';
  if (getTokens() < product.price) return 'insufficient';
  if (!spendTokens(product.price)) return 'insufficient';

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
