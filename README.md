# DevQuiz

A web-development quiz app — 500+ multiple-choice questions across HTML, CSS,
JS, TS, React, Node.js, Git. Web (React) + iOS / Android (Flutter), one
backend (Vercel + Supabase + Auth0).

## Quickstart

```bash
# Web client + serverless API
npm install
cd client && npm install && cd ..
vercel dev   # http://localhost:3000

# Mobile (Flutter, requires a Mac for iOS)
cd mobile
flutter create --org com.devquiz --platforms ios,android,web .
flutter pub get
flutter run -d ios
```

## Documentation

Start with **[AGENTS.md](AGENTS.md)** — orientation for any AI agent or human
picking up this repo. It covers the layout, conventions, critical files, and
points at deeper docs:

- [docs/architecture.md](docs/architecture.md) — request flows, deployment topology
- [docs/api.md](docs/api.md) — every endpoint with request/response shapes
- [docs/schema.md](docs/schema.md) — tables, RLS, RPCs, migration order
- [docs/frontend-web.md](docs/frontend-web.md) — React app deep-dive
- [docs/frontend-mobile.md](docs/frontend-mobile.md) — Flutter app deep-dive
- [docs/auth.md](docs/auth.md) — Auth0 flow, JWT verification TODO, guest mode
- [docs/operations.md](docs/operations.md) — deploy, migrate, monitor, runbook

Web client docs: `client/` (no separate README — see `docs/frontend-web.md`).
Mobile setup: [mobile/README.md](mobile/README.md).

## Status

- ✅ Web app (Vercel)
- ✅ Mobile app source (Flutter — `flutter create` to scaffold native projects)
- ✅ Database schema (apply `supabase-schema.sql` then `002`–`006` in order)
- ⚠️ Server-side JWT verification — not yet implemented; see `docs/auth.md`

## License

Personal project — no license file. Ask before forking.
