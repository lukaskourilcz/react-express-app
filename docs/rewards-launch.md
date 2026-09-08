# Rewards launch: merchandise, the wallet, and what is still missing

This document is the record for issues #167 and #172. It states what the four
merchandise items and the crown *are*, what the shop needs before any of them
can be sold, and who has to decide what. It deliberately contains **no invented
prices, no invented supplier and no invented stock**: every number below that a
vendor would have to quote is written as `NOT QUOTED`, and the shop treats a
missing value as a blocker rather than a default.

Learning is unaffected by everything here. Tokens, merchandise and the crown
never change access, content, explanations, paths, XP, scores, streaks, ranks,
leaderboards, matchmaking or AI availability.

## The products

| SKU | Kind | Variants | Print / placement | Artwork source |
| --- | --- | --- | --- | --- |
| `sticker-set` | physical | — | Die-cut to each mark, 80 × 80 mm max, 300 dpi, 2 colours | `client/src/components/SharkFin.tsx` |
| `mug` | physical | — | Wrap print from 20 mm off the handle, 200 × 85 mm, 300 dpi, 2 colours | `client/src/components/SharkFin.tsx` |
| `tshirt` | physical | S, M, L, XL, XXL | Left chest, 70 mm below the collar seam, 90 × 90 mm, 1 colour | `client/src/components/SharkFin.tsx` |
| `cap` | physical | — | Front centre panel, embroidered, 60 × 45 mm, 1 colour | `client/src/components/SharkFin.tsx` |
| `crown` | cosmetic | — | None; drawn as an SVG on the avatar | `client/src/components/ui/icons.tsx` (`CrownIcon`) |

Materials and dimensions live with the products in `shared/merchandise.ts`, so
the shop, this document and the print brief cannot drift apart.

## Unit economics — the shape, not the numbers

Every row is a real cost line that a quote has to fill in. Nothing here may be
guessed: an unquoted line keeps the item unavailable.

| Line | sticker-set | mug | tshirt | cap |
| --- | --- | --- | --- | --- |
| Blank / base unit cost | NOT QUOTED | NOT QUOTED | NOT QUOTED | NOT QUOTED |
| Print or embroidery | NOT QUOTED | NOT QUOTED | NOT QUOTED | NOT QUOTED |
| Packaging | NOT QUOTED | NOT QUOTED | NOT QUOTED | NOT QUOTED |
| Inbound freight and handling | NOT QUOTED | NOT QUOTED | NOT QUOTED | NOT QUOTED |
| Outbound shipping, per region | NOT QUOTED | NOT QUOTED | NOT QUOTED | NOT QUOTED |
| Payment processing fee | NOT QUOTED | NOT QUOTED | NOT QUOTED | NOT QUOTED |
| Expected return / breakage rate | NOT QUOTED | NOT QUOTED | NOT QUOTED | NOT QUOTED |
| VAT treatment | NOT DECIDED | NOT DECIDED | NOT DECIDED | NOT DECIDED |
| **Landed cost** | — | — | — | — |
| **Cash price** | NOT SET | NOT SET | NOT SET | NOT SET |
| **Margin** | — | — | — | — |

**Reproducing the calculation.** Landed cost is the sum of the first seven
lines, grossed up by the expected return rate. Cash price is set by the owner
against that landed cost; margin is the difference. When the quotes arrive, fill
this table in and record the quote date and the vendor in the decision log
below — the table is the record, not a spreadsheet somewhere else.

## Deriving the token price

Token prices are not chosen; they are derived from what a learner actually
earns, so that "affordable" means something.

- The earning rate is fixed in `shared/rewards.ts`: `TOKENS_PER_XP = 0.1`, plus
  a one-time `REGISTRATION_GRANT` of 200 on the first wallet sync.
- Measure the median tokens a learner earns per week from the ledger
  (`reward_ledger`, `reason = 'activity'`) once there is a month of real data.
- Choose a target: how many weeks of ordinary practice one item should
  represent. The owner sets that number; it is a product decision, not a
  calculation.
- Token price = median weekly earnings × target weeks, rounded to a round number.
- Record the median, the target and the resulting price here with the date. When
  the earning rate or the curriculum changes, redo it.

**Status: NOT DERIVED.** There is no earning data yet, so no token price is set
and no item can be redeemed.

## Configuration

The shop reads everything commercial from the environment. Nothing has a
default, and a malformed value is treated as no value.

