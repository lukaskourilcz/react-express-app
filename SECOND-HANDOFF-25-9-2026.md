# Second handoff, 25 September 2026: devShark becomes freemium

Read this before touching the repository. It is written for the implementation agents that
follow, and it records what the owner decided on 25 September 2026, what the research found,
the design that follows from both, and the order of work. Each step below is one GitHub issue
in `lukaskourilcz/react-express-app`; the issue index is in section 12. The companion document
in `lukaskourilcz/quorum` (`SECOND-HANDOFF-25-9-2026.md`) covers the BoardlessAI side: the
social queue, LinkedIn, Instagram and Threads.

The kickoff issues of the same morning (#217, #218, label `kickoff-25-9-2026`) still stand.
`HANDOFF.md` (9 September) and `docs/DEEP_END_HANDOFF.md` are history; nothing here reopens them.

## 0. The decision

devShark stops being free. From the first public users on:

- **Free tier**, every registered account: the Learn topics HTML, CSS and JavaScript in full,
  the first half of React (levels 1 to 12 of 25), the first stage of every coding project and
  short path, and a starter set of coding challenges that together make about 15 % of the
  catalogue. Quizzes, the daily challenge, the Biggest Shark Challenge, multiplayer rooms,
  flashcards, the typing racer, leaderboards, streaks, friends and the token shop stay open.
- **Premium**, 3.99 a month: every Learn topic, every coding challenge, every evolving project,
  the FDE and DSA learning paths once their switches are on, and coins that buy merchandise.
- **Merchandise** is printed and shipped by Spreadshop (sprd.net AG, EU platform).
- **Coins** reward learning and can be spent on merchandise.
- **The leaderboard** opens on the last 30 days; the all-time board is one tab away.
- **Coding challenges** carry Easy, Medium and Hard labels, the Easy band doubles, and the one
  debugging project becomes three five-level paths that teach `console.log` as a tool.
- **The homepage** stops saying devShark is free.

This changes the protected invariant in `CLAUDE.md`, `AGENTS.md` and `shared/rewards.ts`. The
first implementation step (D0) rewrites it. Until D0 lands, the old rule is still in the files,
so do D0 first and quote this section in its commit message.

**What does not change.** The server owns answers, grading, XP amounts, scores, streaks, ranks,
product scope, admin roles and one-time claims. Correct answers never reach the client before
submission. Premium changes *which content a learner may start*; it changes nothing about how a
question is graded, how much XP an item gives, how a streak is counted, how a leaderboard is
ranked or how matchmaking works. Streak protection keeps its four bounds (tokens only, cap of
two, day count only, no board ranks by streak). Cosmetics stay cosmetic. Twelve physical
handlers under `api/`. English copy only. No AI feature.

## 1. What the research found (read before you design anything else)

1. **Spreadshop cannot issue discount codes.** The shop system has no order API, no webhooks
   and no owner-created coupons; promotions are Spreadshop's own monthly campaigns. The owner
   can order from their own shop at base price and ship to any address ("order product
   samples"). So "coins give a discount on a t-shirt" cannot be built on Spreadshop. Coins buy
   a concrete item instead: the learner redeems, the owner orders at base price and ships. The
   existing merch order and fulfilment code already models exactly that. Section 8 has the
   prices and the two platforms that do support unique codes if the owner ever insists on
   percentage discounts.
2. **Meta forbids paying for follows.** The Community Standards on spam prohibit "offering to
   provide anything of monetary value in exchange for engagement" and "requiring users to
   engage … to gain access to specific, exclusive content"; LinkedIn's policies forbid
   "artificially increase engagement". No platform API can tell whether a given user follows a
   page. Coins that buy merchandise are monetary value. The "follow us on LinkedIn, Instagram
   and Threads and get your first coins" mechanic therefore ships as links without a reward,
   plus a welcome grant at sign-up and an optional referral grant. A click-through grant exists
   behind a setting that defaults to zero; the owner decides (section 7).
3. **Billing provider: Stripe Checkout + Billing + Customer Portal with Managed Payments.**
   Stripe (as "Link") is then the merchant of record: it charges, collects and remits VAT and
   other consumer taxes worldwide, handles disputes and sends receipts. On a 3.99 EUR charge
   the owner keeps about 2.72 to 2.80 EUR; Paddle keeps 2.66 and is the runner-up if Stripe's
   eligibility review declines a sole trader. The same code runs plain Stripe + Stripe Tax if
   the owner prefers to handle VAT (about 9.5 to 11.5 % fees, but the owner becomes the taxable
   person). Fixed fees eat 7 to 11 % of a 3.99 charge; an annual plan at 39.99 cuts the fee
   share by more than half, so offer both.
4. **EU consumer law shapes the checkout.** Price shown inclusive of VAT ("3.99 a month, VAT
   included"); a required checkbox that waives the 14-day withdrawal right for digital content
   (Stripe's `consent_collection` plus explicit custom text); the order button must read as an
   obligation to pay; auto-renewal and cancellation must be stated before purchase; Germany
   requires a public cancellation button (§ 312k BGB) and the EU withdrawal button applies
   since 19 June 2026, so a public two-step cancel page ships with billing.
5. **The codebase today.** No plan, tier or subscription concept anywhere. Two token systems
   (a browser `localStorage` wallet still awarded by `client/src/lib/xp.ts`, and the server
   ledger of migration 028 that only quiz, daily and Biggest Shark Challenge results feed; the
   200-token sign-up grant has no caller). The all-time leaderboard ranks lifetime correct
   answers with no dates anywhere. Debugging is one ten-stage café-orders project plus four
   standalone debug tasks. Difficulty is the five-step tier ladder. Every "free" claim lives in
   the places listed in section 9. Tests that will break: the EN/CS key parity check
   (English keys must not be deleted), `scripts/check-public.mjs` (`isAccessibleForFree`),
   the merch and streak contracts in `scripts/test-launch-contracts.ts`, the Storybook
   leaderboard heading, and the CSP in `vercel.json` (`frame-src 'self'`, `connect-src`
   limited to Supabase), which is why nothing below embeds a third-party script.

## 2. Tiers (step D1)

### 2.1 One contract: `shared/tiers.ts`

Create it beside `shared/rewards.ts` and make it the only place that says what free includes.

```ts
export type Tier = 'free' | 'premium';

/** Learn topics open to every registered account, in full. */
export const FREE_LEARN_TOPICS = ['html', 'css', 'javascript'] as const;
/** Topics open up to a level; React has 25 levels, so 12 is the first half. */
export const FREE_LEARN_LEVELS: Partial<Record<RoadmapTopic, number>> = { react: 12 };
/** Stage or level one of every evolving project and short path stays open. */
export const FREE_EVOLVING_STAGES = 1;
/** Share of the whole coding catalogue that carries `free: true`; the launch contract asserts it. */
export const FREE_CODING_SHARE = { target: 0.15, min: 0.12, max: 0.18 } as const;
/** Quizzes stay open in every category. Set to 'free-topics' to tighten later. */
export const QUIZ_FREE_CATEGORIES: 'all' | 'free-topics' = 'all';

export type GatedContent =
  | { kind: 'learn-level'; topic: RoadmapTopic; level: number }
  | { kind: 'learn-part-test'; topic: RoadmapTopic; part: number }
  | { kind: 'coding-task'; taskId: string }
  | { kind: 'evolving-stage'; challengeId: string; stage: number }
  | { kind: 'learning-path'; pathId: LearningPathId };

export function contentTier(content: GatedContent, index: ContentIndex): Tier;
export function isOpenTo(tier: Tier, content: GatedContent, index: ContentIndex): boolean;
```

`ContentIndex` is the pure data the function needs: level counts per topic, the coding index
with its `free` flags, and the evolving registry. Keep the module free of imports from `lib/`
so the browser can use it for locks and the server for refusals, and keep both reading the same
function. A part test is premium when any level in its part is premium (React's second part
ends above level 12, so it is locked; its first part is open).

The `free: true` flag lives on the coding task definitions in `lib/coding/tasks/*.ts` and is
projected into `shared/coding-index.ts` by `npm run build:coding-index`. Initial pick, about
70 of 480 tasks: stage or level one of every project and short path (that is already open to
signed-out visitors), plus roughly 40 standalone Easy tasks spread as JavaScript 20, TypeScript
8, React 8, Algorithms 4, chosen so each technique group of tier 1 has its first task open.
After D7 doubles the catalogue, re-pick so the share stays near 15 %.

Anonymous visitors keep exactly what they have today: the landing sample question, "Try one, no
signup", and stage one of a project. Nothing in this handoff widens or narrows that.

### 2.2 Entitlement storage

Migration `supabase/supabase-schema-039.sql` (use the next free number if 039 is taken by the
time you start), additive and idempotent like every migration since 024. User ids are `TEXT`
in this schema (`auth.uid()::text`), so follow that.

```sql
CREATE TABLE IF NOT EXISTS billing_customers (
  user_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS entitlement_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('provider','manual','promo')),
  plan TEXT NOT NULL DEFAULT 'premium',
  status TEXT NOT NULL,                       -- provider status mirror, or active | revoked
  provider_subscription_id TEXT UNIQUE,       -- null for manual and promo
  provider_price_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  valid_until TIMESTAMPTZ,                    -- manual and promo; null means open-ended
  note TEXT,                                  -- who granted it and why
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,                        -- the provider's event id
  type TEXT NOT NULL,
  object_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error TEXT
);
```

`is_premium(p_user TEXT) RETURNS BOOLEAN` (SQL, STABLE, SECURITY DEFINER, empty
`search_path`): true when a manual or promo grant is `active` and unexpired, or a provider grant
is `active` or `trialing`, or a provider grant is `past_due` and its `current_period_end` plus
seven days is still ahead (the grace window that covers Stripe's retries). Routines, all
SECURITY DEFINER and service-role only, in the style of 028: `upsert_provider_entitlement`,
`grant_manual_entitlement`, `revoke_manual_entitlement`, `record_billing_event` (returns false
on a duplicate id). RLS on all three tables, one owner-scoped SELECT policy on the first two,
no policy on `billing_events`, `anon` holds nothing. Prove the migration the way 032 to 035
were proven (`HANDOFF.md`): locally from an empty database, then in production inside a rolled
back transaction, then applied.

### 2.3 Server enforcement

`lib/access.ts`: `resolveTier(userId)` (one query per request, memoised on the request context)
and `assertOpen(userId, content)` that throws `PremiumRequiredError`. `jsonError` maps it to
**402** with body `{ error: 'premium_required', kind, ref }`. Call sites, all existing branches:

- `api/quiz/roadmap.ts`: the level seal and `resource=answer`, `complete`, the part test and
  checkpoint seals, `coding-task`, `coding-submit`, `coding-reveal`, the evolving stage
  issuance (stage two and up), `learning-path-start`, `learning-path-submit`.
- `api/user/[op].ts`: `learning-path-enrollment` (POST).
- `api/quiz/questions.ts`: only when `QUIZ_FREE_CATEGORIES` is `'free-topics'`.

Drafts, bookmarks, skips and reviews of content the learner already cleared are never refused:
Premium gates *starting* new content. When Premium lapses, everything passed stays passed and
visible, the Today queue stops offering locked items, and the next locked start shows the
upgrade sheet. Placement and skill checks stay open; they may place a learner at a locked level,
and the map then shows the lock.

`op=entitlement` (GET, auth) returns `{ tier, source, currentPeriodEnd, cancelAtPeriodEnd,
inGrace }`. Manual grants are the way to test before billing exists: `api/admin/[op].ts`
gains `op=entitlements` (list, grant with `validUntil` and `note`, revoke), admin-only through
the existing authorization.

### 2.4 Client

- `client/src/lib/entitlement.ts`: `useEntitlement()` on TanStack Query, `staleTime` 60 s,
  refetch on window focus and after checkout. Signed-out resolves to `free` without a request.
- Locks use the existing glyphs and the `coding.lock.*` pattern: a locked Learn level node is
  focusable, `aria-disabled`, carries "Premium" as text (never colour alone) and opens the
  upgrade sheet on activation. Coding cards keep title and blurb and add an Astryx `Badge`
  reading "Premium"; the workbench refuses through the same sheet. Evolving stage lists lock
  from stage two. Part tests and checkpoints show the same state.
- `UpgradeSheet` (one dialog on the existing primitive): what Premium includes in six lines,
  the price with VAT, "Go Premium" to `/premium`, "Not now". No urgency copy, no countdowns.
- The API client maps 402 `premium_required` to the sheet in one place
  (`client/src/lib/api.ts`), so a stale client never shows a raw error.
- Profile shows the plan line: "Free", "Premium, renews 12 Nov", "Premium until 12 Nov
  (cancelled)", "Premium, complimentary until …"; "Manage billing" opens the portal.
- States to cover: loading (skeleton on the plan line, never a flash of locks on a premium
  account: resolve the entitlement before painting the map), offline (last known tier from the
  query cache, locks read as unknown rather than locked), lapsed, grace, and 360 px.

### 2.5 Contracts

Add to `scripts/test-launch-contracts.ts`: `shared/tiers.ts` imports nothing from `lib/`; the
free coding share is inside `FREE_CODING_SHARE`; every `free: true` task exists; `is_premium`
and the entitlement routines read none of `user_xp`, `user_stats`, `user_category_stats`,
`user_streak*`, `roadmap_progress`, `coding_progress` (grep the migration the way the 035
contract does); a grant writes none of those tables; the twelve-handler count is unchanged;
a 402 body carries `premium_required`.

## 3. Billing (step D2)

### 3.1 Provider and prices

Stripe, one Product "devShark Premium", two Prices: monthly 3.99 and annual 39.99, created
with `tax_behavior: 'inclusive'` and `currency: 'eur'`. Enable Managed Payments on the account
(eligibility review; product tax code `txcd_20060058`, self-study web-based training). If the
review declines, switch the flag below to plain Stripe with Stripe Tax and keep the code. The
owner decides the currency question in section 11; the code takes the Price ids from the
environment, so adding a USD Price later is configuration.

Environment: `BILLING_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_ANNUAL`, `STRIPE_MANAGED_PAYMENTS`
(`true` or `false`), `PUBLIC_ORIGIN` if not already present. `BILLING_ENABLED=false` hides
every checkout entry point and the `/premium` CTA turns into "Premium opens soon"; the locks
still apply.

### 3.2 Routes, inside the twelve handlers

All on `api/user/[op].ts`, dispatched like `wallet` and `payment-webhook`:

| Op | Method | Auth | Does |
| --- | --- | --- | --- |
| `billing-checkout` | POST | Bearer | get or create the Stripe Customer, store it in `billing_customers`, create a Checkout Session (`mode: 'subscription'`, `customer`, `client_reference_id: userId`, `subscription_data.metadata.supabase_user_id`, `success_url: /premium/success?session_id={CHECKOUT_SESSION_ID}`, `cancel_url: /premium`, `allow_promotion_codes`, `consent_collection.terms_of_service: 'required'`, `custom_text` for the waiver and the renewal sentence, `locale: 'auto'`, and `managed_payments: { enabled: true }` or `automatic_tax: { enabled: true }`), return `url` |
| `billing-portal` | POST | Bearer | create a Customer Portal session with `return_url: /profile`, return `url` |
| `billing-webhook` | POST | Stripe signature | verify `Stripe-Signature` over the **raw body** the same way `payment-webhook` reads its raw body today; record the event id first (`record_billing_event`, duplicate answers 200 and stops); refetch the subscription from Stripe rather than trusting the event snapshot; `upsert_provider_entitlement`; answer 200 after the commit |
| `billing-cancel` | POST | none | the public cancellation and withdrawal page (3.4): body `{ email, action: 'cancel' \| 'withdraw', step: 'request' \| 'confirm' }`; rate limited 5 per hour per IP; never reveals whether an email exists |
| `entitlement` | GET | Bearer | section 2.3 |

Rate limits: `billing-checkout` and `billing-portal` 10 per minute per user in `RATE_LIMITS`;
the webhook is exempt by signature. Request ids and `jsonError` as everywhere.

Events to subscribe to and their mapping: `checkout.session.completed` (link customer and
user, store the consent acceptance with the session id, then upsert from the subscription);
`invoice.paid` (upsert); `invoice.payment_failed` and `customer.subscription.updated` with
`past_due` (upsert; access stays inside the seven-day grace; the profile shows "Payment failed,
update your card"); `customer.subscription.updated` (renewals, plan switch,
`cancel_at_period_end`); `customer.subscription.deleted`, status `unpaid`, `canceled` or
`incomplete_expired` (status mirror, so `is_premium` turns false); `charge.refunded` (a full
refund sets the grant `revoked`; a partial refund only logs); `charge.dispute.created`
(revoke immediately and write a `note`); `radar.early_fraud_warning.created` (refund
proactively; a refund is cheaper than a dispute). Manual and promo grants are separate rows
that the webhook never touches. Events arrive out of order; an upsert from the live object is
order-insensitive by construction. An event for a user the server cannot resolve is recorded
with `error` and answered 200; Stripe retrying for three days does not create the user.

Dashboard configuration for the owner: failed payments end in "cancel"; the portal allows
cancel at period end, monthly to annual switch inside the same Product, card update and
invoice history.

### 3.3 Success page

`/premium/success` calls `entitlement`. If the tier is still `free` because the webhook has
not arrived, the server retrieves the session by id (`billing-checkout` grows a `?session_id=`
GET branch) and runs the same idempotent upsert, so nobody waits on webhook latency. The page
then refreshes the entitlement query and links to the map with "Everything is open now."

### 3.4 Legal surfaces that ship with billing

- `/premium` (section 4) states the price with VAT, the billing period, "renews every month
  until you cancel", how to cancel and that cancellation takes effect at the end of the paid
  period.
- The checkout consent text: "I want Premium to start now and I understand that I lose my
  14-day right of withdrawal for digital content." Store the acceptance with the session id.
- `/premium/cancel`, public, two steps, no login required: enter the account email, then a
  confirmation screen with one button "Cancel my subscription now" (and, on the withdrawal
  variant, "Withdraw from the contract"). The server finds the customer by email through the
  Stripe API, sets `cancel_at_period_end`, and for a withdrawal request within 14 days of the
  first payment issues a full refund and revokes the grant (the owner's voluntary refund
  policy; it sidesteps arguments about the waiver). The page shows a confirmation with the
  effective date. If `RESEND_API_KEY` is configured, send the same confirmation by email;
  otherwise show it on screen and rely on Stripe's receipt emails. The order button in Checkout
  must read as an obligation to pay; use `submit_type` and `custom_text.submit` and let the
  owner's lawyer confirm the wording against § 1826a of the Czech Civil Code.
- Terms: section 4.8 of the billing research, summarised in section 4.3 below.

### 3.5 Tests

Fixture payloads captured from a Stripe sandbox for the nine event types above, signed in
tests with `stripe.webhooks.generateTestHeaderString`. Assert: duplicate delivery is a no-op;
`deleted` before `created` ends in the right state; unknown user records `error` and answers
200; full refund revokes; dispute revokes; a manual grant survives every provider event;
unsigned payloads answer 400; the checkout route refuses anonymous callers. A Billing
simulation (test clock) run once by hand to see `past_due` become `canceled` and to confirm the
grace window; record it in `docs/release-acceptance.md`.

## 4. Public copy, the pricing page and the legal pages (step D3)

### 4.1 Rule for the dictionary

The EN/CS parity contract requires every Czech key to exist in English. Do not delete English
keys; rewrite their text and add new keys. Leave `translations.cs.ts` untouched (it is
unshipped Czech, per `CLAUDE.md`).

| Key | Today | New text |
| --- | --- | --- |
| `home.freeForever` (hero kicker) | Free forever | Free to start |
| `home.statForever` with the `$0` value at `Home.tsx:205` | forever | replace the stat: value `3`, label `topics free` |
| `home.pledge` | Every lesson, quiz and learning path is free. That's the whole pricing page. | HTML, CSS and JavaScript are free for every account. Premium opens every path and challenge for 3.99 a month, VAT included. Cancel any time. |
| `home.startFree` | Start learning free | Start free |
| `home.freeText` (unused) | … | Free to start: three topics, half of React and a starter set of challenges. |
| `footer.free` | Learning stays free. Optional support never changes access, XP or rankings. | Free to start. Premium changes what you can open, never your scores, streaks or rankings. |
| `landing.compare.title` | What costs money elsewhere is free here | What you get, free and with Premium |
| `landing.compare.subtitle` | … free, forever … | Prices include VAT. The left column is every account; the right column is Premium at 3.99 a month or 39.99 a year. |
| `landing.compare.colBrand` / `colOthers` | devShark / Typical paid apps | Free / Premium |
| `landing.compare.footnote` | … devShark charges for none of it. | Premium never changes how an answer is graded, how much XP it gives or how the boards are ranked. |
| `landing.compare.cta` | Start learning free | Start free |
| `landing.founder.title` | Why devShark is free | Why devShark has a Premium tier |
| `landing.founder.body` | … | I built devShark so that the foundations stay free: HTML, CSS and JavaScript cost nothing and always will. Premium pays for the servers that grade your code, for new challenges and for keeping the site free of ads. If it helps you, 3.99 a month keeps it running; if it doesn't, cancel in two clicks. |
| `landing.founder.supportNote` | Support is optional and never unlocks anything. | Premium opens content. It never buys XP, ranks or streaks. |
| `landing.founder.supportCta` | See how support works | See what Premium includes |

The comparison rows become plan rows (rewrite the `landing.compare.row*` and `others*` keys
into Free and Premium cells): Learn topics (HTML, CSS, JavaScript / all 16), React (levels
1 to 12 / all 25), coding challenges (stage one of every project and a starter set / all
480 and every new one), FDE and DSA learning paths (no / yes, when open), quizzes and the daily
challenge (yes / yes), leaderboards, streaks and friends (yes / yes), coins for merchandise
(no / yes), ads (none / none), card needed to start (no / no). Drop the "AI study help" row
(devShark ships no AI) and the "Full English & Czech" row (English only). Keep the
`ComparisonTable` component and its table primitive; only the rows and copy change.

### 4.2 The `/premium` route (new, Deep End v2)

Kicker "devShark Premium", display heading "Everything in devShark for 3.99 a month". Two plan
cards (monthly; annual "39.99 a year, two months free"), the included list, the comparison
table above, an FAQ of six questions (cancel; what happens to progress; invoices; withdrawal and
refund; can I switch monthly and annual; do you sell my data), and the legal microcopy (auto-
renewal, VAT included, waiver sentence, links to Terms and to `/premium/cancel`). The CTA for a
signed-out visitor signs them in with Google and returns to `/premium`; for a Premium account
the page shows the plan line and "Manage billing". Register `/premium`, `/premium/success` and
`/premium/cancel` in `client/src/App.tsx`, the sitemap and `scripts/check-public.mjs` (URL
count and `isAccessibleForFree: false` in `client/src/lib/publicMetadata.ts`). Add `/premium`
to the secondary navigation next to Leaderboard; the header keeps its current shape.

### 4.3 Legal pages (`client/src/components/PublicInfoPages.tsx`)

- Support: retire the voluntary-support page (`SUPPORT_ENABLED` stays off) and redirect
  `/support` to `/premium`, or keep it as one paragraph pointing to Premium. The owner decides
  in section 11; default to the redirect.
- Terms: trader identification (name, IČO, seat, email), the two tiers, the price with VAT
  and the billing period, auto-renewal and how to cancel, the waiver text and its
  consequence, withdrawal instructions and the model form for cases where the right exists,
  the voluntary 14-day refund on the first payment, that manual and promo grants are
  revocable, that Stripe (Link) is the seller of record under Managed Payments, fair use and
  account sharing, changes with notice and the right to cancel, Czech governing law without
  limiting the consumer's mandatory protection, ADR and ODR information (ČOI), complaints
  contact. Keep the product sentence: learning content, XP, streaks, ranks and badges are
  unaffected by payment.
- Privacy: Stripe and Link as processors and seller of record; Spreadshop (sprd.net AG) as an
  independent controller and joint controller for data collected in the shop; that a
  merchandise redemption or reward stores a postal address for fulfilment only and passes it
  to sprd.net AG; Resend if configured.

### 4.4 Everything else that says "free"

`README.md:3` and `README.md:167`, `about-project.md:4` (and its stale "Stripe" row becomes
true, so fix it rather than delete it), `docs/design/brand-system.md` "Free-forever rule",
`docs/design/design-thesis.md:27`, `docs/coding-integration-plan.md:22`,
`docs/fde-learning-path-research.md:38`, `docs/design/product-ux-audit.md:34`,
`docs/release-acceptance.md:350`, `.claude/skills/shark-product-context/SKILL.md:18`,
`.claude/skills/deep-end-design-system/SKILL.md:29`, `.claude/agents/product-design-auditor.md:36`,
`.claude/agents/product-copy-reviewer.md:33`, `.claude/commands/implement-screen.md:13`,
`.claude/commands/review-copy.md:13`, the header comments of `shared/rewards.ts`, `Shop.tsx`
and `supabase-schema-035.sql`, `quiz.supportBody`, `shop.fairnessNote`, `shop.subtitle`.
Step D10 sweeps them; D0 handles `CLAUDE.md` and `AGENTS.md`.

## 5. Leaderboard (step D4)

### 5.1 Data

Migration `040`: `user_activity_days (user_id TEXT, day DATE, category TEXT, correct INT,
answered INT, PRIMARY KEY (user_id, day, category))`, written inside the existing verified
routines and nowhere else: `record_verified_quiz_result_v2` (quiz and daily),
`record_roadmap_answer_v2` (Learn answers) and the Biggest Shark Challenge completion routine.
Each write is an upsert that adds the batch, keyed by the same receipts that already make those
routines idempotent. Coding passes stay out: they are not question answers, and mixing units
would change what a rank means.

`window_leaderboard(p_days INT, p_limit INT, p_category TEXT DEFAULT NULL, p_min_answers INT
DEFAULT 5)` ranks `SUM(correct) DESC, SUM(answered) ASC` over `day >= current_date - (p_days -
1)`, the same rule the all-time board uses, and `window_leaderboard_rank(p_user TEXT, p_days
INT, p_category TEXT)` returns the caller's own row. Both service-role only. The all-time
functions keep their sources, so the two boards differ only in the window and in the fact that
the 30-day board also counts Learn answers; say so in one line under the tabs.

Also in this migration: replace `friend_list` (033) so it orders by correct answers and
accuracy, never by `current_streak`. That contradiction exists today and the launch contract
should assert its absence.

### 5.2 API

`api/leaderboard.ts` gains `period=30d` (and `period=7d` costs nothing extra; expose it only
if the UI wants it). With a Bearer token present the response adds `me: { rank, correct,
answered }`; without one it stays cacheable with `s-maxage=60`. The personalised shape is
`Cache-Control: private`. Keep the handler public and unauthenticated for the anonymous case.

### 5.3 Screen

Rebuild `client/src/components/Leaderboard.tsx` in Deep End v2 rather than patching it: it is
the one screen with no `Kicker`, no stylesheet classes and hard-coded medal hexes. Remove the
"Web Dev" pill (`Leaderboard.tsx:115-131`): devShark has one subject and the label reads as a
leftover of the multi-subject era. Structure:

- `Kicker` "Leaderboard", display heading "Who learned the most", one sentence: "Ranked by
  correct answers, then accuracy. The 30-day board counts quizzes, the daily challenge and
  Learn answers, so a new learner can reach the top."
- `SegmentedControl` with three tabs: **Last 30 days** (default), **All time**, **Today**.
  A category select below the control (default "All topics") filters the first two tabs and
  replaces the chip row; the hex-tinted chips go.
- Rows: rank disc in ink (text "1", "2", "3", never colour alone; the three top ranks get a
  heavier disc, not gold, silver and bronze), name, country flag as text fallback (see #188),
  correct, accuracy. 44 px rows, tabular numerals, the learner's own row pinned at the bottom
  of the list with "You" and their rank when signed in and outside the visible top.
- Mobile cards under 600 px as today; the desktop table as today.
- States: skeleton rows while loading; an empty board with "Start a quiz" as the action;
  error with retry; offline shows the last cached board with a stale note; a signed-in user
  with no activity in the window sees "Answer a few questions to appear here".
- Tokens only; no `#f5b301`, `#9aa4b2`, `#cd7f32`. Reduced motion: no rank animations.

Update `client/tests/leaderboard.test.tsx`, `client/tests/mocks/handlers.ts`, the Storybook
story (heading stays "Leaderboard" so `tests/browser/storybook.spec.ts` keeps passing, or
update both together), `docs/design/reference-research.md:24` and the Home strip copy
`home.stripDailyText` if it names the daily board only. The ten seeded test friends on the
public board are an owner item that already exists in `NEEDED.md:57`; the 30-day board makes
them disappear on their own once they stop answering.

## 6. Coding challenges (steps D5, D6, D7)

### 6.1 Difficulty labels (D5)

`shared/coding-catalog.ts`: `export type Difficulty = 'easy' | 'medium' | 'hard'` and
`difficultyOf(summary)`. Derived, not authored, so it cannot drift: standalone tasks map tier
1 and 2 to Easy, 3 to Medium, 4 and 5 to Hard. Stages and levels map by position, because
every stage is tier 2 today: five-level paths 1 to 2 Easy, 3 to 4 Medium, 5 Hard; ten-stage
projects 1 to 3, 4 to 7, 8 to 10; the twelve-stage FullStack apps 1 to 4, 5 to 9, 10 to 12.
An authored `difficulty?` override is allowed on a task and `npm run test:coding` refuses one
that contradicts its tier (an Easy task cannot be tier 3 or above; a Hard task cannot be tier
1 or 2).

Surface it everywhere a task is listed: card chip (Astryx `Badge`, text "Easy", "Medium",
"Hard"), the workbench header, Collection, the evolving stage list. The track page groups by
difficulty in that order with the tier name as a sub-label, and the filter that reads "Any
difficulty" today offers the three labels. Add `difficulty` to the coding index and to
`docs/interactive-content-manifest.md`.

### 6.2 The debugging trio (D6)

Replace the single café-orders project with three five-level paths in the `debugging`
category, JavaScript, `format: 'debug'`, listed on the Coding home where the project sits
today. Every level starts from code that runs and is wrong, has a hint ladder whose first
rung names the logging technique, hidden checks, and reference, junior and senior solutions
proven by `npm run test:coding`. The lesson of each level is a way of *seeing* the program
before changing it.

| Path | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
| --- | --- | --- | --- | --- | --- |
| **Log it right** (Easy) | a bare `console.log(total)` says nothing about which total; log `console.log({ total })` and the shorthand prints the name | a loop that logs the wrong element; log the index with the value, then `console.table` | objects are references: the log shows the later state; snapshot with `structuredClone` before the mutation | `console.group`, `console.count` and `console.time` to find a function called twice | write `debug(label, value)` that logs and returns its value, replace the scattered logs, fix what it reveals |
| **Trace the state** (Medium) | an off-by-one in a range loop | a stale closure inside a loop of callbacks | `sort` mutates: the original order is gone | `await` inside a loop versus `Promise.all`: order and timing | `NaN` from string arithmetic travels three functions before it shows |
| **Edges and inputs** (Medium to Hard) | an empty array and `reduce` without an initial value | a missing property: `?.` and `??` in the right places | `==` versus `===` and a `'0'` that is truthy | money in floats: move to integer minor units | a `Date` that changes day at midnight UTC: work in UTC and format at the edge |

The sandbox already captures `console` output for the Run panel, so the hidden checks can also
assert the behaviour of the learner's `debug` helper in Log it right level 5. Retire
`js-evolving-debug` from the Coding home but keep its ten task ids grading, so existing drafts
and passes survive (the rule in `docs/product-architecture.md`). Keep the four standalone
`js-debug-*` tasks; `scripts/test-coding-content.ts` requires at least four debug tasks and it
should now also require the three paths. Fix `coding.evolving.debuggingBody`, which says
"Five stages" while the docs say ten; the new body describes three paths of five levels.
Update `docs/evolving-challenges.md` ("The debugging path" section) and the counts in
`docs/product-architecture.md`.

### 6.3 Doubling the Easy band (D7)

Today: 274 standalone tasks, of which Easy (tiers 1 and 2) are JavaScript 73, TypeScript 26,
React 33, Algorithms 11. Target: about 550 standalone tasks with Easy roughly doubled to 290
and Medium and Hard growing by about 75 together. Per track, new Easy tasks: JavaScript 90,
TypeScript 50, React 40, Algorithms 20. Each Easy task isolates one technique (at most two
`focus` tags), takes under ten minutes, has visible and hidden checks, references, hints, and
the three solutions.

The measurable goal: a learner who passes every Easy task has met every technique the Medium
tasks combine. Encode it as a contract in `scripts/test-coding-content.ts`: for every track,
every `focus` tag that appears on any Medium task must appear on at least three Easy tasks of
the same track. Print the coverage matrix from the test so the authoring waves can see the gaps
first, and author from the gaps. Author in four waves, one per track, each its own commit and
its own `npm run build:coding-index`; keep the README and `docs/product-architecture.md`
counts honest after each wave; re-pick the `free: true` set at the end so the share stays near
15 % (section 2.1).

## 7. Coins (step D8)

### 7.1 One wallet, named Coins

The server token ledger of migration 028 is the wallet; the UI calls it **Coins** from now on
and the code keeps its `token` identifiers (tables, ops, `shared/rewards.ts`). Write that
sentence in `docs/product-architecture.md` so nobody renames the schema. Retire the browser
wallet: `client/src/lib/xp.ts` stops awarding local tokens, `grantRegistrationBonusIfNew`
goes, and the legacy `localStorage` balance is no longer shown; the ledger is the only balance
(`docs/rewards-launch.md` already explains why legacy numbers were never converted).

### 7.2 Earning

Every credit is a ledger entry written by a service-role routine with a deterministic event id;
replays credit nothing. Rates live in `shared/rewards.ts` beside `TOKENS_PER_XP` and are
mirrored in game settings so the owner can tune them without a deploy.

| Event | Coins | Who | Idempotency key |
| --- | --- | --- | --- |
| Verified XP (quiz, daily, challenge, Learn level completion, coding pass) | 10 % of XP for every account, **doubled for Premium** at credit time | all | the award id, as today |
| Welcome grant at first sign-in | 200 | all | derived from the account id (the existing `grant_signup_tokens`, now called server-side on the first authenticated `op=wallet`) |
| Streak milestones 7, 30, 100 days | 25, 100, 300 | Premium | `streak:<n>` per account |
| Learn topic completed (every level passed) | 100 | Premium | `topic:<id>` |
| Evolving project or short path completed | 150 / 50 | Premium | `project:<id>` |
| 30-day board, top three at the end of a calendar month | 300 / 200 / 100 | Premium | `month-top:<yyyy-mm>:<rank>` |
| Referral: invitee completes a first Learn level | 100 to each | all, cap 20 per referrer | `referral:<invitee>` |
| Social click-through ("Find devShark on LinkedIn, Instagram, Threads") | setting `socialVisitGrant`, default **0** | all | `social:<platform>` |

Learn level completion and coding passes do not credit tokens today; add the credit inside
`complete_verified_roadmap_attempt` (XP is `50 × difficulty`, the server knows both) and
`record_coding_verdict`. The monthly top-three settlement has no cron: the first authenticated
`op=wallet` call after a month ends runs `settle_month_top3(previous_month)`, idempotent by
month id, before answering. A daily cap of 400 coins per account from XP keeps farming
bounded; milestones are outside the cap.

**The social grant is a policy decision, default off.** Section 1 explains why. The profile
card "Find devShark elsewhere" ships with the three links and no reward; the setting exists so
the owner can switch it on knowing the risk, and the copy must then say "thanks for visiting",
never "follow to earn". Referral is the compliant substitute and is optional (own issue, D8b):
a `referral_codes` table, an invite link `/?ref=CODE` stored at sign-up, the grant on the
invitee's first completed Learn level, both sides shown in the ledger.

### 7.3 Spending

- Crown 1200 and streak protection 250, unchanged, for every account.
- Merchandise, Premium only: `op=orders` (POST) refuses a shipped item for a free account with
  402. Prices are `tokenPrice` on `MerchPricing`; the owner enters them in `/dev` → Settings →
  Merchandise together with the base costs from section 8. Stock is the monthly cap on what the
  owner will post (a print-on-demand item has no physical stock, so `merch_stock` becomes a
  budget: 5 mugs a month means five rows of stock).

Calibration the owner should read before setting `tokenPrice`: the daily cap of 400 coins
from XP applies after the Premium doubling, so a heavy day earns 400 and a steady Premium
learner earns 100 to 200. A sticker set at 1,500 coins is about two weeks, a mug at 6,000
about six weeks, a t-shirt at 10,000 about ten weeks of steady Premium learning. The owner's cost per
mug is about 13.49 plus shipping; that is more than the net of several months of Premium, so
stock caps are what keep this affordable. Merchandise is a retention reward, not a margin line.

### 7.4 Screen

`/shop` is renamed in the navigation to **Rewards** (route unchanged). Sections in order: the
wallet with the last 25 ledger lines (existing), "How to earn" with live progress
("Streak 7 days: 4 of 7", "JavaScript: 21 of 25 levels"), Merchandise (section 8),
Crown and Streak protection (existing), Orders and claims (existing), "Find devShark
elsewhere" (three links; also on the Profile). Free accounts see the merchandise tiles with
"Premium members redeem coins for merchandise" and the upgrade sheet.

## 8. Merchandise through Spreadshop (step D9)

### 8.1 What Spreadshop is and what it is not

A free hosted shop at `devshark.myspreadshop.net` (EU platform; custom domain via CNAME is
documented on the US help centre and unverified for EU). sprd.net AG is the seller of record:
it takes payment, VAT, shipping, returns and customer service; the owner sets retail prices
above fixed base prices and receives the margin monthly (SEPA, EUR, minimum 10). No order API,
no webhooks, no owner-created discount codes, no per-user codes. The owner can order any item
from their own shop at base price and ship it to any address.

EU base prices, September 2026: t-shirt 17.49 (premium 20.99), unisex hoodie 29.99 (premium
31.99), mug 13.49, sticker 10 × 10 cm 2.49, sticker XS 1.99. Shipping shows only at checkout.

### 8.2 The integration, phase one

- No JavaScript embed: it needs CSP exceptions, consent gating for Google Tag Manager and
  fights the SPA router. Link out. `client/product-catalog.ts` gains `shopUrl` and
  `socialProfiles` (LinkedIn, Instagram, Threads URLs, filled once the owner creates them);
  nothing else defines URLs.
- The Merchandise section of the Rewards screen lists the products from `MERCH_CATALOGUE` with
  one image each under `client/public/merch/` (the owner exports mockups from Spreadshop),
  the cash price as a plain link "Buy at the devShark shop" (opens the Spreadshop product in
  a new tab), and, for Premium, the coin price with "Redeem" (the existing order flow). Add
  `hoodie` to `MERCH_SKUS` with the shirt sizes; that needs a migration to widen the CHECK
  constraints of `merch_stock` and `merch_order_items` (028). Keep `cap` in the catalogue but
  unconfigured.
- Optional and cheap: Spreadshop's Public Shop API (`GET /api/v1/shops/{id}/currentPromotion`,
  server-side with `SPREADSHOP_API_KEY` and `SPREADSHOP_SHOP_ID`, cached for an hour inside
  `api/settings.ts` as `merchPromo`) lets the Rewards screen announce "This month: 15 % off
  with code … until …". Spreadshop runs those promotions; the app only surfaces them.
- `cashCheckoutEnabled` stays `false` for good; cash goes to Spreadshop's checkout. Delete
  nothing: the webhook and the order state machine serve coin redemptions and the free package.

### 8.3 Fulfilment

A coin redemption or a path reward creates a `merch_orders` row as today (paid with tokens or
at zero). The owner reads `op=fulfilment`, opens the Spreadshop preview, uses "order product
samples" at base price with the learner's address, then records carrier and tracking in the
same screen. Update `docs/rewards-launch.md`: the supplier is Spreadshop, the quote fields are
the base prices plus the shipping seen at checkout, `vendor` is `sprd.net AG`, and the
"operations owner" item is now a weekly check of the fulfilment queue.

The free package for a finished FDE or DSA path stays as built (t-shirt, mug, sticker set):
about 34 in base prices plus shipping per completion. Both paths are still switched off in
production, so no package can be earned until the owner enables one; when that happens, enter
stock for the reward SKUs as a monthly cap first.

### 8.4 If the owner ever needs real discount codes

Fourthwall has a promotions API with unique, one-use-per-customer codes and pays out through
Stripe to Czech accounts; Spreadconnect (Spread Group's own API service) lets devShark run the
checkout with Stripe and place fulfilment orders by API, so coins could become plain price
adjustments. Both mean a second supplier account and are out of scope until the owner asks.

### 8.5 Privacy

Section 4.3 lists the privacy-policy additions. The redemption form collects a name, two
address lines, city, postcode and country, nothing else (the existing order shape); it says
the address goes to sprd.net AG for shipping and is deleted with the account.

## 9. Documentation, contracts and tests (steps D0 and D10)

**D0, first commit of the programme.** Replace the first bullet of "Protected behavior" in
`CLAUDE.md` and the matching paragraph in `AGENTS.md` with:

> devShark is freemium. `shared/tiers.ts` is the only place that says what the free tier
> includes and what Premium opens; the server refuses locked content with 402 and the client
> only mirrors it. Premium, coins, cosmetic shop items, collectible Shark Cards and badges
> change which content a learner may start and nothing else: never grading, explanations,
> XP amounts, scores, streaks, ranks, leaderboards, matchmaking or AI availability. Streak
> protection is the one bounded exception: two a month are granted free, extra ones cost coins
> earned by learning, the ceiling never rises above two, and a protection changes the day
> count of a streak and nothing else; no leaderboard here ranks by streak. Finishing a whole
> learning path earns the merchandise package, a reward *for* learning that changes no
> progress. Merchandise is printed and shipped by Spreadshop; coins redeem items, never
> discounts. devShark ships no AI feature.

Rewrite the header comment of `shared/rewards.ts` to the same effect, and add a "Tiers and
billing" section to `docs/product-architecture.md` that names `shared/tiers.ts`,
`lib/access.ts`, the three billing tables, the 402 contract and the Stripe environment. Change
the skills, agents and commands listed in section 4.4 in the same commit, because the next
agent reads them before reading this file.

**D10, last.** Sweep section 4.4; update `monetization.md` (the freemium row is now the
decision, with the fee arithmetic), `scaling.md` (Stripe fees and the merch cost per
redemption), `about-project.md` (Stripe is now true; task and question counts), `README.md`;
add rows to `docs/release-acceptance.md` for every check below with real results; extend
`NEEDED.md` with section 11. Remove `HANDOFF.md` once its owner items are in `NEEDED.md`.

**Checks that every step runs before it pushes:** `npm run typecheck:api`, `npm run
test:launch`, `npm run build`, `npm run check:responsive`, `npm audit --omit=dev`,
`npm audit --omit=dev --prefix client`, `git diff --check`; plus `npm run test:coding` for D5
to D7, `npm run test:paths` when learning paths are touched, `npm run test:client` for client
changes, `npm run check:public` and `npm run check:security` for D3, `npm run test:browser`
for the leaderboard story. Do not report a check you did not run.

## 10. Order of work and dependencies

| Step | Depends on | Can run in parallel with |
| --- | --- | --- |
| D0 invariant and docs | nothing | nothing; do it first |
| D1 tiers, gating, locks, manual grants | D0 | D4, D5, D6, D7 |
| D2 billing | D1 | D3, D4, D5, D6, D7 |
| D3 copy, `/premium`, legal | D1 (locks exist), D2 for the live CTA | D2 |
| D4 leaderboard | D0 | everything |
| D5 difficulty labels | D0 | everything |
| D6 debugging trio | D5 | D7 |
| D7 Easy doubling | D5 | D6 |
| D8 coins | D1 (Premium status) | D9 |
| D8b referral | D8 | |
| D9 Spreadshop merchandise | D8, and the owner's shop for images and prices | |
| D10 sweep and acceptance | all | |

Git: one branch per step, small commits with the step id in the subject
(`D4: rank the last 30 days on the server`), merge to `main` when the step's checks are green,
delete the branch. Migrations go to production through the Supabase connector only after the
local proof, and `NEEDED.md` records the date.

## 11. Owner items (copy into `NEEDED.md`)

- [ ] **Decide the currency and whether to add USD** — the code takes Price ids from the environment; start with EUR. [imp:4] [owner:me] [time:10m] [kind:decision]
- [ ] **Create the Stripe account, enable Managed Payments, create the Product and two Prices with `tax_behavior: inclusive`, set the failed-payment rule to cancel, configure the Customer Portal, add the webhook endpoint and the environment variables** — steps in section 3. [imp:5] [owner:me] [time:1h] [kind:setup]
- [ ] **Have the Terms, the checkout consent text and the order-button wording checked by a lawyer** (§ 1826a OZ, § 1837 l) OZ, § 312k BGB). [imp:4] [owner:me] [time:1h] [kind:legal]
- [ ] **Decide the voluntary 14-day refund on the first payment** — section 3.4 builds it on by default. [imp:3] [owner:me] [time:10m] [kind:decision]
- [ ] **Decide whether the Support page redirects to Premium or stays** — default redirect. [imp:2] [owner:me] [time:5m] [kind:decision]
- [ ] **Register the EU Spreadshop, upload designs (PNG, 4000 × 4000, 200 dpi apparel, 400 dpi mugs and stickers), enable a t-shirt, a hoodie, a mug and two sticker sizes, set margins, fill the shop's legal info, order one sample to learn the real shipping cost, export product mockups for `client/public/merch/`, and try Shop Settings → Advanced → Custom Domains** — section 8. [imp:4] [owner:me] [time:3h] [kind:setup]
- [ ] **Enter base prices, shipping and monthly stock caps in `/dev` → Settings → Merchandise; set coin prices with the calibration in section 7.3.** [imp:3] [owner:me] [time:30m] [kind:content]
- [ ] **Decide the social click-through grant** (`socialVisitGrant`, default 0) after reading section 1, item 2. [imp:3] [owner:me] [time:10m] [kind:decision]
- [ ] **Create the devShark LinkedIn Page, Instagram professional account and Threads profile, and record the URLs in `client/product-catalog.ts`** — the BoardlessAI handoff has the account checklist. [imp:4] [owner:me] [time:1h] [kind:setup]
- [ ] **Optional: a Resend account and `RESEND_API_KEY` for cancellation and welcome emails.** [imp:2] [owner:me] [time:20m] [kind:setup]
- [ ] **Optional: request a Spreadshop API key at partner.spreadshirt.net/apiKey** for the monthly promo banner. [imp:1] [owner:me] [time:10m] [kind:setup]
- [ ] **Tell BoardlessAI the launch facts** once Premium is live (price, what is free), so `config/marketingshark.json`'s fact sheet stops saying devShark is free and bilingual. [imp:3] [owner:me] [time:10m] [kind:content]

## 12. Issue index

Every issue carries the label `second-handoff-25-9-2026` and quotes its step id in its first line.

| Step | Issue |
| --- | --- |
| D0 | #219 |
| D1 | #220 |
| D2 | #221 |
| D3 | #222 |
| D4 | #223 |
| D5 | #224 |
| D6 | #225 |
| D7 | #226 |
| D8 | #227 |
| D8b | #228 |
| D9 | #229 |
| D10 | #230 |

Related, already open: #203 (merch costing; superseded by section 8, close it when D9
lands), #204 (community perks instead of paywalls; the owner's decision overrides its premise,
keep the mentoring and certificate ideas), #194 (weekly leagues; builds on D4's daily
aggregates), #202 (Turnstile; unchanged), #218 (marketingShark bank contract; unchanged).

## 13. Sources

Read on 25 September 2026. Stripe: https://stripe.com/en-cz/pricing,
https://stripe.com/en-cz/billing/pricing, https://docs.stripe.com/payments/managed-payments,
https://docs.stripe.com/payments/managed-payments/eligibility.md,
https://support.stripe.com/questions/managed-payments-pricing,
https://docs.stripe.com/billing/subscriptions/webhooks, https://docs.stripe.com/webhooks,
https://docs.stripe.com/api/checkout/sessions/create,
https://docs.stripe.com/billing/testing/test-clocks/simulate-subscriptions.md. Paddle:
https://www.paddle.com/pricing, https://developer.paddle.com/webhooks/overview. Consumer law:
https://coi.gov.cz/faq/8-odstoupeni-od-smlouvy-do-14-dnu-u-digitalniho-obsahu/,
https://www.noerr.com/en/insights/cancellation-button-in-online-sales,
https://www.williamfry.com/knowledge/world-consumer-rights-day-part-3-mandatory-withdrawal-button-coming-june-2026/,
https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-private-consumers.
Spreadshop: https://www.spreadshop.net/helpcenter/earning-money-with-spreadshop/your-margin/,
https://www.spreadshop.net/helpcenter/checkouts-in-your-shop/order-products-from-your-shop/,
https://www.spreadshop.com/helpcenter/promote-designs/using-promo-campaigns-properly/,
https://developer.spreadshirt.net/bin/view/API/Spreadshirt%20Public%20Shop%20API%20Documentation/,
https://www.spreadshop.net/legal-information/,
https://www.spreadshirt.co.uk/terms-C10183, https://docs.fourthwall.com/llms.txt,
https://api.spreadconnect.app/docs/. Platform policy:
https://transparency.meta.com/policies/community-standards/spam/,
https://developers.facebook.com/devpolicy/,
https://www.linkedin.com/legal/professional-community-policies. Gating patterns:
https://frontendmasters.com/free/, https://exercism.org/insiders,
https://www.codewars.com/subscription, https://brilliant.org/help/pricing-and-plans/what-s-the-difference-between-free-and-premium/.
