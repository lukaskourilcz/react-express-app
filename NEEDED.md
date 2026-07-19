# NEEDED — manual steps from you

Everything in this change works **as-is with no action** — every new integration
degrades gracefully (no Upstash env → in-memory rate limiting as before; no real
art → brand-green placeholders). This file lists the optional things *you* do to
finish each one. Nothing here blocks the deploy.

Grouped by the catalogue tool each item came from.

---

## Tasks

Each task has a one-line "why" and an importance score `[imp:N]` (5 = highest).
Full how-to is in the numbered sections below.

- [x] **Finish + verify the "Deep End v2" redesign** — all supplied production screens now use the handoff composition; signed-in data states still require normal backend smoke testing after deploy. See §0. `[imp:5]`
- [ ] **Generate real app icons, splash & OG image** — placeholders ship now; real artwork is an App Store submission blocker. `[imp:4]`
- [ ] **Set the real iOS bundle id / Android package + EAS credentials** — still the `com.yourcompany.devquiz` placeholder, blocks a real build. `[imp:4]`
- [ ] **Add an uptime monitor on `/api/health`** — the endpoint now returns 503 on real downtime; nothing watches it yet. `[imp:3]`
- [ ] **Enable the Upstash distributed rate limiter** — in-memory limiting isn't shared across serverless instances today. `[imp:2]`
- [ ] **Launch standalone devShark as a second Vercel project** — optional; ships coded and is a no-op on StudyShark. `[imp:2]`
- [ ] **Run PageSpeed / DebugBear on the deployed URL** — measure Core Web Vitals before spending effort on perf tweaks. `[imp:2]`
- [ ] **Browse Mobbin for iOS quiz-app references** — inspiration for the planned iOS redesign; no code. `[imp:1]`
- [ ] **Offload endpoints to Cloudflare Workers if you outgrow Vercel's 12-function cap** — only relevant when you add more endpoints. `[imp:1]`

---

## 0. Design-system redesign "Deep End v2" — finish & verify (resume here)

Applies the new **Deep End v2** design system from the Google Drive handoff
(folder `1R3iDvrUDanVkpGuEdIxTtFAyNcGtjJ4L`; the `.dc.html` files are the pixel
references). The rules are codified in **`DESIGN_RULES.md`** (fin baseline,
per-subject accent swap, fade-in-only fin reveals, wave-variation,
reduced-motion). Shared building blocks:

- `client/src/components/landing/LandingKit.tsx` — `Kicker`, `Fin`, `finBg`,
  `StatItem`, `FadeFinCta`, `SwimCta`, `SampleCard`, `CheckpointNode`, `pathWave`.
- `client/src/components/SharkFin.tsx` — `WaterlineProgress` (fin-marker bar),
  `SharkFin`, `Waterline`.
- `client/src/lib/landingTopics.ts` — featured-topic data (real Level-1
  questions + level names) for all 7 subjects.

**Done & verified (screenshot + build):**

- `Home.tsx` — per-subject editorial landing (hero + interactive sample
  question + topic fin-schools + "Inside <Topic>" preview + feature strip +
  pledge + family line). Re-skins across all 7 subjects.
- `SubjectPicker.tsx` — the umbrella "studyShark Landing v2" (subjects as the
  picker cards; live preview re-skins per subject).
- `Quiz.tsx` — setup stage (kicker/heading/pills/swim CTA + ghost fin,
  screenshot-verified); in-progress waterline fin-marker progress + results
  score card (build-verified only — see below).

**Completed — restyled to each `.dc.html` while preserving application logic:**

- [x] `Roadmap.tsx` (`/learn`) — the snaking "journey" path: kicker `Learn` +
  "Your learning journey.", topic rail with per-topic `N/M levels`, nodes
  (done `✓` / current ringed+pulse+bobbing-fin / locked muted), varied wave
  connectors, gold checkpoints at each row turn, "Continue — Level N" swim CTA.
