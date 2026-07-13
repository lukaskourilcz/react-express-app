// Wires the token wallet + shop inventory into the roadmap `extra` account sync,
// and hydrates the synchronous storage facade at startup. Import for its
// side-effect (registration) and call initGameState() once from the root layout.
import { hydrateStorage } from './storage';
import { refreshAllStores } from './store';
import { loadColorMode } from './colorMode';
import { registerAccountExtras, type AccountExtras } from './roadmapProgress';
import { getTokens, setBalanceFromServer } from './tokens';
import { getInventorySnapshot, setInventoryFromServer, type Inventory } from './shop';
import { primeRankMarker } from './xp';

// Merge server wallet/inventory into local: balance grows (max), owned items
// union, equipped items prefer the server when still owned, doubleXp charges max.
function mergeInventories(local: Inventory, server: Inventory): Inventory {
  const owned = Array.from(new Set([...local.owned, ...server.owned]));
  const pick = (s: string | null, l: string | null): string | null => {
    if (s && owned.includes(s)) return s;
    if (l && owned.includes(l)) return l;
    return null;
  };
  return {
    owned,
    ring: pick(server.ring, local.ring),
    flair: pick(server.flair, local.flair),
    doubleXp: Math.max(local.doubleXp, server.doubleXp),
  };
}

// Register the source (what we push) + receiver (how we absorb the server copy).
registerAccountExtras(
  () => ({ wallet: { balance: getTokens() }, inventory: getInventorySnapshot() }),
  (extras: AccountExtras) => {
    setBalanceFromServer(Math.max(getTokens(), extras.wallet.balance));
    setInventoryFromServer(mergeInventories(getInventorySnapshot(), extras.inventory));
  },
);

let started = false;

/** Load persisted state into memory and refresh every store. Idempotent. */
export async function initGameState(): Promise<void> {
  if (started) return;
  started = true;
  await hydrateStorage();
  await loadColorMode();
  refreshAllStores();
  primeRankMarker();
}
