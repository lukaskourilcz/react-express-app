# Rewards launch: what the code does, and what only you can do

The Rewards screen (`/shop`) sells four physical objects and one drawing for
coins. The drawing is finished. The four objects need a supplier, and no amount
of code substitutes for one. Coins are the product's name for the tokens of
migration 028: the UI says coins, the tables, ops and code keep `token`.

This document is the honest split: everything the repository can decide is
decided and shipped; everything that needs a real quote, a real payment account
or a real person to pack a parcel is listed here as work only the owner can do.
Until those are done the shop reports each item as **not on sale yet** and
refuses to create an order for it through any route — the UI, a crafted request,
or an admin call. There is no placeholder price anywhere in the product.

## The rule that outranks the rest

Nothing in the shop touches learning. Buying, owning and wearing anything
changes no access, no content, no XP, no score, no streak, no rank, no
leaderboard position and no prerequisite. The crown is a picture. Premium
(`shared/tiers.ts`) decides which content a learner may start and, since #227,
who may redeem coins for merchandise; it changes nothing else. This is
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

Credits come from XP the server itself verified, keyed to that award's own id:
a quiz or daily result, a Biggest Shark Challenge run, a Learn level or part
test passed for the first time, and a coding challenge passed for the first
time. Every account earns 10 % of that XP, Premium earns double, and one
account earns at most 400 coins a day from XP, counted after the doubling
(migration 041, `credit_verified_xp_tokens`). Premium milestones pay on top of
the cap, once per account: a live streak of 7, 30 and 100 days, a Learn topic
finished, an evolving project or short path finished, and the top three of a
finished month. Replaying an award or a milestone credits nothing. The welcome
grant is one ledger event derived from the account id, paid on the account's
first wallet read, so a second device grants nothing and there is no
`user_metadata` flag to forge. The rates live in `shared/rewards.ts` and in
`/dev` → Settings → Coins.

Invitations pay too (migration 042, #228). A friend who signs up through a
learner's invite link and finishes a first Learn level earns 100 coins for each
of the two accounts, once. An inviter is paid for at most 20 friends, and a code
binds only to an account at most 48 hours old. Count those coins in the
calibration below: 20 friends are 2,000 coins, a third of a mug.

**Redeeming is Premium only.** A free account sees the merchandise and the
upgrade sheet; `op=orders` answers its redemption with 402 before it asks for
an address. The crown and streak protection stay open to every account.

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

Enter them in the game settings under `merch.pricing` (a `/dev` → Settings →
Merchandise editor is planned for #229; until it exists this needs SQL on
`app_settings`, and saving the `/dev` form keeps what is there). An entry
missing any field is dropped on read and the item goes back to **not on sale
yet**: half a quote is not a quote. The readiness view shows the margin each
quote implies, including when it is negative.

Also decide, and write into the policy page you link from `policyUrl`: the
returns window, who pays return postage, the delivery estimate per region, and
what happens to a parcel that goes missing.

### 2. Derive coin prices from what learners actually earn

Only Premium members redeem, and the daily cap of 400 coins from XP applies
after the Premium doubling. A heavy day earns 400; a steady Premium learner
earns 100 to 200. So a sticker set at 1,500 coins is about two weeks of steady
learning, a mug at 6,000 about six weeks and a t-shirt at 10,000 about ten
weeks. A mug costs about 13.49 plus shipping, more than the net of several
months of Premium, so the stock cap below is what keeps redemptions affordable:
merchandise is a retention reward, not a margin line. `tokenPrice` is still the
field name. A coin price is a promise to give away a real object; the code will
keep that promise exactly as many times as learners reach it.

### 3. Configure a payment provider — only if you want cash checkout

Set `PAYMENT_PROVIDER` and `PAYMENT_WEBHOOK_SECRET`, point the provider's
webhook at `POST /api/user/[op]?op=payment-webhook`, and send events shaped
`{ type, orderId, providerRef, amountMinor, currency }` signed as
`x-payment-signature` (HMAC-SHA256, hex, over the raw body). Then set
`cashCheckoutEnabled`.

The handler reads the order's own row before it acts. A `payment.succeeded`
whose `amountMinor` or `currency` is missing or differs from the total the
server computed is refused with 409, so the provider retries and the mismatch
stays visible; it never marks the order paid. A `payment.failed` or
`checkout.expired` cancels the order only while it is still awaiting payment —
a stale failure from a first checkout cannot cancel an order a second checkout
paid — and `payment.refunded` may cancel a paid order.

Token redemption works without any of this. Cash does not.

### 4. Enter the monthly cap, and renew it every month

A print-on-demand item has no shelf, so `merch_stock` is a budget: the number of
items of each SKU and variant you will post this month. Five mugs a month means
`on_hand = 5` for `mug`. There are no default figures, because a default is an
invented one. Redemptions reserve against it, and an item with nothing free
reports out of stock rather than taking an order you will not fill. Raise
`on_hand` again at the start of each month; shipped orders use it up.

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
