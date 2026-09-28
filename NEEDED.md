# NEEDED — remaining owner actions

Reviewed 2026-09-28. This is the active list. The [previous checklist](docs/needed-before-cleanup-2026-09-28.md) preserves detailed procedures and historical evidence. An unchecked item means it remains unverified; optional features are not launch blockers.

## Decisions now settled

- English only. No Czech translation, guide or language audit work in this sweep.
- EUR only worldwide: 3.99 EUR monthly / 39.99 EUR annually. US customers also pay EUR. No USD Prices or automatic currency conversion; confirm Stripe Adaptive Pricing is disabled when Stripe is configured.
- Stripe setup is deferred to the owner. Keep `BILLING_ENABLED` absent/false until the complete paid-launch gate below passes.
- Keep existing defaults: voluntary 14-day first-payment refund, retroactive Premium milestones, invitations and their existing caps, no public country flags, current tier ladder and difficulty labels. These do not need repeated owner decisions.
- Keep merchandise/redemption, GitHub garden and learning paths disabled until deliberately launched and tested. No Spreadshop registration, sample order, API purchase, garden app or pilot is needed for the current release.
- Skip Vercel Web Analytics: PostHog covers product/pageview analytics. OwnDashboard's Vercel visitor panel may remain empty.
- Skip extra Skew Protection work: it helps old tabs continue across deployments, but existing chunk recovery reloads safely. Revisit only if stale-tab failures justify it.
- Keep the repository name for now. Renaming is cosmetic and introduces deployment/integration churn.
- Keep historical handoff documents as references. No badge revival, portfolio-thumbnail refresh, extra league/streak animation, FSRS rewrite or offline scoring project is needed for this launch.

## Completed or verified in this sweep

