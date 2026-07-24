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
  freezes), **server-synced badges** shown with their next goals, collectible
  cosmetic **Shark Cards**, and a read-only **study advisor**.
- A devShark **typing racer** and per-subject flashcards.

## Tech stack

- **Client:** React + Vite + TypeScript, React Router, TanStack Query
- **API:** twelve Vercel serverless functions (TypeScript)
- **Design:** Astryx design system, Tailwind-based tokens
- **Testing/build:** TypeScript, launch tests, responsive checks

## Connected third parties

- **Supabase** — Postgres database, auth, and RLS; server-authoritative scores and grading.
- **OpenAI-compatible provider** — optional, off-by-default post-answer explanations and Socratic Sharkira hints; capped by a shared daily budget and cached. Curated content stays authoritative and hints never reveal the answer.
- **Stripe** — optional support and cosmetic shop; never changes access or gameplay.
- **Upstash Redis** — rate limiting on API endpoints.
- **Sentry** — client and server error monitoring.
- **PostHog** — product analytics.

## Key libraries

- `react-syntax-highlighter`, `devicon` — code and technology visuals (devShark).
- `qrcode`, `motion` — sharing and restrained animation.