| Variable | What it is | Status |
| --- | --- | --- |
| `REWARDS_PRICING` | JSON keyed by SKU: `currency`, `cashMinor`, `tokens`, `regions`, `supplier`, `effectiveFrom` | NOT SET |
| `REWARDS_PAYMENT_PROVIDER` | The provider's name | NOT SET |
| `REWARDS_PAYMENT_SECRET_KEY` | Server-side key; never sent to a browser | NOT SET |
| `REWARDS_PAYMENT_WEBHOOK_SECRET` | Signing secret for the webhook | NOT SET |
| `REWARDS_PAYMENT_PUBLISHABLE_KEY` | Browser-safe key, if the provider needs one | NOT SET |
| `REWARDS_PAYMENT_MODE` | `test` (default) or `live` | `test` |
| `REWARDS_SUPPLIER` | Who prints and ships | NOT SET |
| `REWARDS_OPS_OWNER` | The person accountable for dispatch | NOT SET |

Stock is held in the database (`reward_stock`), not in configuration, because it
changes as orders are reserved and shipped, and because an order reserves
against that table: a number in configuration could advertise an item the till
would then refuse. Set it per SKU, in units on the shelf:

```
POST /api/admin/[op]?op=fulfilment
{ "action": "stock", "sku": "tshirt", "onHand": 40 }
```

The response reports what is on hand and how much of it open orders have
reserved. A SKU with no row has no stock, and its card says so.

An unconfigured item shows its blockers on its card — "No cash price has been
quoted yet", "No supplier has been engaged" — instead of a placeholder price.

## Fulfilment

1. **Review.** `GET /api/admin/[op]?op=fulfilment&status=paid` lists what is paid
   or redeemed and waiting. Addresses are returned to the operator; they are
   never written to a log line or an analytics event.
2. **Export.** `POST ?op=fulfilment {action:'export'}` claims the batch by moving
   each order to `fulfilling` and returns it with the addresses. Because the
   claim is the same transition, a second export finds nothing left to claim —
   that is what makes dispatch exactly-once. It refuses outright while
   `REWARDS_SUPPLIER` or `REWARDS_OPS_OWNER` is unset.
3. **Ship.** `POST ?op=fulfilment {action:'advance', status:'shipped', carrier,
   tracking}` records the dispatch. A shipment without a carrier and a tracking
   code is refused. Shipping consumes the reservation and decrements stock.
4. **Deliver / return.** `delivered`, `cancelled` and `refunded` go through the
   same call. Stock returns exactly once, and a token order is refunded to the
   wallet it came from, keyed by the order id, so a repeated refund is a no-op.
   A cash refund is issued through the payment provider and reaches the order
   through the same signed webhook that recorded the payment.

Every transition writes a row to `reward_order_events` with the actor
(`learner`, `admin`, `provider`, `system`).

`npm run test:db` exercises this whole path against a real PostgreSQL: the
reservation and the debit landing together, a retried idempotency key returning
the first order rather than a second one, stock running out, the reservation
being released when funds fall short, a refund and a stock return happening
exactly once, the transition table refusing a jump, and shipping consuming the
reservation.

## Retention and deletion

- An order that still owes a delivery (`paid`, `fulfilling`, `shipped`) is kept
  when the account is deleted, with the address cleared, because a parcel and
  its tax record outlive the account. Everything else — `pending`, `cancelled`,
  `refunded`, `delivered` — is deleted with the account, along with the wallet,
  the ledger and the cosmetic inventory (`delete_reward_data`).
- Addresses are stored only while an order is open, and only the fields a parcel
  needs: name, street, city, postcode, two-letter country.

## Decision log

| Date | Decision | Who |
| --- | --- | --- |
| 2026-09-08 | Four physical items and one cosmetic crown defined; specifications and print briefs recorded above. | Implementation, issue #167 |
| 2026-09-08 | No supplier approached, no quote requested, no price set. The shop ships closed. | Implementation, issue #167 |

## What is still blocked

These are the things code cannot supply. Each one keeps part of the shop
switched off until a person decides it.

1. **Supplier quotes.** No vendor has been approached and no quote exists. Until
   the table above is filled in, no cash price exists and nothing physical can be
   bought.
2. **Token prices.** No earning data exists yet, so the derivation above has not
   been run. Nothing can be redeemed.
3. **Payment provider.** No provider is chosen and no keys exist. The webhook,
   the signature check and the order state machine are implemented and tested,
   but checkout is refused, and it stays refused while
   `REWARDS_PAYMENT_MODE` is not `live` — which is a deliberate switch, not a
   consequence of having keys.
4. **Regions and tax.** No delivery region and no VAT treatment has been decided.
5. **Operations owner.** Nobody is named as accountable for dispatch, so the
   export refuses.
6. **The crown on public surfaces.** The crown is drawn on the learner's own
   avatar wherever devShark shows it to them (the header, Profile, the shop
   preview). It does **not** appear on the leaderboard or in the Play lobby: the
   `subject_leaderboard`, `category_leaderboard` and `daily_leaderboard_v2`
   functions deliberately return a display name and a picture and no identity,
   so a per-row cosmetic would need a reviewed change to all three. That change
   would also make a purchase publicly visible, which runs against the standing
   rule that cosmetic items never change leaderboards. It is the owner's call,
   not the implementation's.
