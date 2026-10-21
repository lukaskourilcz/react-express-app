---
name: ci-parity-and-pr
description: Reproduce the `verify` CI job locally with `npm run ci:parity`, then merge through a pull request with `verify` and `sql` green, delete the branch and record the release. Use before any push to a branch that will be merged, and to write the PR body and the `docs/release-acceptance.md` entry.
---

# CI parity and pull requests

`main` is protected: GitHub merges a pull request only when the `verify` and `sql` jobs of `.github/workflows/quality.yml` pass, for admins too, and refuses force-pushes (CLAUDE.md, "Git workflow"). `verify` runs 53 steps and takes about 30 minutes, so every step you skip locally risks another 30-minute cycle. PR #401 failed `check:bundle` by 182 gzip bytes after passing the six commands `shark-release-validation` used to list (`docs/release-acceptance.md`, "15 October — PR #401 initial-load correction").

`scripts/ci-parity.mjs` runs the same steps in the same order with the same environment and prints each step's real result. Before it runs anything it reads `quality.yml` and compares the job's `npm` and `npx playwright` commands with its own plan. If you change the workflow without changing the plan, it exits 2 and names the first difference. Update `PLAN` in the script and the table below together.

## The `verify` sequence

The order and the commands come from the `verify` job in `.github/workflows/quality.yml`. `ci:parity` step ids are in the first column.

| # | Step id | Command | Notes |
|---|---|---|---|
| 1 | `install` | `npm ci && npm ci --prefix client` | Runs locally when `node_modules` or `client/node_modules` is missing, or with `--install`. |
| 2 | `check:quickjs-build` | `npm run check:quickjs-build` | CI skips it when `lib/coding/vendor`, `lib/coding/quickjs-variant.ts`, `scripts/rebuild-quickjs-sort.mjs`, `package.json`, `package-lock.json` and `client/package-lock.json` match the PR base; the script compares against `git merge-base HEAD origin/main` the same way. Rebuilding needs emsdk (`SHARK_EMSDK_DIR`). |
| 3-5 | `typecheck:api`, `typecheck:scripts`, `typecheck:tooling` | `npm run typecheck:api && npm run typecheck:scripts && npm run typecheck:tooling --prefix client` | `typecheck:tooling` lives in `client/package.json`. |
| 6 | `audit:native-reviews` | `npm run audit:native-reviews` | |
| 7-19 | `test:performance` to `test:client` | `test:performance`, `test:launch`, `test:coding-auth`, `test:grading-integrity`, `test:path-authority`, `test:react-authority`, `test:coding`, `test:paths`, `test:billing`, `test:fallbacks`, `test:garden`, `test:live-grading`, `test:client` | One chained CI step: the first failure stops the rest in CI. |
| 20-21 | `check:unused`, `check:security` | `npm run check:unused && npm run check:security` | |
| 22-24 | `build`, `check:public`, `check:bundle` | `npm run build && npm run check:public && npm run check:bundle` | Build env below. The browser steps test this build. |
| 25-26 | `audit:prod`, `audit:client` | `npm audit --omit=dev && npm audit --omit=dev --prefix client` | |
| 27 | `chromium` | `npx playwright install --with-deps chromium` | Locally the script installs Chromium only when `CHROME_BIN` and Playwright's own browser are both missing. |
| 28 | `preview` | `npm run preview --prefix client -- --host 0.0.0.0 --port 4173` | Started in the background, then polled like `scripts/wait-for-preview.mjs`. Port 4173 must be free: an old preview would serve an old build. |
| 29-46 | `browser:<spec>` | `npm run test:browser -- tests/browser/<spec>.spec.ts` | 18 runs in workflow order, from `public` to `launch-offer`; `guide-startup` and `profile-leaderboard-preferences` share one run. |
| 47 | `check:responsive` | `npm run check:responsive -- --routes /,/quiz,/topics/javascript-closures,/cs/topics/javascript-closures,/daily,/not-found-responsive-check --widths 360,390,430,768,1024,1280,1440` | `TOPIC` comes from the workflow. Epic D removes the `/cs/` route from this list. |
| 48 | `check:responsive:dark` | `RESPONSIVE_THEME=dark npm run check:responsive -- --routes /,/topics/javascript-closures,/daily --widths 390,768,1280` | |
| 49 | `test:harness` | `npm run test:harness` | Needs the client build and Chromium. |
| 50-53 | `audit:performance`, `build:storybook`, `storybook`, `browser:storybook` | `npm run audit:performance`, `npm run build:storybook`, `npm run storybook --prefix client -- --ci` on port 6006, then `STORYBOOK_URL=http://localhost:6006 npm run test:browser -- tests/browser/storybook.spec.ts` | CI runs this step when the build step passed, even after a browser failure. |

