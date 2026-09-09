# Handoff — the thirteen changes of 2026-09-09

Everything below is on `main` and deployed. This file exists because three of
the thirteen requested changes are finished in the database and not yet wired to
a screen, and because two of them change something the repository documents as
an invariant. Both need a decision, not just more code.

Read `docs/release-acceptance.md` for what was verified and how. This file is
only what is *left*.

## Done and live

| # | Change | Where |
| --- | --- | --- |
| 1 | "Why this question?" note dropped from all three surfaces | `9a49faa` |
| 2 | Practice mode gone — every quiz counts | `67ea854`, `2864d8f` |
| 3 | TypeScript moved to a late stage of its own on all three tracks | `23a2b3a` |
| 4 | Shark Cards, the last-quiz date and the streak-freeze card off the profile; the tip inlined as a one-liner; the shield in the streak container; days off removed | `fae617f` |
| 5 | Friends: opt-in handle, consent-gated list, crown shown and never ordering | `76c9f70` |
| 6 | Answering a Learn question is one database round trip, not three | `d37dc79` |
| 7 | The account menu no longer escapes its popover | `a8d68e5` |
| 8 | Coding techniques read as content rather than as bare pills | `f9b7b7e` |
| 9 | The roadmap pillars and the profile chips stopped painting by position | `86cff67` |

## Not finished

### A. The shop still sells the old cosmetics

**Asked for:** "The only thing he could buy will be the crown and the streak +
then merch."

**Done:** the SQL for buying a streak protection (`supabase-schema-035.sql`,
`purchase_streak_protection`), applied and exercised locally.

**Left:** the client shop still lists three rings and three flairs
(`client/src/lib/shop.ts`, `STATIC_CATALOGUE`). They need to stop being
*purchasable* without stopping being *ownable* — learners already own some, and
`useEquippedRingColor` / `useEquippedFlair` render them in the profile header.
Split the list in two: what is for sale, and what can be worn. Removing the
definitions outright would strip an equipped item off an account that paid for
it, which the repo's own rule against withdrawing earned things forbids.

Then add protection to the shop UI and an op that calls
`purchase_streak_protection` — `handleCosmetic` in `lib/rewards/handlers.ts` is
the pattern to copy, and `RATE_LIMITS.userMutation` already covers it.

There is no price yet. `MerchSettings.crownTokenPrice` is 1200 and tokens accrue
at 10% of verified XP, so a crown is roughly 12,000 XP. A protection should cost
far less than that — it is consumable and capped at two. **Someone has to pick
the number.**

### B. The merchandise package has no screen

**Asked for:** "When user completes the entire learning path, he will get a
t-shirt and a mug and stickers, the whole merch package."

**Done:** `claim_path_reward` and `path_is_complete` in
`supabase-schema-035.sql`. Completion is derived from the progress rows the
graders wrote, the claim is keyed by (learner, path) so it grants exactly once,
and the order is created unpaid and unpriced.

**Left:** an op on `api/user/[op].ts` and a claim form. The form needs the
shirt size and a shipping address, because `merch_orders` requires one and
inventing a placeholder would put a fake address in the table the owner ships
from. `LearningPathsCard` is the natural home for the entry point.

Two things to be honest about in the copy: merchandise is **unconfigured** —
no supplier, no stock, no postage — so a claim produces an order waiting for the
owner, not a parcel. And "the entire learning path" currently means one path
(DSA Foundations or FDE), not both. If the owner meant both, `path_is_complete`
takes a path id and would need a second call.

### C. Two invariants now say something the code does not

This is the part that needs a decision rather than an implementation.

**CLAUDE.md** and `docs/product-architecture.md` say streak freezes "never
change ... streaks". That was already inaccurate before today: since migration
024, returning after a missed day spends a protection and the streak survives.
Making protections purchasable widens it — a learning-earned currency now buys
one — but it does not create the exception, it enlarges one that existed.

`shared/rewards.ts`'s header is more direct: "Buying anything ... changes ... no
streak." That sentence becomes false the moment A ships.

The honest correction is to say what the code does:

> All learning is free. Support, cosmetic shop items, collectible Shark Cards
> and badges never change access, content, explanations, paths, XP, scores,
> ranks, leaderboards, matchmaking or AI availability. Streak protection is the
> one bounded exception: two a month, free; extra ones cost tokens earned by
> learning; the ceiling never rises above two; and a protection changes the day
> count of a streak and nothing else. No leaderboard in this product ranks by
> streak.

Update all four places in the same commit as A, or the next agent will read the
old sentence and revert the feature as a bug.

### D. Weekends now count against a streak

Dropping days off, as asked, removed the rule that a learner's configured
off-days — weekends by default — never broke a streak. Every calendar day counts
now, and the two monthly protections are the whole story.

That is the point: two rules for the same thing meant nobody could tell which
one had saved their streak. But it is a real change for people mid-streak. A
learner who practises on weekdays and has a long streak built under the old rule
can lose it the first weekend after migration 032 reaches production.

The alternative is a fixed weekend grace with no setting — one line in
`record_verified_quiz_result_v2`. **Decide before applying 032.** It is in
`NEEDED.md` too.

## Migrations waiting to be applied

None of 032–035 is in production. This session lost its Supabase connection
partway through, so all four were applied and exercised against a local
Postgres 16 instead — the full 001–035 chain from an empty database, then
re-applied to prove idempotency.

| File | What it does | Blocked on |
| --- | --- | --- |
| 032 | Streak shield; off-days no longer exempt | Decision D |
| 033 | Friends: handles, friendships, the list | Nothing |
| 034 | One-round-trip Learn answers | Nothing |
| 035 | Bought protection, earned merch package | Decisions A and C |

Every client and server path degrades until its migration lands: the profile
shows no shield control, the friends tab says it is unavailable, and the answer
handler falls back to the two-step path it replaces. Nothing is broken by
waiting; the features are simply dark.

To run them locally the way this session did:

```
initdb, then apply supabase/supabase-schema*.sql in version order.
The migrations assume Supabase's shape, so create `auth.uid()` and the
anon / authenticated / service_role roles first.
```

Four bugs came out of doing that which reading the SQL had not found: a
CREATE OR REPLACE cannot widen a function's return type; `remaining`,
`shield_until` and `order_id` are ambiguous against their functions' own OUT
parameters; `merch_orders` has no `subject` column and requires an address; and
`variant` is part of the order-item primary key, so an item without one carries
the empty string. Run the SQL. Do not read it and hope.

## What was checked

- `npm run typecheck:api`, `cd client && tsc`, `npm run build`, `npm run
  test:launch`, `npm run test:coding`, `npm run test:paths` — all pass.
- `npm run check:responsive` over the changed routes at 360/390/768/1280 in
  English, and at 360/390 in Czech and dark — no overflow, nothing escaping a
  parent.
- EN/CS key parity is now asserted by the launch contract in both directions.
- The migrations, as above.

Not checked, because it cannot be from here: anything signed in. The responsive
sweep renders signed out, so the friends tab, the shield control and the claim
form have never been seen with an account behind them. `NEEDED.md` carries that
as an owner item.
