# StudyShark + devShark

Two bilingual web-learning products from one React/Vite client and twelve
serverless handlers: **StudyShark** (geo, math, history, bio, chess, poker) and
the standalone **devShark** developer-learning sibling. All learning is free; the
server owns answers, grading, scores, and XP.

## Learning features

- Guided Learn paths with short levels, checkpoints, prerequisites, and **spaced
  mastery** — a level is "cleared" on its first pass and "mastered" only after
  three correct passes on three separate days.
- An auto-composed **"Today"** queue that folds carried-over work, due-for-review
  levels, and new material into one daily plan, and grants a cosmetic card pack
  when finished.
- Solo quizzes with an optional Socratic **Sharkira** hint coach; a daily
  challenge; the survival Biggest Shark Challenge; live multiplayer and classroom
  rooms; and subject-scoped leaderboards.
- **Adaptive placement** that steps difficulty up and down over short rounds.
- Retention layer: **forgiving streaks** (configurable off-days + two monthly
  freezes), collectible cosmetic **Shark Cards**, and a read-only **study
  advisor**.
- A devShark **typing racer** and per-subject flashcards.
- A devShark **Coding** section: 245 tasks across JavaScript, TypeScript, React,
  and system design, graded on the server (QuickJS sandbox, TypeScript compiler,
  sealed design keys), with authored hint ladders that end in documentation,
  coding tasks inside the Learn levels, a short review ladder, coding badges,
  and an optional **GitHub garden** that commits every passed task to the
  learner's own repository.

## Tech stack

- **Client:** React + Vite + TypeScript, React Router, TanStack Query
- **API:** twelve Vercel serverless functions (TypeScript)
- **Design:** Astryx design system, Tailwind-based tokens
- **Testing/build:** TypeScript, launch tests, content contract, responsive checks
- **Coding runtime:** QuickJS (WebAssembly) sandbox on the server, the TypeScript
  compiler for type tests, CodeMirror in the browser, a self-hosted React harness

## Connected third parties

- **Supabase** — Postgres database, auth, and RLS; server-authoritative scores and grading.
- **OpenAI-compatible provider** — StudyShark only: optional, off-by-default post-answer explanations and Socratic Sharkira hints; capped by a shared daily budget and cached. Curated content stays authoritative and hints never reveal the answer. devShark has no AI feature.
- **GitHub App (devShark garden)** — optional; commits passed coding tasks to the learner's own repository through installation tokens. No user token is stored, and the learner can disconnect from the profile.
- **Stripe** — optional support and cosmetic shop; never changes access or gameplay.
- **Upstash Redis** — rate limiting on API endpoints.
- **Sentry** — client and server error monitoring.
- **PostHog** — product analytics.

## Key libraries

- `react-syntax-highlighter`, `devicon` — code and technology visuals (devShark).
- `quickjs-emscripten`, `typescript`, `@codemirror/*`, `sucrase`, `prettier` — coding grading, type checks, editor, React harness, formatting (devShark).
- `qrcode`, `motion` — sharing and restrained animation.

## Marketing

devShark's marketing is produced outside this repository by **marketingShark**, a project inside
BoardlessAI (`lukaskourilcz/quorum`). It reads the question bank read-only as a pinned snapshot
and publishes one question a day, with its answer, as a Czech and an English carousel. No code
here changes, and nothing posts without a person approving it. See the README for what it does
and does not touch.
