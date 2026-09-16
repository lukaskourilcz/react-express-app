# Handoff — issues #193 to #205

Written at the end of the session of 2026-09-16. Branch: `claude/elegant-cori-h9cdgb`.
Six of the thirteen issues were implemented; the rest were not started.

## What landed

| Commit | Issues | Subject |
| --- | --- | --- |
| `4e7e63b` | #193 | Streak extension moment, day-7 milestone, two armed protections |
| `fa1d29f` | #194 | Weekly micro-leagues judged by one retention rate |
| `8cccd83` | #195, #196, #202, #203 | Puzzle sprint, Lichess puzzle import, Turnstile integrity, merch cap |

## Validation

On the committed tree, every one of these actually ran and exited 0:
`npm run typecheck:api`, `npm run test:launch`, `npm run test:grading-integrity`,
`npm run test:paths`, `npm run check:security`, `npm run check:unused`,
`npm run test:client` (11 files, 72 tests), `npm run build`, `git diff --check`,
and `npx tsc --noEmit` inside `client/`.

`npm run check:responsive` was **not** run to completion in the implementing
lanes and no responsive, browser or axe result is claimed for the League tab,
the sprint screen or the streak panel. A Chromium binary is available in this
environment now, so that is a real next step rather than a blocked one.

The protected behaviour held: exactly twelve physical handlers under `api/`, the
launch contract's fairness-neutral-rewards assertions pass, and the league
routines are gated against ever naming `user_xp`, `quest_xp`, `user_badges`,
`user_cards`, `token_balances`, `token_ledger`, `cosmetic_entitlements`,
`roadmap_progress` or `coding_progress`, or reading `current_streak` /
`longest_streak`.

## The five migrations are NOT applied — read this before running them

`supabase/supabase-schema-038.sql` through `042.sql` are committed and
unapplied. This is a multi-user production database and an agent session has no
business writing to it, so they were deliberately left for the owner.

**Apply them in numeric order: 036 → 038 → 039 → 040 → 041 → 042.** There is no
`037` in the tree — two concurrent lanes both planned it and the streak lane
landed on `039`. Migration 038 is the league one and 039 is the streak one;
confirm that before applying, because 039 restates
`record_verified_quiz_result_v2` and 038 deliberately does not, so there is no
conflict in this release but a third file restating it would have to be
reconciled by hand.

**One of them reverses a decision you verified in production.** Migration 032
refused a second live shield by design, and `NEEDED.md` records that you
confirmed that refusal on 2026-09-09. Migration 039 reverses it because #193
asked for up to two armed protections. That is the one migration here that
deserves a deliberate read rather than a routine apply. The ceiling itself does
not move: two a month is still the whole budget.

Until they run, the features degrade honestly rather than break —
`/api/user/freezes` answers `slotsSupported: false`, and `/leaderboard` → This
week and `/dev` → Return rate both report `migration_required`.

## Not started — 7 issues

#197 (FSRS scheduling with Again/Hard/Good/Easy), #198 (geoShark Czech map
quizzes as indexable landing pages), #199 (teachers: NPI ČR, Učitelé+, a free
live-class round), #200 (devShark grading runtime: quickjs-emscripten, Vercel
Sandbox, Vitest type tests), #201 (offline quiz play with Workbox), #204
(community mentoring and supporter perks), #205 (shark mascot short-video
channel or creator sponsorship).

Note #200 overlaps work already on `main`: the head commit before this branch is
"Keep QuickJS grading authority outside learner code and record live launch
checks", so read that before re-deriving a plan.

Each issue was triaged by its implementing agent rather than in advance, so
there is no stored plan for these seven — the next session should read each
issue directly.

## Owner decisions the committed work is waiting on

- **#194: a league room shows up to thirty strangers a name.** `league_board`
  prefers `user_handles.handle` and falls back to the same `user_stats.name`
  COALESCE the three existing boards already use — which migration 036 itself
  called "what an OAuth provider handed us and nobody chose to publish". Keeping
  the fallback regresses nothing; dropping it shows `Anonymous` to everyone
  without a handle. It was flagged rather than decided.
- **#193: Duolingo's reserve-until-miss semantics are not what this
  implements.** StudyShark consumes a protection at arm time; Duolingo consumes
  on the missed day. Keeping consume-at-arm was the smallest change that honours
  the ceiling. The alternative is a larger migration.
- **#194: judge it by the return rate, and say how small the sample is.** The
  mechanism is wired; the judgement needs traffic. Record the sample size rather
  than report a lift.

## A note on merging

`CLAUDE.md` says to push and merge to `main` at the end of every session and that
this project auto-deploys from `main` on Vercel. This session's branch
instruction was explicit that everything goes to `claude/elegant-cori-h9cdgb`,
so the merge was left to the owner — and because a merge here **does** deploy,
the five unapplied migrations above should land first, or the deployed client
will ask for tables that do not exist.
