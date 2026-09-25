# devShark — cost & scaling

A Vite React SPA plus Vercel functions and Supabase. The stack is in `about-project.md`; prices checked 2026-07-21.

## What it costs

- **Private / pilot:** ~$0/month (Vercel Hobby, Supabase Free, Upstash free tier).
- **Public / commercial baseline:** ~$45/month (Vercel Pro $20 + Supabase Pro $25); Sentry/PostHog extra if enabled.
- **Daily-habit layer (migration 024):** spaced mastery, the Today queue, forgiving streaks, badges, Shark Cards, the advisor, and the typing racer add **no new serverless functions** (all new endpoints ride inside the existing twelve handlers) and only small, mostly per-user tables — they do not change the baseline.
- **Coding section (migration 025, devShark):** grading runs inside the existing roadmap handler in a QuickJS WebAssembly sandbox with a 2.5 s deadline and a 64 MB ceiling, so one submission is one short serverless invocation; the TypeScript compiler loads once per warm instance. React submissions instead run in a fresh, network-denied Vercel Sandbox microVM each (a 10-second command inside a 25-second VM expiry; the roadmap function may run 45 seconds), which draws on the project's Sandbox allowance, so React grading volume is the one coding cost that grows with use. Submissions are rate limited per IP (30 per 10 minutes). The GitHub garden makes one to three GitHub API calls per passed task, queues failures, and retries them on a manual sync; it needs no extra service. QuickJS and the garden do not change the baseline; watch Sandbox usage once React submissions are frequent.

## When to scale

- Supabase Realtime connections/messages and DB compute are the first ceilings → raise compute or add retention/partitioning under sustained load, not by user count.
- Add Upstash / Sentry / PostHog paid tiers only when free quotas are exceeded.

## Keep costs down

Set budget alerts on Vercel and Supabase, and enable Sentry/PostHog only if wanted.
