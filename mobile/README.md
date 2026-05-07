# DevQuiz mobile (Flutter)

A Flutter client for the DevQuiz app. Talks to the same Vercel API + Supabase
backend as the web client, so this directory **adds** an iOS / Android / web
target without touching the existing infrastructure.

## What's here

```
mobile/
├── pubspec.yaml          # Dart deps (http, auth0_flutter, flutter_highlight…)
├── analysis_options.yaml
├── lib/
│   ├── main.dart         # entry, MaterialApp, theme mode
│   ├── theme.dart        # brand green #2D7A2D, light/dark
│   ├── api/              # client.dart, quiz.dart, user.dart, leaderboard.dart
│   ├── auth/             # auth_service.dart (guest mode + Auth0-ready)
│   ├── models/           # quiz, user_stats, leaderboard
│   ├── widgets/          # code_block, category_chip
│   └── screens/          # Home, Quiz, Result, Profile, Leaderboard
└── ios/Runner/Info.plist.template   # iOS keys to merge after scaffolding
```

## What's implemented

| Screen | Status |
| --- | --- |
| Home (categories / count / difficulty / start, plus Today's Challenge) | ✅ |
| Quiz (questions, options, code highlighting, navigation, submit) | ✅ |
| Result (score, per-question review with explanations) | ✅ |
| Profile (stats, streaks, guest sign-in fallback) | ✅ |
| Leaderboard (Global / Daily / Category tabs with category picker) | ✅ |
| Daily challenge | ✅ |
| Per-category stats reporting | ✅ |
| Multiplayer (live matches) | 🚧 deferred — needs Supabase realtime + extra work |
| Code sandbox (JS/TS/Python) | 🚧 deferred — would need WebView + Pyodide |
| Question reporting dialog | 🚧 deferred — small addition |
| Bookmarks panel | 🚧 deferred — small addition |
| Achievements grid | 🚧 deferred — port the rules from `client/src/lib/achievements.ts` |
| Auth0 native sign-in | 🚧 wired-but-stubbed (see "Real Auth0" below). Guest mode works today. |

## One-time setup (on your Mac)

You need:
- **Flutter SDK** ≥ 3.19. Install from <https://docs.flutter.dev/get-started/install/macos>
- **Xcode** ≥ 15 with Command Line Tools and an Apple Developer account (free for simulator, $99/year for App Store)
- **CocoaPods** (`sudo gem install cocoapods`)

Then, from the repo root:

```bash
cd mobile
flutter create --org com.devquiz --project-name devquiz \
               --platforms ios,android,web \
               --description "DevQuiz – test your web dev skills" .
```

`flutter create` over an existing directory **adds** the missing iOS/Android/web
platform folders without overwriting `lib/`. If it warns that `pubspec.yaml`
already exists, keep ours (it has the deps you actually need).

```bash
flutter pub get
```

## Pointing at your backend

The API base URL defaults to `https://devquiz.vercel.app`. Override at run/build
time:

```bash
# Run against your own Vercel deployment
flutter run --dart-define=API_BASE_URL=https://your-app.vercel.app

# Run against `vercel dev` on your Mac (use your machine's LAN IP for a
# physical device; localhost is fine for the simulator)
flutter run --dart-define=API_BASE_URL=http://192.168.1.50:3000
```

> **Note:** iOS blocks plain `http://` by default (App Transport Security). For
> local development against `vercel dev`, add the LAN host to `NSAppTransport
> Security.NSExceptionDomains` in `ios/Runner/Info.plist`, or just deploy a
> preview build to Vercel and point at that.

## Run on iOS simulator

```bash
open -a Simulator
flutter run -d ios
```

## Run on a physical iPhone

```bash
# Plug in your phone, trust this Mac, then
flutter devices            # confirm your phone is listed
flutter run -d <device-id>
```

Xcode will likely ask you to sign the app the first time — open
`ios/Runner.xcworkspace`, select the **Runner** target, and pick your team
under *Signing & Capabilities*.

## Build a release IPA for App Store

```bash
flutter build ipa --release \
    --dart-define=API_BASE_URL=https://your-app.vercel.app
open build/ios/archive/Runner.xcarchive
```

Then submit through Xcode → Organizer → Distribute App.

## Real Auth0 (optional)

Out of the box the app works in **guest mode**: you pick a display name on the
Profile screen and your stats are tied to a stable client-side ID. To wire up
real Auth0 universal login:

1. In your Auth0 dashboard, create a **Native** application alongside the
   existing SPA.
2. Add the iOS callback URL: `com.devquiz.app://YOUR_TENANT/ios/com.devquiz/callback`
3. Add the Android callback URL similarly.
4. In `mobile/lib/auth/auth_service.dart`, call `Auth0(domain, clientId)
   .webAuthentication().login(...)` from the package `auth0_flutter` and
   forward the resulting profile into `setUser(...)`.
5. Build with `--dart-define`:
   ```bash
   flutter run \
     --dart-define=AUTH0_DOMAIN=your-tenant.auth0.com \
     --dart-define=AUTH0_CLIENT_ID=your-native-client-id \
     --dart-define=AUTH0_AUDIENCE=https://your-api-identifier
   ```

The server endpoints already accept the same `auth0_id` shape (`sub`) for
guest and Auth0 modes; nothing on the backend changes.

## App Store submission checklist (when you get there)

- App Store Connect listing with screenshots (6.7" + 5.5" required as of 2025)
- Privacy policy URL (Auth0 + Supabase store user data; mention both)
- App tracking declaration: this app does not track users across other apps,
  so your *App Privacy* form should be straightforward
- Bundle identifier `com.devquiz.app` registered in Apple Developer portal
- Push notification entitlement only if you want it; the app doesn't use one yet

## Deferred features — when you want them

These exist on web but were skipped here for scope. Each is a contained pass:

- **Multiplayer + classroom**: subscribe to the Supabase realtime channel
  `match:<code>` via `supabase_flutter`, mirror the lobby/run/result UI from
  `client/src/components/Play.tsx`. The API endpoints already work.
- **Code sandbox**: embed a `WebView` (`webview_flutter`) pointing at a tiny
  `/sandbox-runner.html` you ship in `assets/`, reuse the existing iframe
  protocol. Pyodide will work; sucrase needs a JS bundle bundled as an asset.
- **Bookmarks / achievements / report dialog**: pure UI ports of the existing
  client logic (`client/src/lib/{bookmarks,achievements}.ts` and
  `client/src/components/ReportDialog.tsx`).

Tell me which one you want next and I'll add it.
