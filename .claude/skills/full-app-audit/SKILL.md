---
name: full-app-audit
description: Run a full audit of the quiz app across UX, accessibility, performance, scalability, security, and reliability. Spawns specialized auditor agents in parallel and produces a single consolidated, prioritized report. Use when the user asks for "audit the app", "find improvements", "what should we fix", or any holistic review.
---

# Full app audit

Goal: produce one prioritized punch-list covering UX, a11y, performance, scalability, security, reliability.

## Steps

1. **Confirm scope** with the user only if they were vague. Default scope = whole app. Otherwise skip straight to step 2.

2. **Spawn all six auditor agents in parallel** (single message, six `Agent` tool calls). Each gets a self-contained prompt — they do not share context.

   - `ux-reviewer` — "Audit UX of all components in `client/src/components/`. Cover loading/empty/error states, mobile, MUI consistency, microcopy."
   - `accessibility-auditor` — "Audit WCAG 2.1 AA across all components and routes. Cover semantic HTML, ARIA, keyboard, focus, contrast, SPA route changes."
   - `performance-optimizer` — "Audit frontend perf — bundle, code splitting (Quiz/Profile lazy), `react-syntax-highlighter` weight, Vite manualChunks, render perf in Quiz.tsx."
   - `scalability-auditor` — "Audit `api/`, `server/`, `supabase-schema.sql`. Cover cold starts, indexes, RLS-as-scan-risk, counter races, caching, rate limits, two-stack drift."
   - `security-auditor` — "Audit Auth0/Supabase auth flow, RLS policies (currently `USING (true)`), API input validation, client-supplied trust, secrets, CORS, headers, deps."
   - `reliability-auditor` — "Audit failure modes — Supabase/Auth0 down, mid-quiz network drop, refresh, concurrent tabs, error boundaries, observability, idempotency."

3. **Consolidate the six reports** into one document. Deduplicate findings that show up in multiple lenses (e.g. RLS `USING (true)` is both security and scalability — list once under security, cross-ref scalability).

4. **Re-rank globally** using this rubric:

   - **P0 — Critical:** exploitable security holes, data corruption, total outage modes, broken core flow.
   - **P1 — High:** WCAG-A failures, unhandled errors users hit weekly, perf regressions >100KB or >200ms LCP, scalability cliff before next 10x.
   - **P2 — Medium:** WCAG-AA, polish on common flows, medium perf wins, hardening.
   - **P3 — Low:** nice-to-haves, micro-optimizations.

5. **Output a single report** in this shape:

   ```
   # App Audit — <date>

   ## Executive summary
   <3–5 bullets: top themes>

   ## P0 — Critical (fix this week)
   1. <finding> — <file:line> — <fix in one line> — <lens: security/perf/...>

   ## P1 — High
   ...

   ## P2 — Medium
   ...

   ## P3 — Low
   ...

   ## Strengths worth preserving
   - ...

   ## Suggested next actions
   - 1–3 concrete tickets the user could open right now
   ```

6. **Offer follow-up.** Ask the user which P0/P1 items they want to tackle first. Do not start implementing without confirmation.

## Notes

- This skill is read-only. No file edits during the audit itself.
- If `npm audit` or `npm run build` would help an agent (perf, security), let them run it — they have Bash access.
- Keep the final report under ~400 lines. Push detail into per-finding fix descriptions, not prose.
