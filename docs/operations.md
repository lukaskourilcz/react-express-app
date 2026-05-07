# Operations

How to run, deploy, monitor, and unstick this app in production.

## Local development

```bash
# Install everything (root + client; mobile is separate)
npm install
cd client && npm install && cd ..

# Run web client + Vercel API together
vercel dev   # serves on http://localhost:3000

# Or web client only (no API)
cd client && npm run dev

# Mobile (after one-time Mac setup, see mobile/README.md)
cd mobile
flutter run -d ios \
  --dart-define=API_BASE_URL=http://localhost:3000
```

### Required env (Vercel project settings)

| Var | Where used | Note |
| --- | --- | --- |
| `SESSION_SECRET` | Server (api/) | **Required in production**. 32+ random bytes. |
| `VITE_SUPABASE_URL` | Client + Server | Public. |
| `VITE_SUPABASE_ANON_KEY` | Client + Server | Public, gated by RLS. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Server (fallback) | Same values as above; the API checks both names. |
| `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` | Client | Optional — without these, sign-in is disabled and the app runs in degraded mode. |
| `VITE_AUTH0_AUDIENCE` | Client | Optional but recommended — issued tokens carry this audience. |
| `AUTH0_DOMAIN` | Server | **Set this to enforce JWT verification.** Without it the API trusts `auth0_id` from the request body (degraded mode). |
| `AUTH0_AUDIENCE` | Server | Optional — verifies that incoming tokens have this audience. |
| `SENTRY_DSN` | Server | Enables Sentry error tracking on Vercel functions. |
| `VITE_SENTRY_DSN` | Client | Enables Sentry on the web client. |

## Deploying

### Web + API
Push to the configured branch on GitHub. Vercel auto-builds and deploys. The
`vercel.json` config sets:
- `buildCommand: cd client && npm install && npm run build`
- Function `maxDuration: 10` seconds
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- SPA rewrite (`/((?!api/).*) → /index.html`)

### Database migrations
Apply each `supabase-schema-NNN.sql` in the Supabase SQL editor in order.
Most are idempotent (use `IF NOT EXISTS`); the one exception is migration
002 which drops the open RLS policies from migration 001 — only run it
once, but if you do it's still re-runnable thanks to `DROP POLICY IF
EXISTS`.

After applying all six:
```sql
-- Smoke test:
SELECT COUNT(*) FROM user_stats;
SELECT * FROM record_quiz_result('test|smoke', 5, 10);
SELECT * FROM global_leaderboard(10);
SELECT * FROM category_leaderboard('javascript', 50, 5);
```

### Mobile (Flutter)
Mobile is not auto-deployed. Build IPA from a Mac:

```bash
cd mobile
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://devquiz.vercel.app \
  --dart-define=SUPABASE_URL=https://xxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=… \
  --dart-define=AUTH0_DOMAIN=your-tenant.auth0.com \
  --dart-define=AUTH0_CLIENT_ID=…
