# DevQuiz mobile (Flutter)

A Flutter client for the DevQuiz app — iOS, Android, and web from one
codebase. Talks to the same Vercel API + Supabase backend as the web client,
so this directory **adds** mobile targets without touching backend infra.

## What's implemented

| Feature | Status |
| --- | --- |
| Home (categories / count / difficulty / tiles for sub-features) | ✅ |
| Quiz (questions, options, code highlighting, navigation, submit) | ✅ |
| Result (score, per-question review with explanations, bookmark + report buttons) | ✅ |
| Profile (stats, streaks, achievements grid, bookmarks shortcut) | ✅ |
| Leaderboard (Global / Daily / Category tabs with category picker) | ✅ |
| Daily challenge | ✅ |
| Per-category stats reporting | ✅ |
| **Bookmarks** — local persistence, dedicated screen, toggles on result rows | ✅ |
| **Achievements** — 10 client-side badges in a grid on Profile | ✅ |
| **Question reporting** — dialog from result rows, posts to API | ✅ |
| **Multiplayer + classroom** — lobby / running / finished, host heartbeat, countdown timer, speed bonus, classroom histogram, Supabase Realtime + 4s polling fallback | ✅ |
| **Real Auth0 sign-in** — `auth0_flutter` universal login, guest mode fallback when not configured | ✅ |

## Project layout

```
mobile/
├── pubspec.yaml
├── analysis_options.yaml
├── lib/
│   ├── main.dart                  # Supabase + Auth + Bookmarks bootstrap
│   ├── theme.dart                 # brand green #2D7A2D, light/dark
│   ├── api/                       # client.dart, quiz, user, leaderboard, play
│   ├── auth/                      # auth_service.dart (Auth0 + guest)
│   ├── lib/                       # bookmarks, achievements
│   ├── models/                    # quiz, user_stats, leaderboard, play
│   ├── realtime/realtime.dart     # Supabase Realtime broadcast channel
│   ├── widgets/                   # code_block, category_chip, achievements_grid, report_dialog
│   └── screens/
│       ├── home_screen.dart
│       ├── quiz_screen.dart
│       ├── result_screen.dart
│       ├── profile_screen.dart
│       ├── leaderboard_screen.dart
│       ├── bookmarks_screen.dart
│       ├── play_landing_screen.dart
│       └── play_match_screen.dart
└── ios/Runner/Info.plist.template
```

## Setup (one-time, on your Mac)

You need:
- **Flutter SDK** ≥ 3.19 — <https://docs.flutter.dev/get-started/install/macos>
- **Xcode** ≥ 15 + Command Line Tools, free Apple Developer account for the
  simulator, $99/yr to ship to App Store
- **CocoaPods** (`sudo gem install cocoapods`)

```bash
cd mobile
flutter create --org com.devquiz --project-name devquiz \
               --platforms ios,android,web \
               --description "DevQuiz – test your web dev skills" .
flutter pub get
```

`flutter create` over an existing directory adds the missing iOS/Android/web
platform folders without overwriting `lib/`. Keep our `pubspec.yaml`.

## Build flags

The app is fully configurable at run/build time via `--dart-define`:

| Flag | Default | What it does |
| --- | --- | --- |
| `API_BASE_URL` | `https://devquiz.vercel.app` | Base URL for all API calls |
| `SUPABASE_URL` | _(empty)_ | Enables Realtime broadcast for multiplayer |
| `SUPABASE_ANON_KEY` | _(empty)_ | Same |
| `AUTH0_DOMAIN` | _(empty)_ | Enables native Auth0 sign-in |
| `AUTH0_CLIENT_ID` | _(empty)_ | Same |
| `AUTH0_AUDIENCE` | _(empty)_ | Optional API audience for access tokens |

Without `SUPABASE_URL` / `SUPABASE_ANON_KEY`, multiplayer falls back to 4-second
polling (still works, just less snappy). Without Auth0, the Profile screen
shows guest mode (display-name only).

## Run

```bash
# iOS simulator
open -a Simulator
flutter run -d ios

# Physical iPhone
flutter devices                 # confirm your phone is listed
flutter run -d <device-id> \
  --dart-define=API_BASE_URL=https://devquiz.vercel.app \
  --dart-define=SUPABASE_URL=https://xxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=… \
  --dart-define=AUTH0_DOMAIN=your-tenant.auth0.com \
  --dart-define=AUTH0_CLIENT_ID=…
```

## Native config required for Auth0 + WebView

### iOS — `ios/Runner/Info.plist`

After `flutter create`, merge these keys:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key><string>None</string>
    <key>CFBundleURLName</key><string>auth0</string>
    <key>CFBundleURLSchemes</key>
    <array><string>com.devquiz.app</string></array>
  </dict>
</array>
```

In your **Auth0 application** dashboard, add this as an *Allowed Callback URL*:

```
com.devquiz.app://YOUR_TENANT.auth0.com/ios/com.devquiz/callback
```

### Android — `android/app/build.gradle`

```groovy
defaultConfig {
    manifestPlaceholders = [
        auth0Domain: "YOUR_TENANT.auth0.com",
        auth0Scheme: "com.devquiz.app"
    ]
}
```

Allowed Callback URL on Auth0:

```
com.devquiz.app://YOUR_TENANT.auth0.com/android/com.devquiz/callback
```

## Release IPA (App Store)

```bash
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://your-app.vercel.app \
  --dart-define=SUPABASE_URL=https://xxx.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=… \
  --dart-define=AUTH0_DOMAIN=… \
  --dart-define=AUTH0_CLIENT_ID=…
open build/ios/archive/Runner.xcarchive
```

Then submit through Xcode → Organizer → Distribute App.

## App Store submission checklist

- App Store Connect listing with screenshots (6.7" + 5.5" required)
- Privacy policy URL (Auth0 + Supabase store user data; mention both)
- App tracking declaration: this app does not track across other apps
- Bundle identifier `com.devquiz.app` registered in Apple Developer portal
- *Sign in with Apple* — Apple Guideline 4.8 may require this if you ship
  third-party sign-in. Auth0 supports it as an Identity Provider.

## Honest limits

- **Multiplayer**: per-question countdown is 30s server-side, client polls at
  4s in addition to Realtime broadcasts. Host abandonment auto-finishes after
  5 min via the server-side cleanup (matches web).
- **Auth0 silent refresh** is wired but only attempts after a successful first
  sign-in. Cold start without network falls back to whatever was last persisted.
