# devShark Mobile (Expo / React Native)

A native iOS + Android client for **devShark**, built with **Expo (managed)** and
**Expo Router**. It reuses the existing backend unchanged — the same Vercel API
and Supabase project that power the web app.

It mirrors the web experience closely:

- **Learn** — the Duolingo-style learning paths across all **21 roadmap topics**,
  each split into **3 parts** with an end-of-part test, shown as a serpentine
  "snake" of levels, a level player with the 3-hearts lives system, and topic
  gating (starter paths + prereqs). Part-test progress is keyed the same way as
  web so the two clients interoperate in the shared account record.
- **Quiz** — solo quiz with XP rewards, account stats, question bookmarks, a
  report-a-question flow, and a daily-challenge shortcut.
- **Challenge** — the "Biggest Shark" 90-second time-attack (3 lives), paying out
  XP + tokens.
- **Play** — join a live web-hosted match by code, with a per-question timer.
- **Leaderboard** — All-time / Today / By-topic tabs.
- **Shop** — spend tokens on the Double-XP booster, avatar rings, title flairs,
  and instant learning-path unlocks.
- **Gamification** — a career ladder (XP → 10 ranks), achievements, a token
  wallet (with a 200-token signup bonus), and an XP toaster — all synced to the
  same account record the web app uses.
- **Streak** — a daily practice streak with a GitHub-style **garden**.
- **Settings** — light/dark/system theme, sound & haptics, language (en/cs),
  learning track.

Branding is the shark-fin **devShark** identity, with light/dark theming.

It also ships a native **iOS Home Screen widget** (WidgetKit/SwiftUI) that shows
the streak + garden, fed by the app through a shared App Group.

> **Sound:** the web plays short WebAudio tones; React Native has no tone
> synthesiser without bundled audio assets, so on mobile the "sound effects"
> setting drives **haptic** feedback instead.

## What's reused vs. rewritten

| Layer | Status |
|---|---|
| Vercel API (`/api/*`), Supabase DB, RLS, RPCs | **Reused as-is** (no changes) |
| Auth (Supabase Google OAuth) | Reused via `supabase-js` + PKCE on native |
| Types, category data, abbreviations data | Ported (mostly verbatim) |
| UI (MUI, React Router, CSS) | **Rewritten** in React Native components |

## Project layout

```
mobile/
├── app/                      # Expo Router (file-based routes)
│   ├── _layout.tsx           #   providers + storage hydration + XP toaster
│   ├── lesson.tsx            #   → Lesson player (level / part test, hearts)
│   ├── home.tsx              #   → Home / hub (landing)
│   ├── challenge.tsx         #   → Biggest Shark time-attack
│   ├── shop.tsx              #   → Token shop
│   ├── settings.tsx          #   → Settings (theme, sound, language, track)
│   ├── flashcards.tsx        #   → Saved cards
│   └── (tabs)/               #   bottom tab navigator
│       ├── _layout.tsx
│       ├── index.tsx         #   → Learn (the learning paths)
│       ├── streak.tsx        #   → Streak + garden
│       ├── quiz.tsx          #   → Quiz
│       ├── play.tsx          #   → Play (join a live match)
│       ├── leaderboard.tsx   #   → Leaderboard
│       └── account.tsx       #   → Account / profile hub
├── src/
│   ├── lib/                  # api, auth, storage/store adapters, roadmapProgress
│   │                         #   (parts + gating + sync), xp, leveling, tokens,
│   │                         #   shop, achievements, settings, bookmarks, colorMode
│   ├── screens/              # Learn / Lesson / Quiz / Challenge / Shop / Home / …
│   ├── components/           # SharkFin, RoadmapPath, XpToaster, ReportDialog, ui
│   ├── theme.ts              # brand palette (green/ocean/gold/coral, light/dark)
│   └── types.ts              # domain types mirroring the API
├── modules/devquiz-widget/   # local Expo module: App Group bridge (Swift)
└── targets/widget/           # WidgetKit extension (SwiftUI) via @bacons/apple-targets
```

## Setup

> Run everything from inside `mobile/` — it's an independent app with its own
> `node_modules`.