- [x] `Profile.tsx` — identity card (avatar ring, level badge, rank, XP bar),
  stat tiles, per-category accuracy bars, achievements (earned vs 55%-locked),
  settings rows.
- [x] `Play.tsx` — mode cards (Free-for-all / Head-to-head / Classroom),
  per-question time-limit pills, Create-match CTA, join-by-code panel.
- [x] `CareerRoadmap.tsx` (`/roadmap`) — Frontend/Backend/Fullstack picker +
  4-stage ladder ending in the gold "Senior-ready" node.
- [x] `Flashcards.tsx` (`/cards`) — saved-cards **grid** with tap-to-flip
  reveal + "Practice all N" swim CTA (today it's a single-card flip-through).
- [x] `Challenge.tsx` — editorial challenge stat row and top-5
  board. **Keep** the per-question countdown bar as a plain bar — the fin-marker
  progress is only for forward progress, never a shrinking timer.

**Why these are unfinished:** each renders its main state only with the backend
(`vercel dev` + Supabase) and a signed-in user, which the web sandbox can't run —
so they couldn't be screenshot-verified here. **Tomorrow, once the backend is
wired:** run the full stack, sign in, and drive + screenshot each state as it's
restyled. Reuse the LandingKit + `WaterlineProgress` primitives; keep every new
string as an i18n key in `translations.ts` **and** `translations.cs.ts`.

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

## 7. Standalone devShark — second Vercel project (High, dashboard-only)

**Status without you:** the standalone mode is fully coded and is a **no-op on
StudyShark** (the existing deploy is untouched — still the full subject picker,
Web Dev included). To actually get the separate **devShark** site live, you
create one more Vercel project. No code changes needed.

**How the mode works:** the same repo, deployed a second time, reads two env
vars. `VITE_LOCK_SUBJECT` locks the whole app to one subject (no picker, no
switcher, no `/subjects` route, and the wordmark becomes that subject's
standalone brand — `devShark`). `VITE_SIBLING_URL` makes the Profile show an
"Explore the other Shark platforms →" link back to StudyShark.

**To launch devShark:**

1. **Vercel → Add New → Project**, and import the **same** `react-express-app`
   repo again (deploy from the same branch you use for StudyShark). This is a
   separate Vercel project — it does **not** replace the StudyShark one.
2. Give the new project these Environment Variables:

   | Name | Value |
   | --- | --- |
   | `VITE_LOCK_SUBJECT` | `webdev` |
   | `VITE_SIBLING_URL` | `https://<your-studyshark-domain>` |
   | `VITE_SUPABASE_URL` | same value as StudyShark (shared backend/data) |
   | `VITE_SUPABASE_ANON_KEY` | same value as StudyShark |
   | `SUPABASE_SERVICE_ROLE_KEY` | same value as StudyShark |
   | `SESSION_SECRET` | same value as StudyShark |

   Copy any other env vars you set on StudyShark (PostHog, Sentry, Upstash,
   `DEV_PASSWORD`, `OWNER_EMAIL`, …) so the two sites behave identically apart
   from the lock.
3. Add a domain to the new project (e.g. `devshark.<your-domain>`) and deploy.
4. **Leave the StudyShark project unchanged** — set neither `VITE_LOCK_SUBJECT`
   nor `VITE_SIBLING_URL` there, so it stays the full 7-subject picker.

**Later — more standalone sites:** repeat with a different `VITE_LOCK_SUBJECT`
(`geography`, `math`, `history`, `chess`, `biology`, `poker`) to spin up
`geoShark`, `mathShark`, etc. Each is just another Vercel project + domain on
the same repo — no code changes.

> Valid `VITE_LOCK_SUBJECT` ids: `webdev`, `geography`, `math`, `history`,
> `chess`, `biology`, `poker`. An invalid/empty value simply falls back to the
> full StudyShark picker.
