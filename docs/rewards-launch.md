# Rewards launch: what the code does, and what only you can do

The shop sells four physical objects and one drawing. The drawing is finished.
The four objects need a supplier, and no amount of code substitutes for one.

This document is the honest split: everything the repository can decide is
decided and shipped; everything that needs a real quote, a real payment account
or a real person to pack a parcel is listed here as work only the owner can do.
Until those are done the shop reports each item as **not on sale yet** and
refuses to create an order for it through any route — the UI, a crafted request,
or an admin call. There is no placeholder price anywhere in the product.

## The rule that outranks the rest

Nothing in the shop touches learning. Buying, owning and wearing anything
changes no access, no content, no XP, no score, no streak, no rank, no
leaderboard position and no prerequisite. The crown is a picture. This is
enforced structurally: the rewards tables in migration 028 have no relationship
to any learning table, and the launch contract asserts the separation.

## What the repository already does

**An auditable wallet.** Tokens used to live in `localStorage`: the browser
awarded them, spent them, and the account sync merged by taking whichever number
was larger. Migration 028 replaces that with an append-only ledger keyed by
server-issued event ids, plus a balance written only by the ledger routines in
the same transaction as the entry that moved it. Every entry says why it exists
and what it belongs to, and the learner can see the last twenty-five of them
beside their balance — a wallet whose owner cannot account for it is exactly
what this replaced.

Credits come from XP the server itself verified, keyed to that award's own id.
Replaying an award credits nothing. The sign-up grant is one ledger event
derived from the account id, so a second device grants nothing and there is no
`user_metadata` flag to forge.

**Legacy balances were not converted.** The old wallets were written by
browsers, cannot be audited, and in some cases reflect a client that awarded
itself tokens. Converting them into something redeemable for a physical object
would mean posting mugs against numbers nobody can verify. So the ledger starts
every account at zero and earns forward. The old numbers stay readable and the
cosmetics already owned stay owned and still render — the history is intact, it
is simply not currency.

**Atomic orders.** Creating an order reserves stock for every line and, for a
token order, debits the wallet — in one transaction, or not at all. Cancelling
releases the reservation and refunds exactly once. Shipping consumes the
reservation. A retried submit finds the order already there and charges nothing.

**Payment is the webhook.** `op=payment-webhook` verifies an HMAC signature in
constant time against a secret that exists only in the server environment, and
is the only thing in the product that can mark an order paid. A redirect the
browser followed proves nothing. Duplicate and out-of-order deliveries are
ordinary: state only moves forward, and a second delivery finds its work done.

**Operations.** `op=fulfilment` lists paid orders with what to pack, hands them
to the supplier, records a shipment with its carrier and tracking, and cancels
or refunds. Admin-only through the existing authorization. Addresses appear
there because a picking list needs them, and are never logged or sent to
analytics.

**Data kept small.** An order holds a name, two address lines, a city, a
postcode and a country — nothing else. No phone number, no date of birth, and
nothing about what the person studied. Deleting an account removes unshipped
orders entirely and redacts the person from shipped ones, so the books still
balance without keeping someone who asked to be forgotten.

## What only you can do

### 1. Get real quotes — the blocking item

Each item needs, from an actual supplier, in writing:

| Field | What it means |
| --- | --- |
| `unitCostMinor` | Blank product cost, minor units |
| `printCostMinor` | Printing or embroidery per unit |
| `shippingCostMinor` | Postage per unit to the regions you will serve |
| `packagingCostMinor` | Mailer, filler, label |
| `priceMinor` | What the learner pays |
| `currency` | ISO 4217. One per deployment |
| `taxIncluded` | Whether tax is inside the price |
| `tokenPrice` | Optional: the token cost, if redeemable |
| `regions` | ISO country codes you will post to |
| `vendor` | Who supplies it |
| `effectiveFrom` | The date these figures took effect |

Enter them in `/dev` → Settings → Merchandise. An entry missing any field is
dropped on read and the item goes back to **not on sale yet**: half a quote is
not a quote. The readiness view shows the margin each quote implies, including
when it is negative.

Also decide, and write into the policy page you link from `policyUrl`: the
returns window, who pays return postage, the delivery estimate per region, and
what happens to a parcel that goes missing.

### 2. Derive token prices from what learners actually earn

Tokens accrue at 10% of verified XP. Before setting a `tokenPrice`, work out how
many hours of study the number represents, and whether you are willing to post
that object for that much study. A token price is a promise to give away a real
object; the code will keep that promise exactly as many times as learners reach
it.

### 3. Configure a payment provider — only if you want cash checkout

Set `PAYMENT_PROVIDER` and `PAYMENT_WEBHOOK_SECRET`, point the provider's
webhook at `POST /api/user/[op]?op=payment-webhook`, and send events shaped
`{ type, orderId, providerRef }` signed as `x-payment-signature`
(HMAC-SHA256, hex, over the raw body). Then set `cashCheckoutEnabled`.

Token redemption works without any of this. Cash does not.

### 4. Enter stock, and keep entering it

`merch_stock` has no default figures — a default stock number is an invented
one. Insert a row per SKU and variant with what you physically hold. Orders
reserve against it, and an item with nothing free reports out of stock rather
than taking an order you cannot fill.

### 5. Leave test mode last

`testMode` starts on and stays on until you turn it off. While it is on the
shop shows a banner on every screen and every order is marked as a test, so a
trial run can never be mistaken for something to post. Turn it off only after a
real end-to-end order has been placed, paid, packed and shipped.

### 6. Name an operations owner

Someone has to read the fulfilment queue, pack parcels, enter tracking numbers
and answer the person whose mug did not arrive. The code makes each of those one
click. It cannot do any of them. Do not enable the shop until a person has
agreed to this and knows how often they will check.

## The order in which to switch things on

1. Enter quotes for one item only. Confirm it shows a price and the margin reads
   as you expect.
2. Add stock for that item. Confirm it becomes orderable.
3. Set `enabled`, leaving `cashCheckoutEnabled` off. Place a token order
   yourself, in test mode, and walk it through submitted and shipped.
4. Cancel a token order and confirm the tokens come back exactly once and the
   stock returns.
5. Only then configure the payment provider, and repeat with a cash order.
6. Turn off test mode.
7. Add the remaining three items, one at a time.

Each step is reversible: unsetting a quote returns the item to **not on sale
yet** without touching an order already placed.
