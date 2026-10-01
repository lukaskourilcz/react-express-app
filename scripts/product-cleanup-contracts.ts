// Owner decisions 10 and 11 (1 October 2026), run by `npm run test:launch`.
//
//   * merchandise is paused until next quarter: one switch (MERCH_ENABLED in
//     shared/rewards.ts), and with it off every merchandise order and listing
//     answers 404 merch_unavailable, the shop lists no item and the settings
//     say redemption is closed, even with the owner's shop settings all on
//   * the yearly saving on /premium is worked out from the prices on show
//
// The handlers are called directly against stand-ins for Supabase, under the
// local development auth fallback (a `user_id` in the query or body).

import assert from 'node:assert/strict';
import { handleOrders, handleShopCatalogue } from '../lib/rewards/handlers';
import { DEFAULT_SETTINGS, setGameSettingsForTests } from '../lib/settings-store';
import settingsHandler from '../api/settings';
import { DEFAULT_MERCH_SETTINGS, MERCH_ENABLED, merchRedemptionOpen, type MerchSettings } from '../shared/rewards';
import { en as ENGLISH } from '../client/src/i18n/translations';
import { annualSaving, launchOfferDisplay } from '../shared/launch-offer';
import { PREMIUM_PRICE } from '../shared/tiers';

function mockResponse() {
  const headers = new Map<string, string>();
  return {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), String(value)); },
    status(code: number) { this.statusCode = code; return this; },
    json(value: unknown) { this.body = value; return this; },
    end() { return this; },
    headers,
  };
}
type Captured = ReturnType<typeof mockResponse>;
const errorCode = (res: Captured) => (res.body as { error?: { code?: string } } | undefined)?.error?.code;

let caller = 0;
const request = (method: string, body: Record<string, unknown> = {}, query: Record<string, unknown> = {}) => {
  const user = `contract-merch-${++caller}`;
  return {
    method,
    headers: { 'x-forwarded-for': `10.57.${caller % 250}.${(caller * 3) % 250}` },
    query: { user_id: user, ...query },
    body: { user_id: user, ...body },
    socket: {},
  } as never;
};

/** A stand-in that records every table and routine a handler touches. */
function recordingDatabase() {
  const touched: string[] = [];
  const chain = (table: string) => {
    touched.push(`from:${table}`);
    const link = {
      select: () => link,
      eq: () => link,
      in: () => link,
      order: () => link,
      limit: () => link,
      like: () => link,
      maybeSingle: async () => ({ data: null, error: null }),
      then: <A>(resolve: (value: { data: unknown[]; error: null }) => A) => resolve({ data: [], error: null }),
    };
    return link;
  };
  return {
    touched,
    db: {
      from: chain,
      rpc: async (name: string) => { touched.push(`rpc:${name}`); return { data: 'cancelled', error: null }; },
    } as never,
  };
}

/** The owner's shop with everything switched on: open, cash checkout on and a
 * mug priced in coins for Czechia. The pause must hold against all of it. */
const SHOP_ALL_ON: MerchSettings = {
  ...DEFAULT_MERCH_SETTINGS,
  enabled: true,
  cashCheckoutEnabled: true,
  testMode: false,
  pricing: {
    mug: {
      unitCostMinor: 1349, printCostMinor: 0, shippingCostMinor: 490, packagingCostMinor: 0,
      priceMinor: 1999, currency: 'EUR', taxIncluded: true, tokenPrice: 900, regions: ['CZ'],
      vendor: 'sprd.net AG', effectiveFrom: '2026-10-01',
    },
  },
};

const ADDRESS = { name: 'Ann', line1: 'Street 1', city: 'Brno', postalCode: '60200', country: 'CZ' };

