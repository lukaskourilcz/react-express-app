# Launch cleanup — 28 September 2026

## Delivered

Repository changes were merged in PRs [269](https://github.com/lukaskourilcz/react-express-app/pull/269) and [307](https://github.com/lukaskourilcz/react-express-app/pull/307). The active owner checklist is [NEEDED.md](../NEEDED.md); the old checklist is archived, not silently discarded.

- Published verified trader name, IČO, address and support mailbox, and clarified EUR-only pricing worldwide. Billing remains disabled pending Stripe setup.
- Created Zoho EU Free support@devshark.app with MX/SPF/DKIM verified and Gmail recovery contact verified. An explicitly authorized message and reply proved delivery in both directions. The owner can use this address for Render signup.
- Created PostHog EU organization devShark and project 286767 on the capped Free plan without a card. Production and Preview use its public key. Pageview, UTM, sample completion and UUID identification were observed. Saved the five-step seven-day [activation funnel](https://eu.posthog.com/project/286767/insights/yFVpwwjG). Saving a funnel does not prove every conversion event has arrived. Recording, autocapture and heatmaps remain off; GeoIP enrichment was observed.
- Archived 20 stale branch heads under archive/2026-09-28/* tags before deleting branches. Retained the unmerged claude/elegant-cori-h9cdgb branch.
- Removed StudyShark auth trust and deployment: two Supabase redirect entries, Production/Preview URL variables and the paused Vercel project. Verified the Google OAuth client's only callback is devShark's Supabase callback. The former deployment URL returns 404 DEPLOYMENT_NOT_FOUND.
- Activated a 15-minute GitHub Actions health monitor with two attempts before failure; manual run [36408742616](https://github.com/lukaskourilcz/react-express-app/actions/runs/36408742616) passed. Notification delivery remains unverified.
- Verified current physical Supabase backups and the existing recovery copy. A timed restore remains outstanding.

## Initial 18-issue review

| Issues | Disposition |
| --- | --- |
| #232 | Closed completed: obsolete branches archived and removed. |
| #214, #211 | Closed completed: StudyShark deployment and trusted-origin cleanup verified. |
| #188, #193, #194, #197, #201, #204, #217 | Closed not planned: cosmetic flags/animations/leagues, FSRS rewrite, offline scoring, obsolete community/supporter model, cosmetic repository rename. |
| #239 | Open: remaining marketing/account work; optional for platform availability. |
| #236 | Open: retention scheduling/grants are unresolved; content-audit portions deferred. |
| #221 | Open: Stripe and paid-launch acceptance deliberately deferred. |
| #208 | Open: handoff validation and retained unmerged work need resolution. |
| #202 | Open but deferred: stronger bot/velocity controls if actual abuse warrants them. |
| #191 | Open: hostile coding-submission integrity is real security work. |
| #190 | Open: timed recovery, notification delivery and production acceptance remain. |
| #176 | Untouched: owner will perform the question/content audit later. |

Ten of the original eighteen issues were closed. New design-review issues created during the sweep are separate and were not included in that count.

## Validation and limits

Node 24: API typecheck, launch contracts, production build and both production dependency audits passed (zero production vulnerabilities). Full client suite passed locally (360 tests); the new registration-prompt cases and updated Premium contact assertions also passed. Responsive sweep: 238 probes, zero issues. A prior CI run had an intermittent leaderboard first-frame assertion failure; the subsequent main run passed its complete test stage. Do not infer that a timing-sensitive test can never recur from a subsequent pass.

Production /api/health returned healthy with database/serviceRole ok and rateLimiter configured after the merge. The production bundle contains the new PostHog project key.

The guest registration prompt now waits for interaction, with unmount cleanup covered. Lighthouse 13.4.1 production measurements at 10:25 UTC: mobile performance 48, LCP 6.72 s, TBT 517 ms; desktop performance 99, LCP 0.65 s, TBT 0 ms. CLS was zero and accessibility/best-practices/SEO scored 100 on both profiles. These are lab results, not field measurements. Mobile performance remains unresolved; do not report this sweep as meeting the mobile LCP target.

The live app already uses Supabase for auth/data. Firebase only remains in the historical import path; retiring the old interview-prepper service safely requires an export or explicit discard decision. Supabase does not replace the existing SPA/function/sandbox hosting without architectural work.

Google OAuth branding cannot safely be edited in place: the actual client lives in a project shared by own-dashboard and gym-plzen, branded Own Dashboard. A dedicated client and tested provider cutover are the remaining path.

No Czech content work, question-bank audit, paid subscriptions, merchandise/garden/path launch, Render hosting migration or unrequested outbound marketing was performed.
