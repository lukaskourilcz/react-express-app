# NEEDED — manual steps from you

Everything in this change works **as-is with no action** — every new integration
degrades gracefully (no Upstash env → in-memory rate limiting as before; no real
art → brand-green placeholders). This file lists the optional things *you* do to
finish each one. Nothing here blocks the deploy.

Grouped by the catalogue tool each item came from.

---

## 1. Upstash — distributed rate limiting (High)

**Status without you:** rate limiting still runs, but on the old in-memory
limiter (not shared across serverless instances).

**To enable the distributed limiter:**

1. Create a free Redis database at <https://upstash.com> (pick a region near
   your Vercel functions).
2. Vercel → Project → Settings → Environment Variables, add:

   | Name | Value |
   | --- | --- |
   | `UPSTASH_REDIS_REST_URL` | from the Upstash console (REST section) |
   | `UPSTASH_REDIS_REST_TOKEN` | from the Upstash console (REST section) |

3. Redeploy. `lib/rate-limit.ts` auto-detects the vars and switches the
   `report`, `challenge` and `admin-gate` endpoints to a sliding-window limit in
   Redis. If a Redis call ever fails, it falls back to in-memory for that
   request — it never hard-fails an endpoint on the limiter.

> The same Upstash Redis is the natural place to later cache the ~1.9 MB
> question bank that's re-parsed on every cold start (documented in
> `SETUP_AND_RECOMMENDATIONS.md`) — not done here, but the client is now wired.

---

## 2. Uptime monitoring — UptimeRobot / Better Stack (High)

**Enabler shipped:** `/api/health` now returns **503** (not 200) when Supabase is
configured but unreachable, so a dumb HTTP monitor detects real downtime.
Previously it always returned 200 and downtime looked healthy.

**To monitor it:**

1. **UptimeRobot** (<https://uptimerobot.com>, 50 free monitors) *or* **Better
   Stack** (<https://betterstack.com>, nicer status pages/incidents): add an
   HTTP(S) monitor on `https://<your-domain>/api/health`, alert on any non-2xx.
2. Optional: a second keyword monitor asserting the body contains
   `"supabase":"ok"`.

No code or env needed — pure dashboard setup.

---

## 3. App icons, splash & OG image — Recraft / Ideogram (High, iOS-blocking)

**Status without you:** every icon/splash/OG path resolves to a **solid
brand-green placeholder PNG** (so the web app, PWA install, and EAS build all
work, and social embeds don't 404). They're not real artwork yet.

`LAUNCH.md` lists real icons/splash as an **App Store submission blocker** — this
is the step that unblocks it.

**To finish:**

1. Generate the **StudyShark shark mascot** with **Recraft** (<https://recraft.ai>
   — native SVG/app-icon output, best fit) or **Ideogram**
   (<https://ideogram.ai> — great if you want text in the mark).
2. Export and **overwrite these files in place, keeping the exact names & sizes**:

   | File | Size | Purpose |
   | --- | --- | --- |
   | `client/public/icon.svg` | vector | favicon + PWA (source of truth) |
   | `client/public/apple-touch-icon.png` | 180×180 | iOS home-screen (web) |
   | `client/public/icon-192.png` / `icon-512.png` | 192, 512 | PWA / maskable |
   | `client/public/og-image.png` | 1200×630 | social share card |
   | `mobile/assets/icon.png` | 1024×1024 | native app icon |
   | `mobile/assets/adaptive-icon.png` | 1024×1024 | Android adaptive |
   | `mobile/assets/splash.png` | 1284×1284 | launch splash |
   | `mobile/assets/favicon.png` | 48×48 | Expo web |

   (`node scripts/gen-placeholder-assets.mjs` regenerates the placeholders if you
   ever need them back.)

3. **Still your call** (not touched here, from `LAUNCH.md`): set a real iOS
   **bundle identifier** and Android **package** in `mobile/app.json` (currently
   the placeholder `com.yourcompany.devquiz`), plus Sign in with Apple, the
   privacy manifest, and EAS credentials. The display name is already fixed to
   **StudyShark** (was "DevQuiz").

---

## 4. Performance measurement — PageSpeed / DebugBear (Medium)

No code — run the deployed URL through these and act on what they flag (your
docs already list prism-light, immutable asset caching, bundle regressions):

- **PageSpeed Insights** — <https://pagespeed.web.dev> (Core Web Vitals + field data)
- **DebugBear free tools** — <https://www.debugbear.com/tools> (best free LCP breakdown)

---

## 5. iOS UI reference — Mobbin (Medium)

No code — browse <https://mobbin.com> for real education/quiz app screens when
you do the iOS redesign and the "chalkboard home cards" idea in
`dashboard-notes.md`.

---

## 6. Optional: the 12/12 Vercel function ceiling — Cloudflare Workers

You're at Hobby's 12-function cap. If you add endpoints, **Cloudflare Workers &
Pages** (<https://workers.cloudflare.com>) is where to offload — and Pages allows
**commercial** use on its free tier, which Vercel Hobby does not (relevant if
StudyShark monetises).

---

### Summary of what shipped in code (no action needed)

- `lib/rate-limit.ts` — `enforceRateLimit()` with Upstash backend + graceful
  in-memory fallback; wired into report / challenge / admin-gate.
- `api/health.ts` — 503 on Supabase-down (+ `Retry-After`).
- `client/index.html` + `client/public/manifest.webmanifest` — PWA manifest,
  apple-touch-icon, OG/Twitter image tags.
- `mobile/app.json` — display name → StudyShark, icon/splash/adaptive-icon wired.
- Placeholder PNGs + `scripts/gen-placeholder-assets.mjs`.