- GitHub, Supabase and Vercel access authenticated. devShark database is `rvlybcjdpafwyeuojvhl`; do not use the own-dashboard-scoped local Supabase MCP for it.
- Design PRs #265–#267 were already merged. Vercel team is already Pro. RTK 0.44.1 and its global integration already exist.
- Twenty stale branches archived to `archive/2026-09-28/*` tags and removed. `claude/elegant-cori-h9cdgb` is retained for unmerged work; nothing was silently discarded.
- Business name, IČO and registered address verified against official ARES and populated in `client/product-catalog.ts`. Support email is published only after mailbox setup.
- Daily physical Supabase backups verified through 2026-09-28 03:29:46 UTC. Recovery project already exists; timed recovery is still open.
- New PostHog EU organization devShark / project 286767 created on the capped **Free** plan, no payment card. Production/Preview public project keys configured. Session replay, autocapture and heatmaps remain off. Production pageview/UTM, sample completion and signed-in identification verified; the [activation funnel](https://eu.posthog.com/project/286767/insights/yFVpwwjG) is saved. Quiz conversion still needs dedicated test-account verification.
- Mobile LCP investigation identified the delayed registration prompt as the largest paint. It now waits for visitor interaction. The follow-up production mobile run still missed the target (LCP 6.72 s); desktop LCP was 0.65 s. Keep mobile performance open; removing the prompt is not proof of meeting the target.
- Responsive sweep: 238 probes, zero issues. API typecheck, launch contracts, build and both production dependency audits passed. Targeted Premium/leaderboard tests: 30/30 on Node 24. See [sweep evidence](docs/launch-cleanup-2026-09-28.md) for deployment status and limitations.

## Necessary before taking payments — deferred with Stripe (#221)

- [ ] **Create the Stripe account and set up devShark Premium** — handoff section 3. (1) create the account and apply for Managed Payments (product tax code `txcd_20060058`); (2) create the Product "devShark Premium" with two Prices, 3.99 EUR a month and 39.99 EUR a year, both `tax_behavior: inclusive`; (3) in Checkout settings add the Terms URL `https://devshark.app/terms`, which the required consent box needs, and the privacy policy URL `https://devshark.app/privacy`; (4) set failed payments to end in "cancel" after the retries; (5) configure the Customer Portal: cancel at period end, switch monthly and annual within the one Product, card update, invoice history; (6) add the webhook endpoint `https://devshark.app/api/user/billing-webhook` on API version `2026-08-26.dahlia` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created` and `radar.early_fraud_warning.created`; (7) set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_ANNUAL`, `STRIPE_MANAGED_PAYMENTS` (`true` once Managed Payments is approved, `false` for plain Stripe with Stripe Tax) and `PUBLIC_ORIGIN=https://devshark.app` in Vercel. On the plain-Stripe path, also turn on "Successful payments" and "Refunds" under Settings → Business → Customer emails, and the failed-payment emails under Billing → Subscriptions and emails: `/premium`'s FAQ and the cancellation receipt say Stripe emails a receipt for every charge and refund, and plain Stripe sends none until they are on. Only a subscription that bills one of the two Premium Prices opens Premium, so if you ever change a price, list the old Price ids in `STRIPE_PRICE_PREMIUM_LEGACY` (comma-separated) before existing subscribers renew on them; (8) only then, and with the Vercel plan, the trader details and the Resend key in place, set `BILLING_ENABLED=true`. Until step 8 nobody can buy, and the locks still apply. [imp:5] [owner:me] [time:1h] [kind:setup]

- [x] Support mailbox and complete TRADER contact: `support@devshark.app` verified with a Gmail round trip on 2026-09-28.
- [ ] Configure transactional cancellation email (`RESEND_API_KEY`, verified `RESEND_FROM`) and prove logged-out cancellation delivery. **Render hosting is not Resend email**; the support mailbox alone does not supply this API.
- [ ] Verify test-clock failed-renewal/grace/cancellation behavior, real webhook fixtures, receipt/refund email, EUR-only Checkout and Customer Portal. Preserve the detailed nine-event setup in the Stripe item above.
- [ ] Review paid-sale legal text and actual seller/tax model before enabling billing, including withdrawal, cancellation and any merchandise promises. English-only UI does not remove obligations attached to the Czech business. Keep existing refund policy until explicitly changed.

## Necessary operational follow-up

- [x] `support@devshark.app` created on Zoho EU Mail Free (5 GB). MX/SPF/DKIM verified by Zoho; mail to Gmail and its reply both delivered. Zoho Accounts lists `kouril.lukas@gmail.com` as the additional email usable for password recovery. Owner can now use support to create the Render account; no app hosting migration is requested.
- [ ] Verify alert delivery for the activated external health monitor: `.github/workflows/health.yml` checks every 15 minutes and requires two consecutive failures. Manual run [36408742616](https://github.com/lukaskourilcz/react-express-app/actions/runs/36408742616) passed. GitHub Actions scheduling is best-effort; owner must enable failed-workflow notifications and verify delivery before treating it as an alert channel (#190).
- [ ] Run a timed isolated restore and application validation; retain RPO 24h / RTO 1h objectives. Existing backup and recovery copy are not proof of RTO. See [backup procedure](docs/backup-restore.md).
- [ ] Finish end-to-end quiz conversion verification in the saved PostHog funnel with a dedicated test account, and inspect the Sentry EU error payload for unwanted email, answer/code or tokens. Observed PostHog identify uses the user UUID rather than email; GeoIP enrichment is present, so analytics must not be described as anonymous. Sentry dashboard access is required. Never enable recording of editors.
- [ ] Complete one consolidated release session with dedicated free/Premium test accounts: locks/grants, quiz replay and rewards idempotency, invitations/vouchers, Learn hearts/debugging/progression, all coding graders (including the two slow React cases), Today/review, account erasure/non-admin denial and two-session Classroom. Preserve prior passing evidence in [release-acceptance.md](docs/release-acceptance.md); don't use owner progress or coins as disposable fixtures.
- [ ] Physical-phone and Safari checks: focus/touch/theme cold-load, signed-in 390px reflow and offline upgrade-sheet recovery. Desktop emulation does not replace these.
- [ ] Resolve React grader same-process integrity (#191) before treating untrusted verdicts as fully hardened. Keep #202 bot challenge deferred unless measured abuse exceeds existing distributed rate limits.
- [ ] Review practice-session retention scheduling / overly broad grants (#236). Existing daily learning-data purge is scheduled, but `purge_practice_sessions` is not. Question-bank audit portions remain owner-deferred.
- [x] Removed both StudyShark Supabase Auth redirects and its Production/Preview environment URL, verified the actual Google client trusts only the devShark Supabase callback, and deleted the paused StudyShark Vercel project. Its old URL now returns DEPLOYMENT_NOT_FOUND; #214 and #211 are closed.
- [ ] Remove production seed friends before public promotion after confirming their identifiers and preserving a rollback export. Do not remove real learner data.

## Firebase and old interview-prepper

The running devShark application already uses Supabase for data/auth. Firebase is only mentioned by the legacy one-time import; it is not a devShark runtime dependency. Vercel still hosts the SPA/functions and sandbox grader: Supabase is not a drop-in replacement for those workloads.

- [ ] Obtain the legacy Firestore export (or an explicit decision to discard that progress), dry-run then verify the Supabase import, and retire interview-prepper's Firebase/Vercel project and obsolete OpenAI credential. Deleting the old service first risks losing progress. See the preserved import procedure in the historical checklist.

## Useful when marketing launches, not platform blockers (#239)

- [ ] Finish desired Threads/LinkedIn profiles and Meta authorization; keep absent profiles hidden. Verify actual social link previews and PWA icon on real clients.
- [ ] Submit sitemap in Search Console. Move devShark to a dedicated Google OAuth project/client before branding it: its current client belongs to the shared Gemini API project, whose consent screen says Own Dashboard and also serves own-dashboard/gym-plzen. Do not rename that shared consent screen. A separate empty devshark-auth project exists; credential setup and a tested Supabase provider cutover remain necessary. Keep paid custom auth domain deferred.
- [ ] Update BoardlessAI's fact sheet to English-only/freemium/EUR and distinguish the site's daily question from its marketing snapshot before campaigns. No outbound messages sent in this sweep.
- [ ] Create a campaign voucher only when duration/cap/expiry and campaign are decided; no speculative entitlements. Add changelog entries with actual releases.

## Deferred by owner or until feature demand

Question/content audit, retired-item redistribution and #176 are left alone for the owner. Learning-path pilot/source review/workspace checks resume only when those paths are intentionally enabled. Merchandise setup/mockups/quotes/caps/fulfilment, optional Spreadshop API, GitHub garden, badge endpoint cleanup and monthly scaling reviews are parked rather than represented as urgent unfinished launch work.
