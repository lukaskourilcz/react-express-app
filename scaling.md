# devShark — cost & scaling

A Vite React SPA plus twelve Vercel functions (region `arn1`) and one Supabase project (`eu-north-1`). Preview deployments share the production Supabase project. The stack is in `about-project.md`. Hosting prices last checked 21 July 2026.

## What it costs

- **Baseline:** about $45 a month for a public deployment: Vercel Pro $20 (the team is already on Pro; buy no further upgrade) and Supabase Pro $25. Sentry and PostHog stay on their free allowances; keep PostHog free-only.
- **Per request** (measured in the paths audit, #587): a signed-in read asks Supabase Auth at most once a minute per instance and token, so a Learn map mount makes one Auth call instead of five; writes ask every time. A rate-limited request spends one to three Upstash requests (two for an answer, three for a Submit; a free code level from open to completion spends 23). The CDN answers the Learn map, the learning-path catalogue, lessons and a free coding task's brief without running a function. A fresh instance of the user or roadmap function imports in 67 to 100 ms and loads the coding catalogue, graders and TypeScript only for the ops that use them.
- **Daily-habit layer** (spaced mastery, the Today queue, streaks, badges, Shark Cards, the advisor, the typing racer): no extra functions, since every endpoint rides inside the twelve handlers, and small per-user tables. It leaves the baseline unchanged.
- **Coding grading:** JavaScript and TypeScript run in a QuickJS WebAssembly sandbox inside the roadmap function, with a 2.5 s deadline and a 64 MB ceiling, so one submission is one short invocation. The TypeScript compiler loads once per warm instance. React submissions each run in a fresh, network-denied Vercel Sandbox microVM (a 10 s command inside a 25 s VM; the roadmap function may run 45 s). That draws on the project's Sandbox allowance, so React grading is the one coding cost that grows with use. Rate limits bound one caller's Sandbox spend: 30 submissions per 10 minutes on one task, 120 per 10 minutes across tasks per account or guest address, and 960 per 10 minutes per network address (`lib/rate-limit.ts`).
- **GitHub garden:** one to three GitHub API calls per passed task; failures queue and retry on a manual sync. No extra service.
- **Stripe (not live):** no monthly fee. Each charge pays Stripe's processing fee plus the Managed Payments fee, and Stripe remits the VAT. Checkout stays off until the owner opens sales (#221).
- **Merchandise (paused behind `MERCH_ENABLED`):** no platform fee. Each coin redemption would cost Spreadshop's base price plus shipping (EU base prices in September 2026: t-shirt 17.49, hoodie 29.99, mug 13.49, sticker 2.49). The monthly caps in `/dev` → Merchandise bound the spend.

## When to scale

- Supabase Realtime connections and messages and database compute hit their ceilings first. Raise compute, or add retention and partitioning, under sustained load rather than at a user count.
- Move Upstash, Sentry or PostHog to a paid tier only when their free quotas run out. Upstash runs out first: checking both rate-limit windows in one request would halve its count (`NEEDED.md`).
- Watch Vercel Sandbox usage once React submissions become frequent.
- If merchandise returns, raise a cap only while a month's redemptions cost less than that month's Premium income.

## Keep costs down

Set budget alerts on Vercel and Supabase, and keep the merchandise caps low.
