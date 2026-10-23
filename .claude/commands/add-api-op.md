---
description: Scaffold a new operation on an existing API handler, with its dispatch stub, rate-limit entry and launch-contract block, inside the twelve-handler budget.
argument-hint: <handler> <op> [--read|--write] [--own-limit] [--premium]
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

Add operation `$ARGUMENTS` to an existing handler. Follow `.claude/skills/api-operation/SKILL.md` and copy the shapes in `.claude/skills/api-operation/references/contract-block.md`. Never create a file under `api/`.

1. Inspect `git branch --show-current`, `git status --short` and `git diff`. Preserve unrelated work.
2. Resolve `<handler>` to one of the twelve files (`user` is `api/user/[op].ts`, `admin` is `api/admin/[op].ts`, `play` is `api/play/[action].ts`, `roadmap` is `api/quiz/roadmap.ts`, and so on). Run `find api -name '*.ts' | wc -l` and stop if it does not print 12. Refuse a `<handler>` that names no existing file.
3. Read that handler's `routeHandler`, the route-level limit before its dispatch, and one sibling op of the same kind. Confirm `<op>` is new: grep the handler and `client/src/lib/` for it.
4. Grep `scripts/test-launch-contracts.ts` for the handler's path and note every assertion that pins its source text. Your edit must leave those lines byte for byte.
5. Write the dispatch line and an exported `handle<Name>(req, res, db)` stub (template section 1). `--read` makes it GET only; `--write` makes it PUT or POST and lets `limitUserWrite` or the handler's route-level write limit charge it. Verify the caller with `requireAuthSub` or `requireAuthResult`, wrap database calls in `withTimeout`, and answer errors with `jsonError`. A `catch` keeps a timeout as 503 `upstream_timeout` (step 7 of the skill), never a 500.
6. Choose the limit with the skill's "Rate limits" order. With `--own-limit`, add the `<name>` and `<name>Address` pair to `RATE_LIMITS` in `lib/rate-limit.ts` (template section 2) and take it with `enforceClassRateLimit`. Without it, a script-drivable `--read` op on `api/user/[op].ts` joins `LIMITED_READS`, and any other op relies on the route-level limit. State which choice you made and why.
7. With `--premium`, call `refuseLocked` from `lib/access.ts` where the learner starts the content, and add the file to `tierReaders` in `tierContracts()` if it is not there. Refuse `--premium` on a file that grades or ranks (the list in the skill).
8. Write the contract block (template section 3): the placement assertion with the exact dispatch line, the behaviour checks against a stand-in `db`, and the limit check. Register it in `main()`. For an op over one account's rows, add the verified-caller case (template section 4).
9. Leave `vercel.json` alone unless the browser now calls a new origin; then add the exact host to the CSP's `connect-src`, never a wildcard over every origin.
10. Run each command and keep its exact result:

    ```sh
    npm run typecheck:api
    npm run typecheck:scripts
    npm run test:launch
    npm run check:security
    git diff --check
    ```

11. Fix failures your change caused and rerun the failing command, then the commands after it.
12. Report the handler, the dispatch line, the limit choice, the contract block's name and assertions, every file touched, and each command's pass, fail or not-run result. Do not commit unless asked.
