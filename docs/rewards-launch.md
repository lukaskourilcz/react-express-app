# Rewards launch: what the code does, and what only you can do

The Rewards screen (`/shop`) offers five physical objects and one drawing for
coins. The drawing is finished. The objects come from Spreadshop (sprd.net AG),
which prints, sells and ships them from the devShark shop on its EU platform
(#229). Coins are the product's name for the tokens of migration 028: the UI
says coins, the tables, ops and code keep `token`.

This document is the honest split: everything the repository can decide is
decided and shipped; everything that needs a real quote, a real Spreadshop
order or a real person to send a parcel is listed here as work only the owner
can do.
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

**Spreadshop sells; devShark redeems.** Spreadshop has no order API, no
webhooks and no discount codes an owner can create, so the app links out and
embeds nothing. Anyone buys with money in the devShark shop on Spreadshop: each
tile links to its item there once `MERCH_SHOP` in `client/product-catalog.ts`
holds the URL, and `cashCheckoutEnabled` stays off. Premium members redeem
coins for a whole item, never for a discount. A redemption, or the package a
finished learning path earns, is a `merch_orders` row that you fulfil by
ordering the item from your own shop at base price ("order product samples")
to the learner's address.

**Operations.** `/dev` → Merchandise is the picking list (`op=fulfilment`): paid
redemptions and claimed learning-path packages with the items and the address.
Mark an order "Ordered at Spreadshop" once you placed the sample order, then
enter the carrier and tracking number when Spreadshop ships it. The same screen
edits the quotes and this month's caps, and cancels or refunds an order.
Admin-only through the existing authorization. Addresses appear there because a
picking list needs them, and are never logged or sent to analytics. Migration
043 lets a claimed package, which 035 creates awaiting payment at a total of
zero, go through the same queue.

**Data kept small.** An order holds a name, two address lines, a city, a
postcode and a country — nothing else. No phone number, no date of birth, and
nothing about what the person studied. The form tells the learner that the
address goes to sprd.net AG to ship the item. Deleting an account removes
unshipped orders entirely and redacts the person from shipped ones, so the books
still balance without keeping someone who asked to be forgotten. Spreadshop
keeps its own copy of a sample order's address under its own privacy policy,
which `/privacy` names.

## What only you can do

### 1. Open the shop and link it

Register the EU Spreadshop, upload the designs, enable a t-shirt, a hoodie, a
mug and the stickers, set your margins and fill in the shop's legal details.
Then copy the shop's URL and each item's URL into `MERCH_SHOP` in
`client/product-catalog.ts`, and export one square mockup per item into
`client/public/merch/<sku>.webp` (`sticker-set`, `mug`, `t-shirt`, `hoodie`,
`cap`; `.avif`, `.png` and `.jpg` work too). A tile shows an image only when its
file exists, and a link only when its URL is set, so a half-done shop shows
nothing broken.

### 2. Enter the quotes

Order one sample from your own shop to learn the real shipping cost. Then open
`/dev` → Merchandise and fill in, per item:

| Field | With Spreadshop |
| --- | --- |
| Base price (`unitCostMinor`) | What Spreadshop charges you for a sample order. September 2026 EU base prices: t-shirt 17.49 (premium 20.99), hoodie 29.99 (premium 31.99), mug 13.49, sticker 10 × 10 cm 2.49, sticker XS 1.99 |
| Print, packaging | 0: both are inside the base price |
| Shipping (`shippingCostMinor`) | The postage the Spreadshop checkout shows for a sample order |
| Retail price (`priceMinor`) | The price in the devShark shop, for the margin readout |
| Currency, VAT included | EUR, on |
| Coin price (`tokenPrice`) | See section 3 |
| Countries (`regions`) | ISO codes you will post to |
| Vendor | `sprd.net AG` |
| Effective from | The date these figures took effect |

The server drops a quote missing any field, and the item goes back to **not on
sale yet**: half a quote is not a quote. The screen shows the margin each quote
implies, including when it is negative, and tells you after saving if the server
refused one. The `cap` stays in the catalogue unpriced until Spreadshop sells
one.

Also decide, and write into the policy page you link from `policyUrl`: the
returns window, who pays return postage, the delivery estimate per region, and
what happens to a parcel that goes missing.

### 3. Derive coin prices from what learners actually earn

Only Premium members redeem, and the daily cap of 400 coins from XP applies
after the Premium doubling. A heavy day earns 400; a steady Premium learner
earns 100 to 200. So a sticker set at 1,500 coins is about two weeks of steady
learning, a mug at 6,000 about six weeks and a t-shirt at 10,000 about ten
weeks. A mug costs about 13.49 plus shipping, more than the net of several
months of Premium, so the stock cap below is what keeps redemptions affordable:
merchandise is a retention reward, not a margin line. `tokenPrice` is still the
field name. A coin price is a promise to give away a real object; the code will
keep that promise exactly as many times as learners reach it.

### 4. Cash checkout stays off

Cash goes through the Spreadshop checkout, so `cashCheckoutEnabled` stays off
and `/dev` has no switch for it. The payment webhook (`op=payment-webhook`,
`PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, HMAC-SHA256 over the raw body as
`x-payment-signature`) and the order states stay in the code because coin
redemptions and the learning-path package use the same orders. The handler
still reads the order's own row before it acts, refuses a `payment.succeeded`
whose amount or currency differs with 409, and cancels only what is still
awaiting payment.

### 5. Enter the monthly cap, and renew it every month

A print-on-demand item has no shelf, so `merch_stock` is a budget: the number of
items of each SKU and size you will still post this month. Set it in `/dev` →
Merchandise → This month's caps; five mugs a month means 5 for the mug. There
are no default figures, because a default is an invented one. Redemptions hold
a unit until it ships, and an item with nothing free reports out of stock rather
than taking an order you will not fill. The cap cannot drop below what paid
orders hold (`set_merch_stock`, migration 043). Set it again at the start of
each month; shipped orders use it up. A learning-path package holds nothing
when it is claimed and uses the cap when it ships, so enter caps for the
t-shirt, mug and sticker set before you switch a path on.

### 6. Leave test mode last

`testMode` starts on and stays on until you turn it off. While it is on the
shop shows a banner on every screen and every order is marked as a test, so a
trial run can never be mistaken for something to post. Turn it off only after a
real end-to-end order has been placed, paid, packed and shipped.

### 7. Check the queue every week

Once a week, open `/dev` → Merchandise, place a Spreadshop sample order for each
order in the picking list, mark it ordered, and enter the tracking numbers of
what has shipped. Answer the learner whose parcel did not arrive. The code makes
each step one click and does none of them for you, so do not open redemption
until you know who checks the queue and when.

### 8. Optional: Spreadshop's monthly promotion

Spreadshop runs its own promotions in your shop. To announce the current one on
the Rewards screen, request an API key at partner.spreadshirt.net/apiKey and set
`SPREADSHOP_API_KEY`, `SPREADSHOP_SHOP_ID` and, as Spreadshop asks,
`SPREADSHOP_CONTACT_EMAIL` in Vercel. The server reads
`/api/v1/shops/<id>/currentPromotion` and keeps the answer for 30 minutes; the
browser never talks to Spreadshop. The note says that coins never buy a
discount.

## The order in which to switch things on

1. Apply migration 043. Link the shop and add the mockups (section 1).
2. Enter the quote and coin price for one item only. Confirm it shows its coin
   price and the margin reads as you expect.
3. Set its cap. Confirm it becomes redeemable.
4. Open coin redemption, leaving test mode on. Redeem it yourself with a Premium
   account and walk it through ordered and shipped with a real sample order.
5. Cancel a second redemption and confirm the coins come back exactly once and
   the cap returns.
6. Turn off test mode.
7. Add the remaining items, one at a time.

Each step is reversible: unpricing an item returns it to **not on sale yet**
without touching an order already placed.
