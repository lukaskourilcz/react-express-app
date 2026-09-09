# Handoff — the thirteen changes of 2026-09-09

All thirteen are implemented and on `main`. What is left is not code: four
migrations have to be applied to production, and nothing signed in has been
seen by a human.

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

## Everything asked for is now implemented

The three items this file was written to hand over were finished on the same
day, and the two decisions it could not make were answered by the owner:

- **The shop sells the crown, streak protection and merchandise.** The legacy
  rings and flairs turned out to be unsellable already; they stay ownable and
  keep rendering for anybody who has them. A protection costs 250 tokens —
  against the crown's 1200, because it is consumable and capped at two.
- **The merchandise package has its screen.** It appears on a path card only
  once the server says the path is finished, collects a size and an address,
  and claims once.
- **The invariant now says what the code does**, in `CLAUDE.md`, `AGENTS.md`,
  `docs/product-architecture.md` and `shared/rewards.ts` — and four bounds on
  the exception are asserted by the launch contract rather than promised in
  prose.
- **Weekends are not free.** Every calendar day counts; the two monthly
  protections are the whole story. There are no live accounts yet, so nothing
  is lost by applying migration 032.

## Migrations waiting to be applied

None of 032–035 is in production. This session lost its Supabase connection
partway through, so all four were applied and exercised against a local
Postgres 16 instead — the full 001–035 chain from an empty database, then
re-applied to prove idempotency.

| File | What it does | Blocked on |
| --- | --- | --- |
| 032 | Streak shield; every day counts, no weekend exemption | Nothing — decided |
| 033 | Friends: handles, friendships, the list | Nothing |
| 034 | One-round-trip Learn answers | Nothing |
| 035 | Bought protection, earned merch package | Nothing — decided |

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
