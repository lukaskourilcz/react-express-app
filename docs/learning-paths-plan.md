# Modernization release: acceptance matrix and rollout

The record for issue #174. It states, per child of epic #150, what was built on
this branch, what verifies it, and what is not done. Nothing below is marked
complete on the strength of a plan: a row is only "implemented" when code exists
and a check exercises it.

Two things roll out separately, because they carry different risk:

- **Learning and profile** — issues #151–#166. Additive schema, additive API ops,
  and surfaces that fall back to their previous behaviour when the new data is
  absent.
- **Commerce** — issues #167–#173. Ships switched off. No supplier, no price, no
  payment provider, so nothing can be bought; see `docs/rewards-launch.md` for
  what a person has to decide before any of it opens.

## Acceptance matrix

| Issue | Built | Verified by | Not done |
| --- | --- | --- | --- |
| #151 Learner profile | `shared/learner-profile.ts`, `lib/learner-profile-store.ts`, `?op=learner-profile`, `LearnerProfileDialog`, `LearningPlanCard`, migration 026 | `test:launch`: validation, partial drafts, version bump re-asks, plan-change detection | OAuth resume is exercised through the same op as email; no browser test drives a real OAuth round trip |
| #152 Progression graph | `shared/progression.ts`, `lib/progression.ts`, guards in `api/quiz/roadmap.ts` on issuance, answer and completion | `test:launch`: acyclic graph, reachable first step for all twelve selections, level and checkpoint gates, forged step numbers, out-of-plan topics, diagnostics not bypassing | Cross-path unlocks beyond the FDE bridge are declared but have no authored content to link to |
| #153 Personalised surfaces | `RoadmapTree` plan mode, `PlanSummary`, Today filtered by eligibility, the exact "More learning paths…" note in EN and CS | `test:launch` (eligibility shape), `check:responsive` on `/roadmap` and `/learn` | Locked bookmarks are explained in the library screen; the roadmap tree does not yet list them |
| #154 Code-ordering puzzles | `shared/coding-puzzle.ts`, `lib/coding/puzzles/`, `CodePuzzle`, sealed permutation, migration 026 evidence table | `test:coding`: every accepted arrangement passes the task's own tests, every distractor breaks it, grading follows the sealed permutation | 12 puzzles, all JavaScript. TypeScript and React tasks have none, so those stay desktop-pending on a phone |
| #155 Resources panel | `resourcesFor()`, Resources tab, registry check | `test:coding`: no unreviewed host, no playground or solution link, no duplicate, every link is a technique of its task | — |
| #156 Failure-specific hints | `shared/coding-failures.ts`, `lib/coding/failure-hints.ts`, verdict carries the advice | `test:coding`: no hidden fixture, internal error or solution quoted; both languages; every category has a fallback; classifier separates compile, runtime and test | Task-specific advice exists for six tasks; the rest fall back to the category |
| #157 Library | `shared/coding-library.ts`, `lib/coding/library-handlers.ts`, `CodingLibraryScreen`, migration 027 | `test:coding`: name normalisation, id validation. Limits enforced in the API and by a database trigger | Export of the library as a file is not implemented; deletion is covered by account erasure |
| #158 Curated approaches | `shared/coding-approaches.ts`, `lib/coding/approaches/`, `?resource=coding-approaches`, Approaches tab | `test:coding`: every approach passes the task's own tests, complexities are from the documented set, both languages | 6 tasks covered, all JavaScript. DSA comparisons wait on the DSA catalogue (#145–#148, outside this branch) |
| #159 Practice sessions | `shared/practice-session.ts`, `lib/coding/practice-handlers.ts`, `PracticeSessionScreen`, migration 028 | `test:launch`: determinism, budget, review share, skip exclusion, touch preference, honest empty queue | — |
| #160 Skip reasons | `shared/coding-skip.ts`, `?op=coding-skip`, `SkipPanel` | `test:launch`: the handler is asserted not to touch the verdict, XP or level tables | — |
| #161 Search and filters | `CodingFilters.tsx`, URL-backed state, `CodingFilterBar` | `test:launch` (section tracks), `check:responsive` on `/coding/javascript` | — |
| #162 Lesson examples | `shared/lesson-examples.ts`, `LessonExample.tsx`, mounted in the level intro | `test:launch`: coverage manifest spans JS, TS, React and DSA; runnable examples print something; trace-only examples ask for no evaluation; the component cannot reach the submit path | 6 examples. The React one is trace-only because a render needs the preview frame |
| #163 Repair exercises | `debug` metadata through to the summaries, four authored JavaScript repairs | `test:coding`: each reference repair passes and each broken starter fails; the summary carries the format | 4 repairs, all JavaScript |
| #164 Workspace | Two-column layout with a keyboard separator, focus mode, layout preferences under their own key | `test:launch`: separator semantics, keyboard handling, focus after grading, layout storage is not code storage | — |
| #165 Coding tracks | `CODING_SECTION_TRACKS`, retired-track screen | `test:launch`: the section index excludes system design while the catalogue keeps it | — |
| #166 devShark footer | `BrandFooter` gated on the product; CLAUDE.md and AGENTS.md updated | `test:launch`: the family blocks are gated, the legal row and settings remain | — |
| #167 Merchandise spec | `shared/merchandise.ts`, `lib/rewards/config.ts`, `docs/rewards-launch.md` | `test:launch`: five SKUs, print briefs on physical items only, nothing buyable unconfigured | **No supplier quote, no price, no region, no tax treatment.** All owner decisions |
| #168 Server wallet | `sync_reward_wallet`, `move_reward_tokens`, `?op=wallet`, migration 029 | `test:launch`: the balance comes from the ledger, a local balance is never converted, no total comes from the request | Reconciliation of historical local balances is deliberately not automated |
| #169 Shop catalogue | Rewritten `Shop.tsx`, blockers rendered per item, ring and flair sales retired | `test:launch`: availability rules, retired purchase path, `check:responsive` on `/shop` | Product photography does not exist; the cards use the brand marks |
| #170 Orders | `place_reward_order`, `advance_reward_order`, `?op=orders` | `test:launch`: transition table, address validation, idempotency-key shape | End-to-end concurrency is enforced in SQL (`FOR UPDATE`, unique keys) but is not exercised by an integration test — there is no test database in this environment |
| #171 Payments | `lib/rewards/payments.ts`, `?op=payment-webhook` | `test:launch`: signature verify and reject, forged amount, replay window, malformed and missing secret, event parsing | **No provider configured.** Live charging additionally requires `REWARDS_PAYMENT_MODE=live` |
| #172 Fulfilment | `lib/rewards/fulfillment.ts`, `?op=fulfilment` on the admin dispatcher | `test:launch`: addresses are never logged; the export refuses without a supplier and an operations owner | **No supplier and no operations owner.** No real dispatch has been made |
| #173 Crown | `CrownIcon`, `LearnerAvatar`, server-verified ownership and equipping | `test:launch`: decorative mark, named in the accessible label, unowned equip refused in SQL | The crown does not appear on the leaderboard or in the Play lobby — see the blocker below |
| #174 This matrix | This document, plus the assertions listed above | The repository gates below | Integration coverage that needs a live database is not present |

