# Stack, current cost, and scaling model

Last reviewed: **21 July 2026**. Vendor prices change; the linked official pricing pages are the source of truth. All projections below are planning estimates, not quotes, and exclude VAT, domain registration, contractor/content costs, refunds, and unusually heavy AI or Realtime usage.

## Vendor pricing used in this model

| Service | Free/current entry point | Paid starting point and meaningful usage prices |
|---|---|---|
| Vercel | Hobby is $0 for personal, non-commercial use; its published limits include 1M function invocations and 4 CPU-hours. | Pro is $20/month per developer and includes $20 usage credit. Usage beyond included allowances is metered; published examples include $2 per million Edge Requests and $0.15/GB transfer. See [Vercel pricing](https://vercel.com/pricing), [Hobby limits](https://vercel.com/docs/plans/hobby), and [Pro plan](https://vercel.com/docs/plans/pro-plan). |
| Supabase | Free includes 50k MAU, 500MB DB, 5GB egress, 1GB storage, 200 peak Realtime connections, and 2M Realtime messages; inactive free projects can pause. | Pro is $25/month and includes $10 compute credit, 100k MAU, 8GB disk, and 250GB egress. Published overages include $0.00325/MAU, $0.125/GB disk, $0.09/GB egress, $2.50/million Realtime messages, and $10 per 1,000 peak connections. Micro compute is $10, Small $15, Medium $60, and Large $110 before the included compute credit. See [Supabase pricing](https://supabase.com/pricing) and [Realtime pricing](https://supabase.com/docs/guides/realtime/pricing). |
| Upstash Redis | Free: 256MB, 500k commands/month, 10GB bandwidth. | Pay-as-you-go: $0.20/100k commands; first 1GB storage and 200GB bandwidth included, then $0.25/GB storage and $0.03/GB bandwidth. Fixed plans start at $10/month. See [Upstash Redis pricing](https://upstash.com/pricing/redis). |
| PostHog | Free: 1M product events/month and 5k session replays/month. | Published overages start around $0.00005 per product event and $0.005 per replay. See [PostHog pricing](https://posthog.com/pricing). |
| Sentry | Developer: $0, one user, 5k errors, 50 replays, one uptime monitor. | Team starts at $26/month billed annually; Business at $80/month billed annually. See [Sentry pricing](https://sentry.io/pricing/). |
| OpenAI API | No app cost while disabled. | Model-dependent. Current published text rates include Luna at $1/M input and $6/M output tokens, Terra at $2.50/$15, and Sol at $5/$30. See [OpenAI model pricing](https://developers.openai.com/api/docs/models). |

## What it costs now

### Private development or non-commercial pilot: approximately $0/month

Vercel Hobby + Supabase Free + Upstash Free, with analytics, replay, Sentry, support, and AI disabled. This is suitable for development and a small personal pilot, not a commercial launch commitment. Free projects can pause and have limited compute/concurrency.

### Public/commercial baseline: approximately $45/month

- Vercel Pro: $20.
- Supabase Pro: $25, including the Micro compute allowance through its compute credit.
- Upstash, PostHog, and Sentry can initially remain inside their free allowances.
- Domain and tax are extra.

That $45 baseline is the sensible operating assumption once the product is commercial or needs non-pausing database service and backups.

The second Vercel project does not by itself double this baseline: the estimate assumes one Pro developer seat plus metered usage across the two deployments. It does increase build frequency and creates two sets of function traffic, so monitor usage by project as adoption grows.

## Growth scenarios

| Usage stage | Planning range/month | Likely shape |
|---|---:|---|
| Private/very small pilot | $0–$20 | Free Supabase/Upstash; Vercel Hobby only where its terms fit. |
| Public launch, up to ~10k MAU | $45–$85 | Vercel Pro + Supabase Pro/Micro or Small; free observability tiers; low AI cap. |
| ~10k–100k MAU | $75–$250 | Supabase Small/Medium, some egress/Realtime/Redis/observability usage, still one web/API codebase. |
| ~100k–1M MAU | $3,200–$6,000+ | MAU becomes material: at 1M MAU, Supabase's published 900k paid MAU above the 100k Pro allowance alone is about $2,925/month, before compute, egress, Realtime, Vercel, Redis, observability, and AI. |

These ranges assume ordinary quiz sessions and small multiplayer rooms. Session replay on every user, large classrooms, aggressive polling, uncached AI, or media-heavy content can exceed them quickly.

### AI example

Using Luna pricing, an explanation with roughly 1,000 input tokens and 500 output tokens costs about **$0.004**. A hard cap of 25 newly generated explanations/day is therefore roughly **$3/month** before cache hits. Terra at the same token shape is about $0.01 per generation, or roughly $7.50/month at that cap. The database daily claim and explanation cache should stay enabled regardless of provider.

## First scaling constraints

1. **Realtime multiplayer fan-out.** Answer events can trigger refreshed state/distribution reads for many participants. Before large classrooms or hundreds of concurrent rooms, aggregate per-question counts in one server-side mutation/broadcast and avoid per-player full-state polling.
2. **Database write/event growth.** `match_answers`, attempt answers, submission claims, reports, auth events, and history tables grow continuously. Run the retention helper, monitor index size and slow queries, then partition high-volume append-only tables when measured growth justifies it.
3. **Roadmap request count.** Verified learning intentionally records answers server-side. If lesson traffic dominates, batch safe reads and reuse attempt context while preserving one-time/atomic answer semantics.
4. **Serverless rate limiting.** In-memory limits are per instance. Public traffic should use Upstash before launch.
5. **Question-admin pagination.** The public bank is sharded, but the `/dev` control room should move from large client-side result sets to cursor pagination before the bank becomes much larger.
6. **Vercel handler count.** The repository intentionally stays at 12 physical handlers by multiplexing operations. Pro removes the Hobby deployment concern, but future APIs should still be grouped by bounded domain rather than creating one function per action.

## Metrics and upgrade triggers

- Upgrade Supabase compute when sustained CPU approaches 70%, memory pressure/swapping appears, connection use approaches 70% of the plan limit, or p95 database latency trends upward under normal traffic.
- Investigate Vercel when p95 function duration rises, cold-start share grows, transfer exceeds plan expectations, or 429/5xx rates rise.
- Upgrade or pay for Upstash before 500k monthly commands; each protected API request can consume one or more commands.
- Sample Realtime peak connections and messages per completed match, not just total users.
- Track AI generated versus cached explanations and enforce a financial daily ceiling.
- Keep privacy-safe product metrics from [docs/growth-metrics.md](./docs/growth-metrics.md); do not log tokens, email addresses, answer proofs, or submitted answer text.

## Recommended sequence

1. Launch on Vercel Pro + Supabase Pro + Upstash Free/PAYG: about $45/month plus domain/tax.
2. Establish `/api/health`, Vercel, Supabase, Redis, and error-budget dashboards before adding capacity.
3. Use real p95 latency, DB utilization, Realtime fan-out, MAU, and retention data to choose the next tier.
4. Optimize multiplayer aggregation and retention before a high-concurrency classroom push.
5. Move to larger Supabase compute only when the measured trigger is present; do not pre-pay for speculative scale.
