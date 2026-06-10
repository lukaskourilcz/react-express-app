# DevQuiz Mobile (Expo / React Native)

A native iOS + Android client for DevQuiz, built with **Expo (managed)** and
**Expo Router**. It reuses the existing backend unchanged — the same Vercel API
and Supabase project that power the web app.

This is the **core starter**: Supabase auth, the solo Quiz flow
(fetch → answer → submit → results), the global Leaderboard, and the
Abbreviations glossary. It's structured so Play, Profile, and Flashcards can be
added as more screens later.

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
│   └── (tabs)/               #   bottom tab navigator
│       ├── _layout.tsx
│       ├── index.tsx         #   → Quiz
│       ├── leaderboard.tsx   #   → Leaderboard
│       ├── abbreviations.tsx #   → Abbreviations
│       └── account.tsx       #   → Account (sign in/out)
└── src/
    ├── lib/                  # supabase, api, auth, quizApi, categories, …
    ├── screens/             # the actual screen UIs
    ├── components/          # shared UI primitives
    ├── theme.ts             # brand palette (light/dark)
    └── types.ts             # domain types mirroring the API
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

## Ship to the App Store (EAS)

You need an **Apple Developer Program** membership ($99/yr). No Mac required —
EAS builds in the cloud.

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --platform ios          # produces an .ipa in the cloud
eas submit --platform ios         # uploads to App Store Connect / TestFlight
```

Then in **App Store Connect**: add screenshots, description, privacy details,
and submit for review. (Android is symmetric: `eas build/submit -p android`.)

Set the same `EXPO_PUBLIC_*` values as **EAS environment variables** (or an
`eas.json` env block) so production builds point at your live API.

## Not in this starter (easy to add next)

- **Play** (multiplayer/classroom) — needs the `/api/play/*` calls + Supabase
  Realtime (`supabase.channel(...)` works in RN).
- **Profile** stats and **Flashcards**.
- Writing quiz results to stats after submit (the web app calls
  `record_quiz_result`); wire the same `/api/user/*` endpoints here.
- Markdown/code-fence rendering for questions (currently shown as plain text).
- Internationalization (the web app's `cs`/`en` strings can be ported).
