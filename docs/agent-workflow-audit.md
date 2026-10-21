# Agent workflow audit: skills, agents and commands to add

Prepared 21 October 2026 against main `5b114d2`, as the companion to [the Learn sections and FDE flagship plan](learn-sections-fde-flagship-plan.md). Status: **approved by the owner on 21 October 2026**; the proposals are the Epic C issues. Read-only audit: no skill was changed.

## 1. What exists

| Item | Purpose | State |
|---|---|---|
| `shark-product-context` | Product guardrails: one subject, twelve handlers, tiers, English only, no AI | current; still frames localisation as live work |
| `shark-release-validation`, `commands/release-validate.md` | Six release commands, handler count, doc reconciliation | **incomplete**: the `verify` CI job runs about twenty-five commands (`quality.yml`), so a branch that passes the six still bounces in CI (PR #401 failed `check:bundle` by 182 gzip bytes, per `docs/release-acceptance.md`) |
| `shark-screen-implementation`, `commands/implement-screen.md` | Screen workflow end to end | current; omits the route-local dictionaries and the bundle budget |
| `deep-end-design-system`, `visual-qa-accessibility`, `generated-media-production`, `preview-video`, `markdown-checkup` | Design, QA, media, markdown hygiene | current |
| `session-start`, `session-end` | NEEDED.md routine | **`session-end` is stale**: it says "push and merge to `main`", while CLAUDE.md requires a pull request with `verify` and `sql` green |
| `stop-slop`, `task-observer`, `find-skills`, `ui-ux-pro-max` | Vendored upstream | current by contract |
| `supabase`, `supabase-postgres-best-practices` | Installed through `skills-lock.json` | current |
| Agents: `accessibility-visual-qa-reviewer`, `design-system-engineer`, `generated-media-art-director`, `product-copy-reviewer`, `product-design-auditor` | Design, QA, media, copy | current; `product-copy-reviewer` loses its second-language note in epic D |
| Commands: `audit-reuse`, `design-audit`, `generate-shark-media`, `review-copy`, `visual-qa` | Thin wrappers over the skills | current |

Every existing skill covers design, QA, copy or product rules. None covers content authoring, migrations, API operations, gating, routes or the CI contract, which is where the git history shows sessions spend their time: 65 migrations, 49 coding task files, 37 solution files, ten consecutive `codex/content-audit-b*` pull requests, and the performance and bank-residual branches.

## 2. Where sessions lose time today

- **The CI contract is re-derived.** The skill lists six commands; `verify` runs `typecheck:api`, `typecheck:scripts`, `typecheck:tooling`, `audit:native-reviews`, `test:performance`, `test:launch`, `test:coding-auth`, `test:grading-integrity`, `test:path-authority`, `test:react-authority`, `test:coding`, `test:paths`, `test:billing`, `test:fallbacks`, `test:garden`, `test:live-grading`, `test:client`, `check:unused`, `check:security`, `check:public`, `check:bundle`, `check:responsive` in both themes, `test:harness`, the Playwright specs and Storybook. Each miss costs a 30-minute `verify` cycle.
- **The curation hash gate is rediscovered.** A question or task is served only when `docs/audit/devshark-content-ledger.json` holds a record for its exact content hash, so any wording edit withholds the item until the ledger is updated and `npm run build:curation-registry` regenerates `lib/curation-registry.ts`. The only places that say so are `docs/curation-claims.md` and one assertion in `scripts/test-launch-contracts.ts`.
- **The migration ritual is reconstructed from NEEDED.md prose.** The Docker command and the empty-database requirement for `npm run test:sql`, the meaning of `supabase/tests/known-failures.txt`, the `isRpcMissing` fallback rule and the "apply before deploy" wording live in script comments and six NEEDED entries.
- **The second-language parity checks surprise.** `lib/learning-paths/validate.ts` and `lib/question-quality.ts` still require a second copy of every string although the product ships English only; epic D removes them.
- **Exact-string contracts are learned by reading 5,700 lines.** `scripts/test-launch-contracts.ts` asserts handler source text, header regexes and copy strings; a change that touches one of them fails without a hint about where the contract lives.
- **Handoffs and acceptance entries are hand-written in a repeated, undocumented shape** (`docs/audit/HANDOFF-176-w1.md`, `SECOND-HANDOFF-25-9-2026.md`, the entries in `docs/release-acceptance.md`).
- **The browser environment is learned per session**: `CHROME_BIN=/opt/pw-browsers/chromium`, the fixtures `check:responsive` needs, `tests/browser/fake-session.ts`.

## 3. Proposed skills, ranked

Each skill is a `SKILL.md` under `.claude/skills/<name>/` with the frontmatter the existing skills use, a `references/` folder only where a template is long, and a validation block that names real scripts. Names, triggers and contents:

| # | Skill | Trigger line | What the file states | Validation it names |
|---|---|---|---|---|
| 1 | `supabase-migration` | Author, test and record a numbered schema migration. Use for any change under `supabase/`. | next-number rule; the 065 template (`BEGIN`, `IF NOT EXISTS`, `SECURITY DEFINER SET search_path = ''`, `REVOKE … FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE … TO service_role`, `COMMIT`); never edit an applied file; one `supabase/tests/NNN-*.test.sql` in a rolled-back transaction with `ASSERT`; `known-failures.txt` may only shrink; the `isRpcMissing` fallback when an RPC gains a `_v2`; the NEEDED entry wording ("the code in production keeps working with it applied; the new code needs it", `[owner:me] [kind:deploy]`); the `docs/product-architecture.md` line | `npm run test:sql` (empty Postgres via the documented Docker image and `DATABASE_URL`), `test:fallbacks`, `typecheck:api`, `test:launch` |
| 2 | `ci-parity-and-pr` | Reproduce the `verify` job locally, then merge through a pull request. Use before any push to a branch that will be merged. | the full `verify` sequence with its environment (`VITE_PRODUCT`, `VITE_LOCK_SUBJECT`, the placeholder Supabase values from `docs/quality/bundle-budget.json`, `CHROME_BIN`); a `--fast` subset for iteration; the PR rule from CLAUDE.md with the attribution lines; branch deletion; the `release-acceptance.md` entry shape (PR, merge SHA, run id, timings, deployment id, explicit non-claims) | the sequence itself |
| 3 | `learn-question-authoring` | Add or edit Learn questions without silently withholding them. | the `Seed` shape in `lib/roadmap-build.ts`; eight questions a level; id prefixes and stability (never renumber); snippet declaration; `lib/roadmap-questions-restored.ts` for depleted levels; the ledger row shape and the two gates (relevance ≥ 4/10, quality ≥ 3/5); the hash-invalidation gotcha; `docs/question-sources.md` licensing | `build:curation-registry`, `test:launch`, `test:grading-integrity`, `audit:devshark-content` |
| 4 | `coding-task-authoring` | Add a coding task with a server-only solution, hidden tests, the free list and the index. | `CodingTaskSource` fields; bodies carry no solutions, `lib/coding/solutions/` is server-only; `build:coding-index` must be fresh; `FREE_CODING_TASK_IDS` and the 16–22 % share; the curation row; the complexity target sentence `lib/coding/complexity.ts` parses; evolving stage ids and `freeStageCount`; one task per Learn level for JS, TS and React | `build:coding-index`, `test:coding`, `test:coding-auth`, `test:harness` (client build plus `CHROME_BIN`), `test:react-engine` for React, `test:launch` |
| 5 | `learning-path-module-authoring` | Author an FDE module and its solution file. | one file per module under `lib/learning-paths/content/fde/`, the matching `solutions/` file, `activityIdPrefix`, the four activity kinds and the section kinds of a lesson, `reviewedOn` within 400 days, requirements and the acyclic rule, criteria grouping for security-critical checks, `PATHS_ONLY` and `PATHS_SKIP_RUN` for local iteration, the inventory counts `docs/interactive-content-manifest.md` enforces | `test:paths`, `test:path-authority`, `test:launch` |
| 6 | `api-operation` | Add an operation inside the twelve-handler budget. | `resource=` and `op=` dispatch per handler; `lib/http.ts` helpers (`withRequestContext`, `jsonError`, `jsonPremiumRequired`, `requestMemo`, `withTimeout`, `isRpcMissing`); `lib/auth.ts` and `lib/rate-limit.ts` with the `RATE_LIMITS` entry; `lib/access.ts` `refuseLocked`; the launch-contract block a new op needs; the CSP hosts in `scripts/check-security.mjs` | `typecheck:api`, `test:launch`, `check:security`, `test:performance` |
| 7 | `route-and-chunk` | Add a route or page with its lazy chunk, fixtures and public checks. | `lazyPage`, `lazyShellPart`, `routeChunk`, `ShellPartBoundary`; the sitemap count in `scripts/check-public.mjs`; the fixtures `check:responsive` needs; `tests/browser/fake-session.ts`; `vercel.json` header and rewrite placement (`scripts/vercel-routing-contract.ts`); the bundle budget and the route-local dictionary pattern (`translations.privacy.ts`, `translations.paths.ts`) | `build`, `check:public`, `check:bundle`, `check:responsive -- --routes`, `test:browser -- <spec>` |
| 8 | `premium-gating` | Gate new content through `tiers.ts` and the 402 path. | `GatedContent`, `contentTier`, `isOpenTo`; the server rules in `lib/access.ts` (guest is free, free content costs no query, cleared content stays open); the client mirror (`locks.ts`, `UpgradeSheet`, `api.ts`); the billing SQL tests | `test:billing`, `test:launch` |
| 9 | `github-issue-authoring` | Write epics and issues the way #128–#148 did. | the issue template (scope, affected files, blockers, acceptance checklist, verification plan); the blocker table; labels and priority used by the design audits; the closeout table; "a merged planning PR must not close implementation issues" | none beyond read-back of the created issues |
| 10 | `shark-learning-content-map` | Snapshot the Learn and learning-path content model in one command. | the registries that own topics, plan stages, tiers and paths; a bundled script printing level counts, path inventories and readiness (the one this session wrote by hand); the invariants (paths reference registries, never join them) | the script |

Skill 8 can live as a reference file shared by 3, 4 and 5 if a separate skill feels heavy; the rule set is small and every content skill depends on it.

## 4. Proposed agents and commands

| Kind | Name | Purpose | Tools |
|---|---|---|---|
| Agent | `content-curator` | Edit questions and tasks, write ledger rows, regenerate the registry and the index, run the content suites. Justified by the ten `codex/content-audit-b*` pull requests that did this by hand. | Read, Grep, Glob, Bash, Edit, Write; skills 3, 4, 8 |
| Agent | `migration-reviewer` | Read-only review of a migration: RLS, grants, `search_path`, idempotency, fallback coverage, the NEEDED deploy note. | Read, Grep, Bash; skill 1 and `supabase-postgres-best-practices` |
| Agent | `path-content-author` | Author one learning-path module with its solution file and run `test:paths`; used for the eleven content issues of the FDE flagship. | Read, Grep, Glob, Bash, Edit, Write; skills 5, 8 |
| Command | `/new-migration <purpose>` | Next number, template, test stub, NEEDED entry | skill 1 |
| Command | `/ci-parity [--fast]` | Run the `verify` sequence locally with the CI environment | skill 2 |
| Command | `/pr-merge` | Push, open the PR with the attribution lines, wait for `verify` and `sql`, merge, delete the branch, append the acceptance entry | skill 2 |
| Command | `/write-issue <epic>` | Scaffold an issue in the agreed template | skill 9 |
| Command | `/add-api-op <handler> <op>` | Dispatch stub, rate limit entry, launch-contract block | skill 6 |
| Command | `/content-snapshot` | Print the Learn and path inventory | skill 10 |

## 5. Fixes to stale skills and docs

1. `shark-release-validation` and `commands/release-validate.md`: list the full `verify` sequence and its environment, or point at skill 2.
2. `session-end/SKILL.md`: replace "push and merge to `main`" with the PR rule.
3. `README.md` line 5 says Premium costs 3.99 EUR a month or 39.99 EUR a year, VAT included; `shared/tiers.ts` says 4.99 and 59.88 before VAT, as do NEEDED.md and `docs/product-architecture.md`.
4. `lib/roadmap-build.ts` header still describes the old shape ("100× per topic") beside the current eight-per-level comment.
5. `client/src/i18n/translations.ts` header describes a second dictionary the compiler enforces; epic D removes the dictionary and the sentence.
6. `lib/learning-paths/validate.ts` and `lib/question-quality.ts` carry parity checks for a second language; epic D removes them.
7. `docs/learning-paths-plan.md` is marked historical; its issue titles predate the English-only decision.
8. `docs/quality/README.md` describes a Storybook language toolbar; epic D removes it.

## 6. Work packages (Epic C, after approval)

| Id | Work package | Blocked by |
|---|---|---|
| C1 | `ci-parity-and-pr` skill, `/ci-parity` and `/pr-merge` commands; fix `shark-release-validation` and `session-end` | none |
| C2 | `supabase-migration` skill, `/new-migration` command, `migration-reviewer` agent | none |
| C3 | `learn-question-authoring` and `coding-task-authoring` skills, `premium-gating` reference, `content-curator` agent | none |
| C4 | `learning-path-module-authoring` skill and `path-content-author` agent | D2 of the flagship plan |
| C5 | `api-operation` and `route-and-chunk` skills, `/add-api-op` command | none |
| C6 | `github-issue-authoring` skill, `/write-issue` command; `shark-learning-content-map` skill with `/content-snapshot` | none |
| C7 | Stale-doc fixes 3–8 above, plus `AGENTS.md` and CLAUDE.md pointers to the new skills | C1–C6 |

Issue numbers (created 21 October 2026): epic #483; C1 #511, C2 #512, C3 #513, C4 #514, C5 #515, C6 #516, C7 #517.

C1 and C4 pay back first: C1 because every issue in Epics A and B ends in a `verify` run, C4 because eleven content issues follow it.
