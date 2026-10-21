---
name: session-end
description: Before ending a session, update NEEDED.md with owner-needed items and finished tasks, keeping the shared marker format.
---

# session-end

Run before **ending** an agentic session on this repo.

1. Update `NEEDED.md`: tick off (`- [x]`) anything finished this session, and add
   any newly-discovered items that need the **owner** as `[owner:me]` tasks.
2. Keep every task's markers intact and in the shared format (below). Give new
   tasks an `[imp:N]`, `[owner:…]`, `[time:…]`, and `[kind:…]`.
3. If the stack, cost, or monetization picture changed, note it in
   `about-project.md`, `scaling.md`, or `monetization.md`.
4. For anything that changed production behaviour, add the entry to
   `docs/release-acceptance.md` in the shape `.claude/skills/ci-parity-and-pr/SKILL.md`
   gives, with results you actually saw. Write it after the merge and the READY
   production deployment, and commit it with the `NEEDED.md` updates on a short
   branch with its own pull request (the skill's "After the merge"). Work that
   is not merged yet gets the local-evidence form of the entry.

## NEEDED.md marker format (shared across all repos)

`- [ ] **Title** — desc. [imp:1-5] [owner:me|ai] [time:30m] [kind:K]`
`[kind:K]` ∈ `setup` `deploy` `legal` `content` `decision`.

## Git workflow (every session)

- **Commit frequently** in small, coherent steps — never batch a whole session into one commit.
- **At the end of every session, merge to `main` through a pull request** so the change redeploys (this project auto-deploys from `main` on Vercel). `main` is protected: a merge needs the `verify` and `sql` CI jobs green, for admins too, and force-pushes are refused. Run `npm run ci:parity`, push the branch, open the PR, wait for both checks, then merge (`/pr-merge`, `.claude/skills/ci-parity-and-pr/SKILL.md`).
- **Delete the merged / old branch** (local and remote) after merging, to keep the repo clean. Never leave stale branches behind.
