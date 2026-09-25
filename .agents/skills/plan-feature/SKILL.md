---
name: plan-feature
description: Plan a new quiz-app feature end-to-end (Supabase migration → a resource=/op= branch in an existing Vercel handler → React/Astryx client) consistent with existing patterns. Use when the user asks to "add X", "design X", or "plan X" where X is a feature like leaderboard, daily challenge, achievements, share-results, categories, etc.
---

# Plan a feature

## Steps

1. **Capture the request.** Restate the feature in one sentence and list 3 explicit non-goals. If ambiguous, ask one clarifying question via `AskUserQuestion` — no more.

2. **Delegate the plan** to the `quiz-feature-architect` agent. Pass the restated feature, non-goals, and any user constraints. The agent will return a layered plan covering schema, API, types, components, routing, rollout, risks.

3. **Review the returned plan.** Sanity check:
   - Does it match existing patterns (compare to user-stats flow: `supabase/supabase-schema.sql` → `api/user/[op].ts` (`op=stats`) → `client/src/components/Profile.tsx`)?
   - Does it add a `resource=`/`op=` branch to an existing handler instead of a thirteenth file under `api/`?
   - Does every new table have RLS on, owner-scoped SELECT only and service-role-only writes, as in migrations 026-044?
   - Migration order safe?

4. **Present the plan to the user** with one explicit recommendation: ship as-is, ship behind a flag, or split into phases. Ask them to confirm before any code is written.

## Notes

- Planning only. Do not write code in this skill — `plan-feature` ends with user approval.
- If the user already approved a plan, exit this skill and start implementing in the main thread.
