# StudyShark + devShark — cost & scaling

A Vite React SPA plus Vercel functions and Supabase. The stack is in `about-project.md`; prices checked 2026-07-21.

## What it costs

- **Private / pilot:** ~$0/month (Vercel Hobby, Supabase Free, Upstash free tier).
- **Public / commercial baseline:** ~$45/month (Vercel Pro $20 + Supabase Pro $25); AI and Sentry/PostHog extra if enabled.
- **AI, if enabled (optional):** post-answer explanations and pre-answer Sharkira hints share ONE daily generation budget (`AI_DAILY_GENERATION_LIMIT`) and a per-key cache, so enabling both does not double the ceiling. At a 25/day cap the combined line is ~$3–8/month before cache hits, and $0 while the flags are off.
- **Daily-habit layer (migration 024):** spaced mastery, the Today queue, forgiving streaks, badges, Shark Cards, the advisor, and the typing racer add **no new serverless functions** (all new endpoints ride inside the existing twelve handlers) and only small, mostly per-user tables — they do not change the baseline.
- **Coding section (migration 025, devShark):** grading runs inside the existing roadmap handler in a QuickJS WebAssembly sandbox with a 2.5 s deadline and a 64 MB ceiling, so one submission is one short serverless invocation; the TypeScript compiler loads once per warm instance. Submissions are rate limited per IP (30 per 10 minutes). The GitHub garden makes one to three GitHub API calls per passed task, queues failures, and retries them on a manual sync; it needs no extra service. Neither changes the baseline.

## When to scale

- Supabase Realtime connections/messages and DB compute are the first ceilings → raise compute or add retention/partitioning under sustained load, not by user count.
- Add Upstash / Sentry / PostHog paid tiers only when free quotas are exceeded.

## Keep costs down

Set budget alerts on Vercel and Supabase, keep AI explanations and Sharkira hints behind the shared daily limit, and enable Sentry/PostHog only if wanted.
