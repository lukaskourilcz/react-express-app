/** devShark merchandise: what the items are, and what has to be configured
 * before any of them can be sold (issue #167).
 *
 * This module describes the PRODUCTS — what they are, what variants they come
 * in, and what a print file needs. It deliberately holds no prices, no stock
 * and no supplier: those are commercial facts that only the owner can supply,
 * and inventing them would put a fake shop in front of learners. Prices,
 * regions, stock and the fulfilment supplier come from server configuration
 * (`lib/rewards/config.ts`); until every one of them is present for an item,
 * that item is unavailable and the shop says exactly which piece is missing.
 *
 * Nothing here changes learning. Merchandise is bought with tokens earned from
 * verified activity or with cash; neither buys access, content, XP, ranks or
 * standing on a leaderboard.
 */

import type { Localized } from './coding-catalog';

export type MerchSku = 'sticker-set' | 'mug' | 'tshirt' | 'cap' | 'crown';
export const MERCH_SKUS: readonly MerchSku[] = ['sticker-set', 'mug', 'tshirt', 'cap', 'crown'];
export const isMerchSku = (value: unknown): value is MerchSku =>
  typeof value === 'string' && (MERCH_SKUS as readonly string[]).includes(value);

export interface MerchVariant {
  id: string;
  label: Localized;
}

/** What a print file has to satisfy. Real specifications, no vendor implied. */
export interface PrintSpec {
  /** Where the mark goes on the item. */
  placement: Localized;
  widthMm: number;
  heightMm: number;
  /** Minimum resolution for the supplied artwork. */
  dpi: number;
  /** Number of ink colours the mark uses. */
  colours: number;
  /** The artwork source in this repository. */
  artwork: string;
}

export interface MerchProduct {
  sku: MerchSku;
  /** A physical item ships; a cosmetic is an entitlement on the account. */
  kind: 'physical' | 'cosmetic';
  name: Localized;
  blurb: Localized;
  /** Materials and dimensions, as a learner would want to read them. */
  spec: Localized;
  variants: MerchVariant[];
  print: PrintSpec | null;
  /** Alt text for the product image, written for a screen reader. */
  imageAlt: Localized;
}

const size = (id: string, en: string, cs: string): MerchVariant => ({ id, label: { en, cs } });

