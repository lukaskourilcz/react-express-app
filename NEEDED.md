# NEEDED — DevQuiz to-do list

Everything works **as-is with no action** — every integration degrades
gracefully. Each task carries an importance score `[imp:N]` (1–5, 5 = highest).
This file is parsed into the OwnDashboard **Úkoly** section, where you can filter
tasks by that priority.

> **Mobile (iOS/Expo) is deferred.** All mobile-app tasks have been removed on
> purpose — the native app will be built only once the web interface is fully
> complete. This list is **web/API only**.

## Tasks

- [ ] **Smoke-test the redesigned signed-in screens after deploy** — Roadmap, Profile, Play, Challenge, and Flashcards render their main state only with the backend + a signed-in user, which the sandbox couldn't run. `[imp:3]` `[owner:me]`
- [ ] **Generate real web icons + OG share image** — `client/public/icon.svg`, `apple-touch-icon.png`, `icon-192/512.png`, `og-image.png` all ship as brand-green placeholders. `[imp:3]` `[owner:me]`
- [ ] **Add an uptime monitor on `/api/health`** — it now returns 503 on real downtime; nothing watches it yet. `[imp:3]` `[owner:me]`
- [ ] **Enable the Upstash distributed rate limiter** — add `UPSTASH_REDIS_REST_URL` + `_TOKEN`; in-memory limiting isn't shared across serverless instances today. `[imp:2]` `[owner:me]`
- [ ] **Launch standalone devShark as a second Vercel project** — same repo, `VITE_LOCK_SUBJECT=webdev` + `VITE_SIBLING_URL`; a no-op on StudyShark. `[imp:2]` `[owner:me]`
- [ ] **Run PageSpeed / DebugBear on the deployed URL** — measure Core Web Vitals before spending effort on perf tweaks. `[imp:2]` `[owner:me]`
- [ ] **Offload endpoints to Cloudflare Workers if you outgrow Vercel's 12-function cap** — only relevant when you add more endpoints (and Pages allows commercial use on its free tier). `[imp:1]` `[owner:me]`

## Details

**Web icons + OG** — generate the shark mark with **Recraft** (<https://recraft.ai>,
native SVG/app-icon output) or **Ideogram** (<https://ideogram.ai>), then
overwrite in place (keep names & sizes): `client/public/icon.svg` (vector,
source of truth), `apple-touch-icon.png` (180×180), `icon-192.png` / `icon-512.png`
(PWA/maskable), `og-image.png` (1200×630). `node scripts/gen-placeholder-assets.mjs`
regenerates the placeholders.

**Upstash** — create a free Redis DB (<https://upstash.com>), add the two REST
vars in Vercel, redeploy. `lib/rate-limit.ts` auto-detects them and switches the
`report` / `challenge` / `admin-gate` endpoints to a Redis sliding-window limit,
falling back to in-memory if a Redis call fails.

**Uptime** — add an HTTP monitor on `https://<your-domain>/api/health` (alert on
any non-2xx) via UptimeRobot (<https://uptimerobot.com>) or Better Stack; an
optional keyword monitor can assert the body contains `"supabase":"ok"`.

**Standalone devShark** — Vercel → Add New → Project → import the **same** repo
again (separate project). Set `VITE_LOCK_SUBJECT=webdev` and
`VITE_SIBLING_URL=https://<studyshark-domain>`, plus the same Supabase / session
env vars as StudyShark, and add a domain (e.g. `devshark.<domain>`). Leave the
StudyShark project's lock vars unset so it stays the full picker. Repeat with
other `VITE_LOCK_SUBJECT` ids (`geography`, `math`, `history`, `chess`,
`biology`, `poker`) for more standalone sites.
