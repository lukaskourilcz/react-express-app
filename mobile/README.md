# DevQuiz Mobile (Expo / React Native)

A native iOS + Android client for DevQuiz, built with **Expo (managed)** and
**Expo Router**. It reuses the existing backend unchanged — the same Vercel API
and Supabase project that power the web app.

It includes the **Learn** experience ported from the web: the Duolingo-style
learning paths (6 topics — JavaScript, TypeScript, React, HTML, CSS, Git) shown
as a serpentine "snake" of levels and checkpoints, a level player with the
3-hearts lives system, a daily **streak** with a GitHub-style practice
**garden**, plus the solo Quiz, Leaderboard, and Account. Progress is stored
locally and synced to the same account record the web app uses.

It also ships a native **iOS Home Screen widget** (WidgetKit/SwiftUI) that shows
the streak + garden, fed by the app through a shared App Group.

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
│   ├── _layout.tsx           #   providers + root stack
│   ├── lesson.tsx            #   → Lesson player (level/checkpoint, hearts)
│   └── (tabs)/               #   bottom tab navigator
│       ├── _layout.tsx
│       ├── index.tsx         #   → Learn (the learning paths)
│       ├── streak.tsx        #   → Streak + garden
│       ├── quiz.tsx          #   → Quiz
│       ├── leaderboard.tsx   #   → Leaderboard
│       └── account.tsx       #   → Account (sign in/out)
├── src/
│   ├── lib/                  # supabase, api, auth, quizApi, roadmapApi,
│   │                         #   roadmapProgress, streak, widget, categories
│   ├── screens/              # Learn / Lesson / Streak / Quiz / …
│   ├── components/           # RoadmapPath, Hearts, Garden, QuestionText, ui
│   ├── theme.ts              # brand palette (light/dark)
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

## Not yet ported (easy to add next)

- Account sync of the streak/garden (currently local + widget; the roadmap
  *progress* already syncs).
- **Play** (multiplayer) and **Flashcards** screens.
- Czech (`cs`) strings for the mobile UI.