1. **Install deps**
   ```bash
   cd mobile
   npm install
   npx expo install --fix   # aligns native deps to your Expo SDK
   ```
2. **Environment** — copy `.env.example` to `.env` and fill in:
   - `EXPO_PUBLIC_API_BASE_URL` — your deployed Vercel domain (or your LAN IP
     `http://192.168.x.x:3000` for local dev; a phone can't reach `localhost`).
   - `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — same values as
     the web app's `VITE_SUPABASE_*`.
3. **Supabase redirect URLs** — in Supabase → Authentication → URL Configuration,
   add the app's OAuth redirect(s) to the allow-list:
   - Dev in Expo Go: the URL printed by `Linking.createURL('auth-callback')`
     (looks like `exp://…/--/auth-callback`).
   - Production build: `devquiz://auth-callback` (the `scheme` in `app.json`).

## Run

```bash
npm start          # then press i / a, or scan the QR with Expo Go
```

> Google OAuth uses an in-app browser + deep link. It works in **Expo Go** for
> development; for a production-feeling flow use a **dev build**
> (`npx expo run:ios`). The quiz, leaderboard, and abbreviations all work
> without signing in.

## Home Screen widget (streak garden)

The widget is a native **WidgetKit/SwiftUI** extension (`targets/widget`), wired
up by [`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets)
during prebuild. The app writes a streak/garden snapshot to a shared **App
Group** via the local module in `modules/devquiz-widget`, and the widget reads
the same key.

> Widgets need native code, so they only run in a **dev build / EAS build** —
> not Expo Go.

**Before building, set your own identifiers in four places (they must match):**

1. `app.json` → `ios.bundleIdentifier` and `ios.entitlements["com.apple.security.application-groups"]`
2. `targets/widget/expo-target.config.js` → `entitlements` App Group
3. `targets/widget/index.swift` → `APP_GROUP`
4. `modules/devquiz-widget/ios/DevquizWidgetModule.swift` → `appGroup`

Use `com.<you>.devquiz` for the bundle id and `group.com.<you>.devquiz` for the
App Group. Then:

```bash
cd mobile
npm install
npx expo prebuild --clean      # generates ios/ incl. the widget target + App Group
# add the DevQuiz widget to your simulator/device Home Screen to see it
```

The app refreshes the widget after every completed lesson (and on launch).

## Ship to the App Store (EAS)

You need an **Apple Developer Program** membership ($99/yr) and a free **Expo**
account. No Mac required — EAS builds in the cloud.

```bash
npm i -g eas-cli
eas login
eas build --platform ios --profile production   # builds .ipa (incl. the widget)
eas submit --platform ios --profile production   # uploads to App Store Connect
```

Fill in the placeholders in `eas.json` (`appleId`, `ascAppId`, `appleTeamId`)
and set the same `EXPO_PUBLIC_*` values as **EAS environment variables** so the
production build points at your live API. Then in **App Store Connect** add
screenshots, description, and privacy details, and submit for review.

## Status / what's verified

- **Verified here:** TypeScript/React-Native code for the Learn paths, lesson
  player with hearts, streak, garden, and progress sync (JS typechecks).
- **Needs a native build to verify:** the WidgetKit extension and the App Group
  bridge (Swift) — they're code-complete and conventional, but can only be
  compiled/tested via `expo prebuild` + Xcode/EAS, which needs your Apple
  account. Expect to tweak signing and the App Group id for your team.

## Parity notes

Most of the web surface is now present on mobile (Learn with parts, Quiz, Play,
Leaderboard, Challenge, Shop, gamification, streak/garden, flashcards, settings,
Czech strings). A few things remain web-only by design:

- **Hosting/controlling** a multiplayer match (mobile joins by code; the host UI
  and classroom live-distribution stay on the web). Mobile syncs match state by
  polling rather than the web's realtime broadcast.
- The **/dev admin console** (questions editor, triage, flags) — an
  owner-only web surface.
- The **skill-check assessment** that bulk-unlocks topics.
- Real audio (mobile uses haptics for answer feedback).

The offline question bundle (`src/data/offline-data.ts`) is generated by
`scripts/generate-mobile-offline.ts`; regenerate it after any question/roadmap
change so the offline path doesn't drift.
