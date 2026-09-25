# devShark — cost & scaling

A Vite React SPA plus Vercel functions and Supabase. The stack is in `about-project.md`; hosting prices checked 2026-07-21, Stripe and Spreadshop figures 2026-09-25 (`SECOND-HANDOFF-25-9-2026.md`, sections 1 and 8).

## What it costs

- **Private / pilot:** ~$0/month (Vercel Hobby, Supabase Free, Upstash free tier).
- **Public / commercial baseline:** ~$45/month (Vercel Pro $20 + Supabase Pro $25); Sentry/PostHog extra if enabled.
- **Daily-habit layer (migration 024):** spaced mastery, the Today queue, forgiving streaks, badges, Shark Cards, the advisor, and the typing racer add **no new serverless functions** (all new endpoints ride inside the existing twelve handlers) and only small, mostly per-user tables — they do not change the baseline.
- **Coding section (migration 025, devShark):** grading runs inside the existing roadmap handler in a QuickJS WebAssembly sandbox with a 2.5 s deadline and a 64 MB ceiling, so one submission is one short serverless invocation; the TypeScript compiler loads once per warm instance. React submissions instead run in a fresh, network-denied Vercel Sandbox microVM each (a 10-second command inside a 25-second VM expiry; the roadmap function may run 45 seconds), which draws on the project's Sandbox allowance, so React grading volume is the one coding cost that grows with use. Submissions are rate limited per IP (30 per 10 minutes). The GitHub garden makes one to three GitHub API calls per passed task, queues failures, and retries them on a manual sync; it needs no extra service. QuickJS and the garden do not change the baseline; watch Sandbox usage once React submissions are frequent.
- **Stripe fees (Premium, #221):** no monthly fee; each charge pays its own. Under Managed Payments you keep about 2.72–2.80 EUR of a 3.99 EUR charge, with Stripe remitting the VAT. Fixed fees take 7–11 % of a monthly charge and less than half that share of the 39.99 annual one. Plain Stripe with Stripe Tax costs about 9.5–11.5 % and leaves the VAT to you.
- **Merchandise per redemption (Spreadshop, #229):** no platform fee. Each coin redemption costs you Spreadshop's base price plus shipping, which shows only at checkout: t-shirt 17.49 (premium 20.99), hoodie 29.99 (31.99), mug 13.49, sticker 2.49 or 1.99 (EU, September 2026). A finished FDE or DSA path's package (t-shirt, mug, sticker set) is about 34 plus shipping. The monthly caps in `/dev` → Merchandise bound the spend.

## When to scale

- Supabase Realtime connections/messages and DB compute are the first ceilings → raise compute or add retention/partitioning under sustained load, not by user count.
- Add Upstash / Sentry / PostHog paid tiers only when free quotas are exceeded.
- Raise a merchandise cap only while a month's redemptions cost less than that month's Premium net.

## Keep costs down

Set budget alerts on Vercel and Supabase, enable Sentry/PostHog only if wanted, and keep the merchandise caps low until the Premium net covers them.
