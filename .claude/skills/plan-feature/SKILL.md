---
name: plan-feature
description: Plan a new quiz-app feature end-to-end (Supabase schema → Vercel API → Express dev server → React/MUI client) consistent with existing patterns. Use when the user asks to "add X", "design X", or "plan X" where X is a feature like leaderboard, daily challenge, achievements, share-results, categories, etc.
---

# Plan a feature

## Steps

1. **Capture the request.** Restate the feature in one sentence and list 3 explicit non-goals. If ambiguous, ask one clarifying question via `AskUserQuestion` — no more.

2. **Delegate the plan** to the `quiz-feature-architect` agent. Pass the restated feature, non-goals, and any user constraints. The agent will return a layered plan covering schema, API, dev server, types, components, routing, rollout, risks.

3. **Review the returned plan.** Sanity check:
   - Does it match existing patterns (compare to user-stats flow: `supabase-schema.sql` → `api/user/stats.ts` → `Profile.tsx`)?
   - Does it touch both `api/` (prod) and `server/src/routes/` (dev mirror)?
   - Does it propose real RLS or rely on the existing `USING (true)` policies (which is a known gap)?
   - Migration order safe?

4. **Present the plan to the user** with one explicit recommendation: ship as-is, ship behind a flag, or split into phases. Ask them to confirm before any code is written.

## Notes

- Planning only. Do not write code in this skill — `plan-feature` ends with user approval.
- If the user already approved a plan, exit this skill and start implementing in the main thread.
