# devShark

An English developer-learning product from one React/Vite client and twelve
serverless handlers. devShark is freemium: every account gets HTML, CSS and
JavaScript, React levels 1 to 12 and a starter set of coding challenges, and
Premium (3.99 EUR a month or 39.99 EUR a year, VAT included) opens the rest.
`shared/tiers.ts` holds that split. The server owns answers, grading, scores,
XP and what each account may open. Until 25 September 2026 this summary said
all learning was free. StudyShark, which shared this code, moved to its own
repository (`lukaskourilcz/studyshark`) on 2026-09-24.

Content: 2,447 authored questions, 1,974 of them served, and 770 coding tasks,
116 of them on the free tier.

## Learning features

- Guided Learn paths with short levels, checkpoints, prerequisites, and **spaced
  mastery** — a level is "cleared" on its first pass and "mastered" only after
  three correct passes on three separate days.
- An auto-composed **"Today"** queue that folds carried-over work, due-for-review
  levels, and new material into one daily plan.
- Solo quizzes; a daily challenge; the survival Biggest Shark Challenge; live
  multiplayer and classroom rooms; and leaderboards.
- **Adaptive placement** that steps difficulty up and down over short rounds.
- Retention layer: **forgiving streaks** (two free protections a month, spent
  on a missed day or in advance as a 48-hour shield) and a read-only **study
  advisor**.
- A devShark **typing racer** and flashcards.
- Two optional devShark **learning paths**: the **Forward Deployed Engineer**
  role specialization, which sits on top of the Fullstack/Frontend/Backend
  track a learner already chose, and **DSA Foundations**, a focused skill path
  entered directly with no track, role or XP rank required. Both grade through
  the existing server sandbox, keep verified checks visibly apart from
  self-reviewed writing, and award no XP — so a task reused from the coding
  catalogue is never rewarded twice. Neither claims a certification.
- A devShark **Coding** section: 770 tasks across JavaScript, TypeScript, React,
  Algorithms and system design, labelled Easy, Medium or Hard, graded on the
  server (QuickJS sandbox, TypeScript compiler, an isolated Vercel Sandbox for
  React, sealed design keys), with authored hint ladders that end in
  documentation, coding tasks inside the Learn levels, and an optional **GitHub
  garden** that commits every passed task to the learner's own repository.
  Every graded task also carries a junior and a senior solution that open after
  a verified pass; fourteen evolving projects and fifteen short paths hold the
  multi-stage work, three of them debugging paths built on `console.log` and
  the habit of tracing before fixing; and a signed-in learner can shape a
  **challenge run** (track, count, order) and plan it for a date and time.
- **Premium and coins**: Premium opens every Learn topic, every coding task and,
  once their switches are on, the FDE and DSA paths. Coins, earned from verified learning, buy the crown
  and streak protections for every account and merchandise for Premium; an
  invite link pays both friends. Leaderboards rank the last 30 days by default.

## Tech stack

- **Client:** React + Vite + TypeScript, React Router, TanStack Query
- **API:** twelve Vercel serverless functions (TypeScript)
- **Payments:** Stripe Checkout, Billing and the Customer Portal through the server-side `stripe` package; no Stripe script in the browser
- **Design:** Astryx design system (`@astryxdesign/core` 0.1.6) with product CSS tokens in `client/src/styles/astryx-theme.css`
- **Testing/build:** TypeScript, launch tests, content contract, responsive checks
- **Coding runtime:** QuickJS (WebAssembly) sandbox on the server, the TypeScript
  compiler for type tests, CodeMirror in the browser, a self-hosted React harness

## Connected third parties

- **Supabase** — Postgres database, auth, and RLS; server-authoritative scores and grading.
- **GitHub App (the garden)** — optional; commits passed coding tasks to the learner's own repository through installation tokens. No user token is stored, and the learner can disconnect from the profile.
- **Stripe** — sells Premium through Checkout, Billing and the Customer Portal; under Managed Payments Stripe (as Link) is the seller of record. Off until `BILLING_ENABLED=true`. A payment changes which content an account may start, never grading or scores.
- **Spreadshop (sprd.net AG)** — prints, sells and ships devShark merchandise; the app links to the shop, the owner orders coin redemptions there, and the server reads its monthly promotion when `SPREADSHOP_API_KEY` is set.
- **Resend** — optional; sends the cancellation confirmation when `RESEND_API_KEY` is set.
- **Upstash Redis** — rate limiting on API endpoints.
- **Sentry** — client and server error monitoring.
- **PostHog** — product analytics.

## Key libraries

- `react-syntax-highlighter`, `devicon` — code and technology visuals (devShark).
- `quickjs-emscripten`, `typescript`, `@codemirror/*`, `sucrase`, `prettier` — coding grading, type checks, editor, React harness, formatting (devShark).
- `qrcode`, `motion` — sharing and restrained animation.
- `stripe` — server-side Checkout, portal, webhook signature checks and subscription sync.

## Marketing

devShark's marketing is produced outside this repository by **marketingShark**, a project inside
BoardlessAI (`lukaskourilcz/quorum`). It reads the question bank read-only as a pinned snapshot
and publishes one question a day, with its answer, as a Czech and an English carousel. No code
here changes, and nothing posts without a person approving it. See the README for what it does
and does not touch.
