# devShark API - Bruno collection

A [Bruno](https://usebruno.com) collection for the 12 Vercel serverless
functions under `api/`. Bruno is a free, offline, Git-friendly API client - the
requests live here as plain-text `.bru` files so they version alongside the
code and diff in review.

## Usage

1. Install Bruno (desktop app or the `bru` CLI).
2. Open this folder as a collection.
3. Pick an environment (`Local` = `vercel dev` on :3000, or `Production`).
4. Run a request, or run a whole folder.

CLI:

```bash
# from the repo root
npx @usebruno/cli run bruno --env Local
```

## What the assertions codify

- **`Public/`** - endpoints that must serve anonymous traffic. Each asserts a
  `200` (or, for `Quiz Submit`, simply *not* `401`, since grading is public but
  needs a real session id).
- **`Auth required (expect 401)/`** - the security-relevant half. Every
  auth-gated endpoint (`flashcards`, `user/*`, `roadmap?resource=progress`,
  `play/*`, `admin/*`) is hit **without** a Bearer token / dev password and
  asserts `res.status: eq 401`. This turns "this endpoint must reject
  unauthenticated callers" from a hope into a runnable check - run it in CI or
  before a deploy to catch an accidentally-unguarded route.

To exercise the authenticated *happy path*, set a `token` var in your
environment (a Supabase access token) and add `auth: bearer` to a copy of the
request - kept out of the committed collection so no real token is stored here.