## Rollout and rollback

**Order.** Migrations 026 → 027 → 028 → 029, then the application. Every
migration is additive: new tables, new functions, and one redefinition of
`delete_user_data` per migration that extends its coverage. No column is dropped
and no existing row is rewritten, so the application before this change keeps
working against the new schema.

**Feature state after deploy.**

- The learner profile is empty for everyone. Every surface falls back to the
  general roadmap until a learner answers, so nothing breaks on day one.
- The progression guard is inert for a learner with no profile: `decideStep`
  returns `no_profile` and the API allows the request, exactly as before.
- The wallet is empty until its first sync, which derives it from
  `verified_activity_awards` — evidence that already exists.
- The shop is closed. Every item reports its blockers.

**Rollback.** Redeploy the previous application build. The new tables are
unreferenced by it and can be left in place; nothing in them is required by the
old code, and no old table gained a column. If the schema must also be rolled
back, drop in reverse order (029 → 026); `delete_user_data` should then be
restored from migration 025.

**Data reconciliation.** The one place old and new data meet is the token
balance. The old wallet lived in `localStorage` and in the account-synced
progress blob, and was never verified. The new wallet is derived from
`verified_activity_awards`, so a learner's balance is recomputed from evidence
rather than migrated. The old number is shown to them, labelled unverified, and
is not added. That is deliberate: converting it would mint value from a browser.
If the owner decides to honour historical balances, that is an
`adjustment`-reason ledger entry per account, made by a person, and is not
automated here.

## What is not covered

1. **A live database.** This environment has no Supabase instance, so the SQL
   functions are reviewed and their contracts tested at the TypeScript boundary,
   but the concurrency behaviour of `place_reward_order` and
   `advance_reward_order` is not exercised end to end. That is the largest gap
   in this branch.
2. **FDE and DSA curricula.** Issues #137–#139 and #145–#148 are outside this
   branch. The progression graph declares the FDE bridge and marks the module
   stage as content-pending so the Roadmap says so rather than drawing a dead
   end; DSA Foundations uses the `dsa` and `algorithms` topics that already
   exist.
3. **Puzzle and repair coverage.** Arrangement puzzles and repair exercises are
   JavaScript only. A TypeScript or React task on a phone still shows the
   desktop-resume pending state, which is the honest outcome rather than a pass.
4. **The crown on public surfaces.** See `docs/rewards-launch.md`; it needs a
   reviewed change to three leaderboard functions and an owner decision about
   making a purchase publicly visible.
5. **Commerce.** Nothing can be bought. Six owner decisions are listed in
   `docs/rewards-launch.md`.

## The gates

Run from the repository root:

```
npm run typecheck:api
npm run test:launch
npm run test:coding
npm run build
npm run check:responsive          # needs a preview server on :4173 and CHROME_BIN
npm run test:harness              # needs CHROME_BIN
npm audit --omit=dev
npm audit --omit=dev --prefix client
git diff --check
```