async function merchPausedContracts() {
  assert.equal(MERCH_ENABLED, false, 'merchandise ships switched off until next quarter (owner decision 10)');
  setGameSettingsForTests({ ...DEFAULT_SETTINGS, merch: SHOP_ALL_ON });
  const realEnv = { key: process.env.SPREADSHOP_API_KEY, shop: process.env.SPREADSHOP_SHOP_ID };
  try {
    // Placing an order: refused before the database, coins or address.
    {
      const { db, touched } = recordingDatabase();
      const res = mockResponse();
      await handleOrders(request('POST', { items: [{ sku: 'mug', quantity: 1 }], address: ADDRESS, paymentKind: 'tokens' }), res as never, db);
      assert.equal(res.statusCode, 404, 'a coin redemption while merchandise is paused is a 404');
      assert.equal(errorCode(res), 'merch_unavailable');
      assert.deepEqual(touched, [], 'a refused redemption reaches no table and no routine (create_merch_order)');
    }
    // Listing orders: the same answer.
    {
      const { db, touched } = recordingDatabase();
      const res = mockResponse();
      await handleOrders(request('GET'), res as never, db);
      assert.equal(res.statusCode, 404);
      assert.equal(errorCode(res), 'merch_unavailable');
      assert.deepEqual(touched, []);
    }
    // Cancelling an order from before the pause still works, so its coins can
    // come back.
    {
      const { db, touched } = recordingDatabase();
      const res = mockResponse();
      await handleOrders(request('DELETE', {}, { id: 'order-0123456789abcdef' }), res as never, db);
      assert.equal(res.statusCode, 200, 'cancelling stays open while merchandise is paused');
      assert.deepEqual(touched, ['rpc:cancel_merch_order']);
    }
    // A signed-out request is still asked to sign in first.
    {
      const res = mockResponse();
      await handleOrders({ method: 'POST', headers: { 'x-forwarded-for': '10.57.9.9' }, query: {}, body: {}, socket: {} } as never, res as never, recordingDatabase().db);
      assert.equal(res.statusCode, 401);
    }
    // The catalogue: no item, the shop reported off, no stock read. The crown
    // and streak protection are untouched.
    {
      const { db, touched } = recordingDatabase();
      const res = mockResponse();
      await handleShopCatalogue(request('GET'), res as never, db);
      const body = res.body as { enabled: boolean; cashCheckoutEnabled: boolean; items: unknown[]; crown: { available: boolean }; protection: { available: boolean } };
      assert.equal(res.statusCode, 200);
      assert.deepEqual(body.items, [], 'the shop lists no merchandise while it is paused');
      assert.equal(body.enabled, false);
      assert.equal(body.cashCheckoutEnabled, false);
      assert.equal(body.crown.available, true, 'the crown stays on sale');
      assert.equal(body.protection.available, true, 'streak protection stays on sale');
      assert.deepEqual(touched, [], 'merch_stock is not read');
    }
    // With the switch on, the same settings list the catalogue and take an
    // order to the database, so the switch is the only thing in the way.
    {
      const { db } = recordingDatabase();
      const res = mockResponse();
      await handleShopCatalogue(request('GET'), res as never, db, true);
      const body = res.body as { enabled: boolean; items: { sku: string }[] };
      assert.equal(body.enabled, true);
      assert.ok(body.items.some((item) => item.sku === 'mug'), 'with the switch on the catalogue comes back');
      assert.equal(merchRedemptionOpen(SHOP_ALL_ON, true), true);
    }
    // Redemption is closed whatever the owner saved, and Spreadshop is not
    // asked for its promotion.
    assert.equal(merchRedemptionOpen(SHOP_ALL_ON), false, 'redemption stays closed while merchandise is paused');
    {
      process.env.SPREADSHOP_API_KEY = 'abcdefgh-1234-5678';
      process.env.SPREADSHOP_SHOP_ID = '123456';
      const realFetch = globalThis.fetch;
      let fetched = 0;
      globalThis.fetch = (async () => { fetched += 1; return new Response('{}', { status: 404 }); }) as typeof fetch;
      try {
        const res = mockResponse();
        await settingsHandler({ method: 'GET', headers: {}, query: {}, socket: {} } as never, res as never);
        const body = res.body as { merch: { redemptionOpen: boolean }; merchPromo: unknown };
        assert.equal(body.merch.redemptionOpen, false, '/api/settings says redemption is closed');
        assert.equal(body.merchPromo, null, '/api/settings carries no Spreadshop promotion');
        assert.equal(fetched, 0, 'Spreadshop is not asked while merchandise is paused');
      } finally {
        globalThis.fetch = realFetch;
      }
    }
  } finally {
    setGameSettingsForTests(null);
    if (realEnv.key === undefined) delete process.env.SPREADSHOP_API_KEY; else process.env.SPREADSHOP_API_KEY = realEnv.key;
    if (realEnv.shop === undefined) delete process.env.SPREADSHOP_SHOP_ID; else process.env.SPREADSHOP_SHOP_ID = realEnv.shop;
  }

  // The Terms promise no merchandise while it is paused.
  for (const key of ['legal.terms.plans.premium', 'legal.terms.refund.takeBack'] as const) {
    assert.doesNotMatch(ENGLISH[key], /merchandise|redeem/i, `${key} mentions merchandise while it is paused`);
  }
}

/** Owner decision 11: the yearly saving is worked out from the prices on show,
 * and the refund promise says it applies once per account. */
function premiumCopyContracts() {
  assert.equal(annualSaving('3.99', '39.99'), '7.89', '3.99 × 12 − 39.99');
  assert.equal(annualSaving('1.80', '18.00'), '3.60', '1.80 × 12 − 18.00 at the launch price');
  assert.equal(annualSaving('5.00', '70.00'), '0.00', 'a yearly plan dearer than twelve months saves nothing, never a negative amount');
  assert.equal(annualSaving(PREMIUM_PRICE.monthly, PREMIUM_PRICE.annual), '7.89');
  const offer = launchOfferDisplay();
  assert.equal(offer.offerAnnualSaving, annualSaving(offer.offerMonthly, offer.offerAnnual));
  assert.equal(offer.offerAnnualSaving, '3.60');
  assert.equal(offer.currency, 'EUR');
  // The sentence carries no amount of its own and no "months free".
  assert.equal(ENGLISH['premium.page.annualSaving'], 'Save {saving} {currency} a year');
  for (const [key, value] of Object.entries(ENGLISH)) {
    assert.doesNotMatch(value, /months? free/i, `${key} promises free months the prices do not give`);
  }
  // Every promise of the 14-day refund says once per account, as the Terms
  // and claimRefund (lib/billing/cancel.ts) do.
  for (const key of ['premium.page.smallPrint.refund', 'premium.page.faq.refundA', 'profile.deletePremium', 'legal.terms.refund.body', 'billing.cancel.optionWithdrawBody'] as const) {
    assert.match(ENGLISH[key], /once per account/, `${key} says the refund applies once per account`);
  }
}

export async function productCleanupContracts() {
  await merchPausedContracts();
  premiumCopyContracts();
}
