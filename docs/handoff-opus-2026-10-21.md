# Handoff: implement the Learn sections, the FDE flagship, DSA into Learn, English only, and the agent workflow skills

Paste everything below this line into a fresh Claude Code session on `lukaskourilcz/react-express-app`. The session has no memory of the planning conversation; the documents and issues it names carry everything it needs.

---

You are implementing an approved plan on the devShark repository (`lukaskourilcz/react-express-app`). Read `CLAUDE.md` first and follow it; it names the product rules, the validation scripts and the Git workflow. Then read, in this order:

1. `docs/learn-sections-fde-flagship-plan.md` — the approved design: three Learn sections (Web Developer, Software Engineer, Forward Deployed Engineer), the FDE path rewritten as the Premium flagship, DSA Foundations folded into Learn as two topics, and the English-only decision. Section 10 records the owner's decisions; section 9 lists the work packages; sections 12 and 13 hold the DSA and English-only designs.
2. `docs/agent-workflow-audit.md` — the skills, agents and commands to add, and the stale references to fix.
3. `docs/product-architecture.md` (the "Learning paths", "Tiers and billing" and "Learning and Challenge updates" sections), `docs/fde-curriculum.md`, `docs/fde-implementation-plan.md`, `docs/dsa-foundations-plan.md` (superseded as a path plan; still the content reference).

The backlog is five GitHub epics with 34 child issues. Work them in this order, one branch and one pull request per issue unless an issue says it may be batched:

| Order | Issue | Why here |
|---|---|---|
| 1 | C1 #511 | The CI parity skill: every later issue ends in a `verify` run, and the skill tells you what `verify` runs. |
| 2 | D1 #484 | English-only rules and documents, before anything else is written. |
| 3 | A1 #487 | Section registry and plan membership (pure, no UI). |
| 4 | D2 #485 | Delete the second-language code, the language switch, the `lang` parameter and the parity checks. |
| 5 | C2 #512, C3 #513, C5 #515, C6 #516 | Skills you will use from here on; C4 #514 right after D2. |
| 6 | A2 #488 → A3 #489, A4 #490 → A5 #491 | The Learn page, routes, picker, docs. |
| 7 | D3 #486 | Public second-language pages and sitemap. |
| 8 | E1 #492, E2 #493 → E3 #494 → E4 #495 → E5 #496 | DSA into Learn. |
| 9 | B1 #497 → B3–B8 (#499–#504) and B10 #506 in parallel → B9 #505 → B11 #507 | FDE content. |
| 10 | B2 #498 (after A3 and B1), B12 #508 (after A3), B13 #509 (after A5 and B2) | FDE hub, taster, copy. |
| 11 | B14 #510, then C7 #517 | Release verification and the last pointers. |

Epics: D #479, A #480, E #481, B #482, C #483. Each child issue carries scope, affected files, blockers, an acceptance checklist and a verification plan. Treat the acceptance checklist as the definition of done and the verification plan as the minimum you run before pushing; report real results only.

Rules that hold throughout:

- English only, for good. Write no second language anywhere, and remove it where you meet it.
- Keep exactly twelve physical TypeScript handlers under `api/`. `shared/tiers.ts` is the only place that decides what is free. The server owns answers, grading and scope. No AI feature, no live model, no certification or hiring claim in copy.
- Search before creating: reuse Astryx, `client/src/components/ui/`, the paths components, the landing primitives, hooks, dialogs, toasts, tokens and translation keys. Deep End v2 for every screen; cover loading, empty, error, offline, auth, disabled, success, destructive, expired, long-content and narrow states; keyboard, focus, non-colour status, reduced motion, 44 px targets, light and dark, 360–1440 widths.
- Content quality: sources with `reviewedOn: 2026-10-21`, plausible options with explanations, references that pass and flawed variants that fail, security-critical criteria that cannot be averaged away, artifacts self-reviewed. Prose through `.claude/skills/stop-slop`.
- Validation: `npm run typecheck:api`, `npm run test:launch`, `npm run build`, `npm run check:responsive`, `npm audit --omit=dev`, `npm audit --omit=dev --prefix client`, `git diff --check`, plus what each issue names (`test:paths`, `test:coding`, `test:sql`, `check:public`, `check:bundle`, the browser specs). `npm run test:sql` needs an empty Postgres (see `scripts/test-sql.mjs`); `check:responsive` and the browser specs need `CHROME_BIN=/opt/pw-browsers/chromium`. Never report a check you did not run.
- Git: a branch per issue named `claude/<issue-id>-<slug>` (for example `claude/a1-learn-sections-registry`); small, coherent commits that name the issue; a pull request per issue that closes it (`Closes #487`), with `verify` and `sql` green before merging to protected `main`; delete the branch after the merge. Do not stack unmerged branches; rebase onto `main` when a blocker merges.
- Session routine: at the start, scan `NEEDED.md` for `[owner:ai]` items; at the end, update `NEEDED.md` (finished items ticked, new owner items added in the marker format) and add the acceptance entry to `docs/release-acceptance.md` for anything that changes production behaviour.
- When an issue's text and the plan disagree, the plan's decisions in section 10 win; say so in the pull request and update the issue.
- When something is blocked on the owner (a Vercel variable, a production read, a legal text), write the `[owner:me]` item in `NEEDED.md` and move to the next issue in order; do not wait.

Start with C1 #511. Before writing it, read `.github/workflows/quality.yml` end to end and `docs/release-acceptance.md`'s most recent entries, so the skill states the real `verify` sequence and the real acceptance shape.
