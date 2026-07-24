# StudyShark + devShark — cost & scaling

A Vite React SPA plus Vercel functions and Supabase. The stack is in `about-project.md`; prices checked 2026-07-21.

## What it costs

- **Private / pilot:** ~$0/month (Vercel Hobby, Supabase Free, Upstash free tier).
- **Public / commercial baseline:** ~$45/month (Vercel Pro $20 + Supabase Pro $25); AI and Sentry/PostHog extra if enabled.

## When to scale

- Supabase Realtime connections/messages and DB compute are the first ceilings → raise compute or add retention/partitioning under sustained load, not by user count.
- Add Upstash / Sentry / PostHog paid tiers only when free quotas are exceeded.

## Keep costs down

Set budget alerts on Vercel and Supabase, keep AI explanations behind a daily limit, and enable Sentry/PostHog only if wanted.
