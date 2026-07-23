# StudyShark + devShark

Two bilingual web-learning products from one React/Vite client and twelve
serverless handlers: **StudyShark** (geo, math, history, bio, chess, poker) and
the standalone **devShark** developer-learning sibling. All learning is free; the
server owns answers, grading, scores, and XP.

## Tech stack

- **Client:** React + Vite + TypeScript, React Router, TanStack Query
- **API:** twelve Vercel serverless functions (TypeScript)
- **Design:** Astryx design system, Tailwind-based tokens
- **Testing/build:** TypeScript, launch tests, responsive checks

## Connected third parties

- **Supabase** — Postgres database, auth, and RLS; server-authoritative scores and grading.
- **Anthropic Claude** — AI tutoring and explanation features.
- **OpenAI** — secondary AI provider for generation/tutoring.
- **Stripe** — optional support and cosmetic shop; never changes access or gameplay.
- **Upstash Redis** — rate limiting on API endpoints.
- **Sentry** — client and server error monitoring.
- **PostHog** — product analytics.

## Key libraries

- `react-syntax-highlighter`, `devicon` — code and technology visuals (devShark).
- `qrcode`, `motion` — sharing and restrained animation.