export const MERCH_CATALOG: readonly MerchProduct[] = [
  {
    sku: 'sticker-set',
    kind: 'physical',
    name: { en: 'devShark sticker set', cs: 'Sada samolepek devShark' },
    blurb: {
      en: 'Five die-cut vinyl stickers: the fin, the waterline, and three of the technique marks.',
      cs: 'Pět vyřezávaných vinylových samolepek: ploutev, hladina a tři značky technik.',
    },
    spec: {
      en: 'Matte vinyl, laminated, 50 to 80 mm on the long edge, weather resistant.',
      cs: 'Matný vinyl s laminací, 50 až 80 mm na delší hraně, odolný vůči počasí.',
    },
    variants: [],
    print: {
      placement: { en: 'Die-cut to the outline of each mark.', cs: 'Výsek podle obrysu každé značky.' },
      widthMm: 80,
      heightMm: 80,
      dpi: 300,
      colours: 2,
      artwork: 'client/src/components/SharkFin.tsx',
    },
    imageAlt: {
      en: 'Five devShark vinyl stickers arranged on a pale background.',
      cs: 'Pět vinylových samolepek devShark rozložených na světlém podkladu.',
    },
  },
  {
    sku: 'mug',
    kind: 'physical',
    name: { en: 'devShark mug', cs: 'Hrnek devShark' },
    blurb: {
      en: 'A plain ceramic mug with the fin on one side and the waterline running round it.',
      cs: 'Jednoduchý keramický hrnek s ploutví na jedné straně a hladinou dokola.',
    },
    spec: {
      en: 'Ceramic, 330 ml, dishwasher and microwave safe.',
      cs: 'Keramika, 330 ml, vhodné do myčky i mikrovlnky.',
    },
    variants: [],
    print: {
      placement: { en: 'Wrap print, starting 20 mm from the handle.', cs: 'Potisk dokola, 20 mm od ucha.' },
      widthMm: 200,
      heightMm: 85,
      dpi: 300,
      colours: 2,
      artwork: 'client/src/components/SharkFin.tsx',
    },
    imageAlt: {
      en: 'A white ceramic mug with the devShark fin printed on it.',
      cs: 'Bílý keramický hrnek s potiskem ploutve devShark.',
    },
  },
  {
    sku: 'tshirt',
    kind: 'physical',
    name: { en: 'devShark T-shirt', cs: 'Tričko devShark' },
    blurb: {
      en: 'A plain cotton tee with the fin on the chest.',
      cs: 'Jednoduché bavlněné tričko s ploutví na hrudi.',
    },
    spec: {
      en: 'Combed ring-spun cotton, around 180 g/m2, unisex fit.',
      cs: 'Česaná bavlna, přibližně 180 g/m2, unisex střih.',
    },
    variants: [size('s', 'S', 'S'), size('m', 'M', 'M'), size('l', 'L', 'L'), size('xl', 'XL', 'XL'), size('xxl', 'XXL', 'XXL')],
    print: {
      placement: { en: 'Left chest, 70 mm below the collar seam.', cs: 'Levá strana hrudi, 70 mm pod límcem.' },
      widthMm: 90,
      heightMm: 90,
      dpi: 300,
      colours: 1,
      artwork: 'client/src/components/SharkFin.tsx',
    },
    imageAlt: {
      en: 'A cotton T-shirt with a small devShark fin printed on the left chest.',
      cs: 'Bavlněné tričko s malou ploutví devShark na levé straně hrudi.',
    },
  },
  {
    sku: 'cap',
    kind: 'physical',
    name: { en: 'devShark baseball cap', cs: 'Kšiltovka devShark' },
    blurb: {
      en: 'A six-panel cap with the fin embroidered on the front.',
      cs: 'Šestidílná kšiltovka s vyšitou ploutví vpředu.',
    },
    spec: {
      en: 'Cotton twill, six panels, adjustable metal clasp, one size.',
      cs: 'Bavlněný kepr, šest dílů, kovová přezka, univerzální velikost.',
    },
    variants: [],
    print: {
      placement: { en: 'Front centre panel, embroidered.', cs: 'Přední středový díl, výšivka.' },
      widthMm: 60,
      heightMm: 45,
      dpi: 300,
      colours: 1,
      artwork: 'client/src/components/SharkFin.tsx',
    },
    imageAlt: {
      en: 'A baseball cap with the devShark fin embroidered on the front.',
      cs: 'Kšiltovka s vyšitou ploutví devShark vpředu.',
    },
  },
  {
    sku: 'crown',
    kind: 'cosmetic',
    name: { en: 'Shark crown', cs: 'Žraločí koruna' },
    blurb: {
      en: 'An original devShark crown that sits on your avatar. It ships nothing, and it means nothing beyond itself: no rank, no access, no advantage.',
      cs: 'Původní koruna devShark, která sedí na tvém avataru. Nic se neposílá a nic neznamená: žádná hodnost, žádný přístup, žádná výhoda.',
    },
    spec: {
      en: 'Drawn as an SVG, so it stays sharp at every avatar size and in both themes.',
      cs: 'Kreslená jako SVG, takže zůstane ostrá v každé velikosti avataru i v obou motivech.',
    },
    variants: [],
    print: null,
    imageAlt: {
      en: 'The devShark crown drawn above a learner avatar.',
      cs: 'Koruna devShark nakreslená nad avatarem studujícího.',
    },
  },
];

export const merchBySku = (sku: string): MerchProduct | undefined =>
  MERCH_CATALOG.find((product) => product.sku === sku);

/* ── configuration ──────────────────────────────────────────────────────── */