The `sql` job runs separately: `npm run test:sql` on `supabase/postgres:17.6.1.171` (`scripts/test-sql.mjs`).

### Environment

- **Node 24.** CI uses Node 24; `package.json` accepts 22 to 24. The script warns on any other major version. On a machine with a newer Node, install `node@24` from npm into a scratch folder and put its `bin` first on `PATH`.
- **`CI=true`**, as GitHub Actions sets it.
- **Build env** for `build`, `check:public` and `check:bundle`: `VITE_PRODUCT=devshark`, `VITE_LOCK_SUBJECT=webdev`, and `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `measuredBuild.env` in `docs/quality/bundle-budget.json`. `check:bundle` measures against that placeholder project, and `tests/browser/lazy-auth.spec.ts` signs in through it.
- **`CHROME_BIN`.** CI exports Playwright's Chromium path before `check:responsive`. In the Claude Code cloud sandbox that browser is `/opt/pw-browsers/chromium`; elsewhere the script takes Playwright's `chromium.executablePath()`. An explicit `CHROME_BIN` wins. `playwright.config.ts`, `scripts/check-responsive.mjs`, `scripts/test-responsive-clearance.mjs` and `scripts/test-harness.ts` all read it.
- **Ports** 4173 (preview) and 6006 (Storybook) must be free. The script refuses to start when either already answers.
- **`DATABASE_URL`** for the `sql` job only. It must point at an empty Postgres; `scripts/test-sql.mjs` refuses a database that already has tables in `public`:

  ```sh
  docker run -d --name devshark-sql -p 54339:5432 -e POSTGRES_PASSWORD=postgres supabase/postgres:17.6.1.171
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54339/postgres npm run ci:parity -- --sql --only test:sql
  docker rm -f devshark-sql
  ```

  Ask before you start a Docker VM on the owner's machine. Without one, the CI `sql` job is the evidence: say so and do not report `test:sql` as run. `supabase/tests/known-failures.txt` may only shrink.

## Running it

```sh
npm run ci:parity -- --list               # the plan, nothing runs
npm run ci:parity -- --fast               # steps 1-28 and 47-48
npm run ci:parity                         # the whole verify job
npm run ci:parity -- --only test:launch,build
npm run ci:parity -- --fast --bail        # stop at the first failure, as CI does
npm run ci:parity -- --sql                # add the sql job (DATABASE_URL set)
```

`--fast` skips the 18 browser specs, `test:harness` and the Storybook and performance step. It still builds, starts the preview and runs both `check:responsive` sweeps. Run `--fast` while you iterate and before every push. Run the full job before you mark a pull request ready when the branch touches the client, routes, `vercel.json`, Storybook stories or anything a browser spec covers.

Without `--bail` the script keeps going after a failure and marks the steps that need a failed step (the browser steps need `build`, `preview` and `chromium`) as not run. Each step writes `artifacts/ci-parity/<step>.log`, and the run writes `artifacts/ci-parity/summary.json` with the head SHA, a dirty-tree flag, the Node version, minutes, and each step's result (`pass`, `fail`, `skipped` with the reason, `not-run` with the reason). `artifacts/` is git-ignored. The script tests the working tree, but CI sees only committed files, so commit before the run you quote.

Report results the way the summary gives them. A skipped or not-run step is neither passing nor failing. Name it and give the reason.

## Branch, commits and pull request

1. **One branch per issue**, from a fresh `main`: `git switch main && git pull --ff-only && git switch -c claude/<issue-id>-<slug>`, for example `claude/a1-learn-sections-registry`. Do not stack a branch on another unmerged branch. When a blocker merges, rebase: `git fetch origin && git rebase origin/main`, then `git push --force-with-lease` (your feature branch only; `main` refuses force-pushes).
2. **Small, coherent commits** that name the issue (`feat(learn): add the section registry (#487)`). End each message with the `Co-Authored-By:` trailer the session's instructions give. Prose follows `.claude/skills/stop-slop`.
3. **Run `npm run ci:parity -- --fast`** (or the full job, as above) on the committed head, plus anything the issue's verification plan names.
4. **Push and open the pull request** with `gh pr create --base main --head <branch> --title "<issue title>" --body-file <file>`. The body:

   ```markdown
   <One paragraph: what changes for a learner or a maintainer, and what does not.>

   ## Changes
   - <file or area>: <what and why>

   ## Validation
   Local, Node <version>, `npm run ci:parity -- --fast` at <short sha>: <N> passed, <N> skipped (<reasons>), <N> not run (<reasons>).
   Issue checks: <command>: <real result with counts>.
   Not run: <check> (<why>).

   ## Notes
   <Where the issue and the plan disagree, the plan's section 10 wins: say which line and that the issue was updated. Owner items added to NEEDED.md.>

   Closes #<issue>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```

   End the body with the attribution line the session's instructions give. A planning or documentation PR that only references implementation issues uses `Refs #N`, never `Closes`.
5. **Wait for the required checks**: `gh pr checks <pr> --watch --required`. Run it in the background and move on. When a check fails, read its log with `gh run view <run-id> --log-failed`, fix the cause on the branch, push, and wait again. Never merge around a red check.
6. **Merge** with a merge commit and delete the remote branch: `gh pr merge <pr> --merge --delete-branch`. The repository merges with merge commits ("Merge pull request #518 from …").
7. **Clean up locally**: `git switch main && git pull --ff-only && git branch -d <branch>`, and `git worktree remove <path>` for a worktree you created. Leave no stale branch behind.

Migrations change this order: they go to production before the code merges (`docs/launch-runbook.md`, "Database rollout"). See the `supabase-migration` skill once C2 lands.

## After the merge

Vercel deploys `main` to production. For a change that alters production behaviour:

1. Find the production deployment of the merge SHA and wait until it is READY (Vercel MCP `list_deployments`/`get_deployment`, or the commit's deployment status with `gh api repos/lukaskourilcz/react-express-app/commits/<sha>/status`).
2. Run the smoke checks the change needs from `docs/launch-runbook.md` ("Preview smoke test", "Release and observation") against devshark.app, read-only and as a guest unless the owner approved a fixture. Create no accounts, scores, orders or messages on production without approval.
3. Add the acceptance entry (below), tick the finished `NEEDED.md` items and add new `[owner:me]` ones. If the merge is already done, commit these on the next issue's branch.

## The `docs/release-acceptance.md` entry

Newest first, directly under `# Release acceptance matrix`. The recent entries share one shape:

```markdown
## <What shipped> (#<issue>) — <YYYY-MM-DD>

<What changed, in behaviour terms, and what stayed the same: handlers, rewards,
access, schema.>

<Local evidence with counts: which suites, how many tests or files, the bundle
figure against its budget, both audits with their vulnerability count, the
responsive matrix actually run.>

PR #<n> merged at <merge sha>. Frozen head <head sha> passed required run
<run id>: verify <m>m<s>s, SQL <s>s. READY production <dpl_…> matches the merge
SHA and serves devshark.app; <which smoke checks passed against it>.

<Non-claims: what this evidence does not establish, for example authenticated
production acceptance, physical devices, independent review or production
data. Anything still open and where it is tracked.>
```

Write each figure from a run you made in this session. When a step could not run, say which and why. Record a failed run before the passing one, with what fixed it, as the PR #401 entry does.

## Validation of this skill

`npm run ci:parity -- --list` exits 0 only while the plan matches `quality.yml`. `npm run ci:parity -- --fast` on a clean checkout installs, runs and reports each step.
