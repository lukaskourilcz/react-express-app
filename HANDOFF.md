# Handoff — the thirteen changes of 2026-09-09

All thirteen are implemented, on `main`, and every migration they need is live
in production. What is left is not code: nothing signed in has been seen by a
human.

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
  protections are the whole story. There were no live accounts, so nothing
  was lost when migration 032 landed.

## Migrations — applied and verified

All four of 032-035 are in production on project `rvlybcjdpafwyeuojvhl`, applied
2026-09-09. They were exercised first against a local Postgres 16 — the whole
001-035 chain from an empty database, then re-applied to prove idempotency — and
then applied to production and exercised again there.

| File | What it does | State |
| --- | --- | --- |
| 032 | Streak shield; every day counts, no weekend exemption | Applied |
| 033 | Friends: handles, friendships, the list | Applied |
| 034 | One-round-trip Learn answers | Applied |
| 035 | Bought protection, earned merch package | Applied |

What was checked against production after applying, each in a transaction that
was rolled back, leaving no rows behind:

- **Friends.** A handle is claimed, found case-insensitively, requested,
  answered, listed with the crown flag and removed. An unknown handle returns no
  row rather than an error, which is what stops the lookup being an enumeration
  oracle.
- **The shield.** The month grants two. Raising one spends one and sets a
  48-hour window; raising a second while the first is live is refused and spends
  nothing.
- **Buying a protection.** Refused outright on an empty wallet
  (`insufficient_tokens`). With tokens it debits 250 and restores the budget to
  two. At the cap it refuses *and takes no tokens* — the ceiling holds, so no
  amount of spending buys a deeper reserve than a learner who spends nothing
  has.
- **The path reward.** Refused before the path is finished, on an invalid size,
  and on an empty address field. Granted once; a second claim reports `already`
  and creates no second order. The order carries the t-shirt at its size plus
  the mug and the sticker set, priced at zero.
- **Streaks count every day.** The production body of
  `record_verified_quiz_result_v2` contains no off-day, weekend or
  `user_streak_config` logic. `purchase_streak_protection` touches none of
  `user_xp`, `user_badges`, `quest_xp`, leaderboards, `roadmap_progress` or
  `user_category_stats`.
- **Access.** RLS is on for `user_handles`, `friendships` and
  `path_reward_claims`; each has one owner-scoped SELECT policy; `authenticated`
  holds SELECT alone and `anon` holds nothing. All eighteen routines are
  SECURITY DEFINER with an empty `search_path`, executable by `postgres` and
  `service_role` only.
- **Advisors.** Security: no errors, no warnings. Performance flags
  `auth_rls_initplan` on the three new policies, but that is a false positive —
  the stored quals are already the recommended `( SELECT auth.uid()::text )`
  InitPlan form, as are the 29 pre-existing policies it flags identically.

Four bugs came out of running the SQL that reading it had not found: a
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
- The migrations: applied to production and exercised there, as above.

Not checked, because it cannot be from here: anything signed in. The responsive
sweep renders signed out, so the friends tab, the shield control and the claim
form have never been seen with an account behind them. `NEEDED.md` carries that
as an owner item.