/** The commercial facts that only the owner can supply (issue #167). */
export interface MerchPricing {
  sku: MerchSku;
  /** ISO 4217, e.g. `CZK`. */
  currency: string | null;
  /** Cash price in minor units. null until quoted. */
  cashMinor: number | null;
  /** Token price. null until derived from the verified earning rate. */
  tokens: number | null;
  /** Regions the item may ship to, as ISO 3166-1 alpha-2 codes. */
  regions: string[];
  /** Units on hand. null when no stock has been declared. */
  stock: number | null;
  /** The supplier that prints and ships it. null until one is engaged. */
  supplier: string | null;
  /** The date the price above takes effect. */
  effectiveFrom: string | null;
}

export type MerchBlocker =
  | 'no_currency' | 'no_cash_price' | 'no_token_price' | 'no_region'
  | 'no_supplier' | 'no_stock' | 'no_payment_provider' | 'not_in_region';

export interface MerchAvailability {
  sku: MerchSku;
  /** Can a learner buy it with cash right now? */
  cash: boolean;
  /** Can a learner redeem it with tokens right now? */
  tokens: boolean;
  /** Exactly what is missing, so the shop can say so instead of guessing. */
  blockers: MerchBlocker[];
}

export interface MerchAvailabilityContext {
  /** A verified payment provider is configured and its keys are present. */
  paymentConfigured: boolean;
  /** The learner's region, when known. */
  region?: string | null;
}

/**
 * Decide what a single item can do right now. A cosmetic needs no shipping,
 * no region and no supplier — but it still needs a token price, which is
 * derived from the verified earning rate rather than invented here.
 */
export function availabilityFor(
  product: MerchProduct,
  pricing: MerchPricing | null,
  context: MerchAvailabilityContext,
): MerchAvailability {
  const blockers: MerchBlocker[] = [];
  const physical = product.kind === 'physical';

  if (!pricing) {
    blockers.push('no_token_price');
    if (physical) blockers.push('no_cash_price', 'no_currency', 'no_region', 'no_supplier', 'no_stock');
    if (physical && !context.paymentConfigured) blockers.push('no_payment_provider');
    return { sku: product.sku, cash: false, tokens: false, blockers };
  }

  if (pricing.tokens === null || pricing.tokens <= 0) blockers.push('no_token_price');
  if (physical) {
    if (!pricing.currency) blockers.push('no_currency');
    if (pricing.cashMinor === null || pricing.cashMinor <= 0) blockers.push('no_cash_price');
    if (pricing.regions.length === 0) blockers.push('no_region');
    if (!pricing.supplier) blockers.push('no_supplier');
    if (pricing.stock === null || pricing.stock <= 0) blockers.push('no_stock');
    if (!context.paymentConfigured) blockers.push('no_payment_provider');
    if (context.region && pricing.regions.length > 0 && !pricing.regions.includes(context.region)) {
      blockers.push('not_in_region');
    }
  }

  const blocked = new Set(blockers);
  const cash = physical && !blocked.has('no_currency') && !blocked.has('no_cash_price') &&
    !blocked.has('no_region') && !blocked.has('no_supplier') && !blocked.has('no_stock') &&
    !blocked.has('no_payment_provider') && !blocked.has('not_in_region');
  const tokens = !blocked.has('no_token_price') &&
    (!physical || (!blocked.has('no_region') && !blocked.has('no_supplier') && !blocked.has('no_stock') && !blocked.has('not_in_region')));

  return { sku: product.sku, cash, tokens, blockers };
}

/** What the shop renders for one item. */
export interface MerchListing {
  product: MerchProduct;
  pricing: MerchPricing | null;
  availability: MerchAvailability;
}

/** GET /api/user/[op]?op=shop-catalog */
export interface ShopCatalogResponse {
  listings: MerchListing[];
  /** True while no real payment provider is configured: nothing can be charged. */
  paymentConfigured: boolean;
  /** True when the configured provider is in its test mode. */
  testMode: boolean;
}