open build/ios/archive/Runner.xcarchive
```

Then submit through Xcode → Organizer → Distribute App.

## Monitoring

### What's instrumented
- **Vercel function logs**: every `api/` handler emits one JSON log line per request via `console.log(JSON.stringify({ ts, route, status, latency_ms, … }))`. View at <https://vercel.com/your-org/your-project/logs>.
- **Supabase dashboard**: Database → Reports for query throughput; Database → Query Performance for slow queries.
- **Browser**: client-side errors hit the React `ErrorBoundary` and `console.error`. There's no remote sink.
- **Mobile**: `debugPrint` only. No crash reporting.

### What's not yet wired
- ⚠️ **Sentry** is integrated but conditional on env vars. Set `VITE_SENTRY_DSN` (web), `SENTRY_DSN` (server), and `--dart-define=SENTRY_DSN=…` (mobile) to enable. The SDKs are no-ops without a DSN.
- ❌ **Uptime monitoring** — Vercel sends alerts on function errors but there's no synthetic ping. Add an UptimeRobot or BetterUptime check on `/api/leaderboard?period=global&limit=1`.
- ❌ **Real-user metrics** (Web Vitals) — no analytics installed.

## Sentry — already wired, needs DSNs

The SDK is initialised in three places, all conditional on env vars:

- **Web** — `client/src/main.tsx` reads `VITE_SENTRY_DSN`. The existing
  root `ErrorBoundary` forwards exceptions to `Sentry.captureException`.
- **Server (Vercel)** — `lib/observability.ts` exports `withSentry()` which
  wraps every handler. Reads `SENTRY_DSN` (set in Vercel project env).
- **Mobile** — `mobile/lib/main.dart` initialises `SentryFlutter` when
  `--dart-define=SENTRY_DSN=…` is provided.

To enable: create three Sentry projects (web / api / mobile) in your Sentry
org, copy each DSN into the corresponding env var, and redeploy. With no
DSN set, all three runtimes silently no-op.

Auth tokens and user IDs are stripped from breadcrumb URLs in all three
runtimes (`token=`, `auth0_id=`, `sub=` query params are redacted before
events are sent).

## Common failures and runbook

### "Function timed out" in Vercel logs
- Check Supabase Database → Query Performance for the slow query.
- The API uses `withTimeout` (5s) around every Supabase call, so this is unusual unless the Supabase project is overloaded or the network between Vercel and Supabase is misbehaving.
- Mitigation: temporarily bump `maxDuration` in `vercel.json` (max 60s on Hobby).

### `503 rpc_missing` from `/api/user/stats`
- A migration hasn't been applied. Apply 002.

### `503 rpc_missing` from `/api/leaderboard?period=category`
- Migration 005 missing.

### `400 invalid_session` from `/api/quiz/submit`
- The session token expired (1 hour TTL) or the client is sending a forged/corrupted token.
- Real cause is usually that `SESSION_SECRET` was rotated between when the user fetched questions and submitted. Don't rotate `SESSION_SECRET` while users have active sessions.

### Live multiplayer feels laggy / stuck
- Check whether Supabase Realtime is enabled in the project (Project → Realtime). Without it, clients fall back to 4s polling, which is functional but slow.
- Verify the `match:<code>` channel is being broadcast on (Supabase dashboard → Realtime).

### Ghost matches
- A host disconnected and the match is stuck in `running`.
- The next call to `/api/play/state` will auto-finish if `last_heartbeat_at` is older than 5 minutes. If it's stuck longer, manually `UPDATE matches SET status='finished', ended_at=NOW() WHERE id=...`.

### Auth0 sign-in fails silently
- Check the browser console for `Auth0Provider` warnings.
- Verify the deployed origin is in the Auth0 application's *Allowed Callback URLs* and *Allowed Web Origins*.

### Pyodide download fails
- Open browser dev tools, look for blocked requests to `cdn.jsdelivr.net`.
- The CSP in `vercel.json` allows `cdn.jsdelivr.net` for `script-src` and `connect-src`. If you've customized the CSP, make sure these are still present.

## Rolling back

Vercel: **Deployments** tab → pick the previous green deploy → *Promote to Production*. Instant.

Database: there's no automatic rollback. If a migration broke something, write a forward-fix as `supabase-schema-NNN+1.sql` that undoes the bad change. Do not edit historical files.

## Cost notes

- Vercel Hobby: free for personal use, limits: 12 functions, 100 GB bandwidth/month, 100 GB-hr serverless execution. Currently we use 7 functions; bandwidth and execution scale with users.
- Supabase free tier: 500 MB database, 2 GB bandwidth, 50K monthly active users on Auth (we don't use Supabase Auth — using Auth0 — so the auth limit doesn't matter), 5 GB Realtime concurrency.
- Auth0 free tier: 7,500 MAU, unlimited social connections.
- Apple Developer: $99/year to ship to App Store.

For an indie app with a few thousand MAU, total monthly cost is essentially $99/12 + $0.

## Things that should exist but don't

In rough priority order:
1. **An automated test suite**. Right now we rely on `tsc -b` passing and `npm run build` succeeding. There's a security audit + UX audit + perf audit harness via the Claude subagents, but no Jest / Vitest / Playwright.
2. **Supabase migration tooling** (`supabase db push` via the CLI).
3. **Health-check endpoint** at `/api/health` for uptime monitoring.

Recently closed:
- ✅ JWT verification on the server (`lib/auth.ts`, env-gated by `AUTH0_DOMAIN`).
- ✅ Sentry across web / API / mobile (env-gated by DSN vars).
