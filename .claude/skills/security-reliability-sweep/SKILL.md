---
name: security-reliability-sweep
description: Run a focused security + reliability sweep of the quiz app and produce a single prioritized report. Use when the user asks to "make it more secure", "harden the app", "make it more reliable", "production-readiness check", or similar. Lighter than full-app-audit — only the two lenses.
---

# Security + reliability sweep

Goal: surface every way the app can be exploited or fail in production, ranked by severity.

## Steps

1. **Spawn two auditors in parallel** (single message, two `Agent` tool calls):

   - `security-auditor` — "Full security audit. Pay special attention to: RLS policies in `supabase-schema.sql` currently use `USING (true)`; whether `api/` handlers verify Auth0 JWTs server-side or trust client-supplied `auth0_id`; client-trusted score/streak in `api/quiz/submit.ts`; secret leakage; npm audit."
   - `reliability-auditor` — "Full reliability audit. Pay special attention to: counter races on `total_quizzes`/`current_streak`; mid-quiz refresh/network drop UX; absence of React error boundaries; idempotency of submit; observability gaps; two-stack drift between `server/` and `api/`."

2. **Merge into one report:**

   ```
   # Security + Reliability Sweep — <date>

   ## TL;DR
   <3 bullets max>

   ## P0 — Fix before next deploy
   1. <finding> — file:line — fix — lens

   ## P1 — Fix this sprint
   ...

   ## P2 — Hardening backlog
   ...

   ## Quick wins (<30 min each)
   - ...
   ```

3. **For each P0**, include a 1–2 line "exploit / failure scenario" so the user understands the stakes.

4. **Confirm before fixing.** Ask the user which items to implement. Do not auto-edit.

## Notes

- Read-only sweep. No edits.
- Run `npm audit --omit=dev` in root, `client/`, `server/` and include CVE summary in the report.
- If you find a P0 that is trivially exploitable (e.g. anyone can overwrite anyone's stats), call it out at the top of TL;DR in bold.
