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

## The package a finished path earns

Everything above is about things people buy. The package is the opposite
direction: finish every module of a learning path and the server grants a
t-shirt, a mug and a sticker set, once, keyed to the pair of you and the path.
Nobody pays for it, which removes the question of price and leaves a harder one.
It is the only thing in this product that costs real money every time somebody
succeeds at learning, and until now the number of them leaving in a month was
whatever number of learners happened to finish.

### What one costs

`packageCosting` in `shared/rewards.ts` adds up the landed cost of the three
items — blank, print, postage, packaging — from the same owner-entered quotes
the shop uses. It reports `unquoted` and names what is missing while any of the
three has no quote, and `mixed_currency` when the quotes disagree about the
currency, because three numbers in two currencies are not a total. There is no
default figure and no partial one: two quotes out of three is still not the cost
of a box with three things in it.

### How many go out

`packagesPerMonth` is the ceiling, and `packageMonthlyCeilingMinor` reads the
month's worst case off it: every slot filled, plus the print-on-demand plan's
monthly fee, which is charged whether anybody claims or not.

The cap is kept in the database rather than in front of it. Migration 040 counts
the calendar month inside the claiming transaction, from the same
`path_reward_claims` table the one-time guarantee lives in, and holds a
transaction advisory lock keyed by that month so two people claiming at once
cannot both take the last slot. A full month raises before anything is written,
so a refused claim leaves no order, no claim row and no address behind.

A full month does not withdraw the reward. The claim row is only ever written on
a granted claim, so the completion that earned it is still there and the claim
can be taken when the month turns over. The learner is told that, in both
languages, instead of being shown a button that fails.

### What is switched off

No cap is set. `packagesPerMonth` defaults to `null`, which means undecided
rather than unlimited: `packageProgramState` reports `cap_not_set`, the monthly
ceiling reports nothing at all, and claiming behaves exactly as it did before
any of this existed. Setting a number is what turns the guarantee on, and it is
step 7 below.

### The supplier decision this waits on

Issue [#203](https://github.com/lukaskourilcz/react-express-app/issues/203)
records the research behind the choice and cites
[printful.com/pricing](https://www.printful.com/pricing),
[printful.com/print-on-demand-europe](https://www.printful.com/print-on-demand-europe)
and [printify.com/pricing](https://printify.com/pricing/). Two figures from it
matter to the model above: a print-on-demand account with no monthly fee, where
each parcel is billed per order, and a subscription tier that trades a monthly
fee for a per-unit discount. The issue quotes Printful's Growth tier at USD
24.99 a month and a Bella + Canvas 3001 tee from USD 11.92 plus EU shipping, as
of 16 September 2026.

**Those numbers were not re-checked here and none of them is in the code.** They
are the shape of the decision, not the decision: print-on-demand pricing moves,
shipping to your regions is not in either figure, and a quote that is a year old
is not a quote. Get current per-unit prices for all three items from the vendor
you actually open an account with, enter them the way section 1 describes, and
the model will tell you what a month costs at the cap you set. The subscription
tier only pays for itself above a volume the cap is what decides — so set the
cap first and read the fee off it, not the other way round.

### The cheap cosmetic stays cheap

The package is the expensive reward and the cap is what makes it survivable.
What supporters get is the other end: the crown is an SVG this repository draws,
it costs tokens earned by learning, it ships nothing and it costs nothing to
honour. Lichess sells Patron wings and Codewars a red badge on the same
principle. Keep that tier as it is — it is the one that scales without a
supplier, and a launch contract asserts it stays priced and stays cosmetic.

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

Enter them under `merch.pricing.<sku>` in the game settings, which means
`POST /api/admin/[op]?op=settings` with the whole settings object. There is no
merchandise form on `/dev` → App settings and this document used to say there
was: that page edits features, balance and cosmetic token prices, and none of
the eleven commercial fields appears on it. Building the form is worth doing
before a second person enters a quote; a single owner entering four quotes once
does not need it, and a form that pretends a field is optional would be worse
than the round trip.

An entry missing any field is dropped on read and the item goes back to **not on
sale yet**: half a quote is not a quote. `merchMarginMinor` gives the margin each
quote implies, including when it is negative.

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

### 7. Set the monthly package cap

`merch.packagesPerMonth` in the game settings, entered the same way the quotes
are (section 1). It is the number of path-completion packages you are willing to
pay for and pack in one calendar month, and nothing in the repository will pick
it for you, because picking it is agreeing to spend that money.

Work it out from the cost, not from a guess about demand: enter the three quotes
first, read the per-unit figure the model gives you, and multiply by the number
of parcels a month you can afford and physically post. Zero is a legitimate
answer and is honoured as one — it means no packages go out this month, which is
different from leaving the field unset.

Leave it unset and nothing changes from today: claims are granted as they always
were, and `packageProgramState` reports `cap_not_set` so the readiness view says
out loud that the cost is unbounded. That is safe only while merchandise is
unconfigured and nothing actually ships. Set the number before the first quote
goes in.

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

The package cap belongs before step 1, not after step 7. It is the only figure
here that bounds what a good month costs you, and the only one whose absence is
invisible until the parcels are already owed.
