# Frontend (mobile, Flutter)

The Flutter client in `mobile/`. Targets iOS, Android, and web from one
codebase. Talks to the same API as the web client — no backend changes.

## Why Flutter (and not React Native)

We considered three paths for "iOS app":

1. **PWA only** — wrap the React app for iOS. Cheap, but no App Store, limited APIs, Safari quirks.
2. **Flutter** — native iOS via Skia/Impeller, single codebase across platforms. ✅ chosen.
3. **React Native** — RN shares mental model with React but costs a third codebase to keep in sync (web React + RN + Flutter, or web + RN, with permanent dual-maintenance).

Flutter wins because: (a) we don't need to share React patterns with the existing web client — the surface area is small; (b) Flutter on iOS feels native (Cupertino widgets where appropriate, system back gestures, etc.); (c) it adds Android and web for free; (d) Dart's strong typing matches our TypeScript discipline.

Adding RN later remains an option if Flutter friction becomes a real problem; nothing in the architecture forecloses it.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Flutter 3.19+ |
| Language | Dart 3.3+ |
| HTTP | `package:http` wrapped in `lib/api/client.dart` |
| Realtime | `supabase_flutter` (channels only — REST goes via `package:http`) |
| Auth | `auth0_flutter` (universal login via `ASWebAuthenticationSession` on iOS) |
| Code highlighting | `flutter_highlight` |
| Sandbox | `webview_flutter` + `assets/sandbox_runner.html` |
| Storage | `shared_preferences` |
| State | `setState` + `ChangeNotifier` for cross-screen |
| Tests | None yet |

## Project structure

```
mobile/
├── pubspec.yaml
├── analysis_options.yaml
├── assets/
│   └── sandbox_runner.html         # JS / TS / Python WebView runner
├── lib/
│   ├── main.dart                   # Bootstrap: Supabase + Auth + Bookmarks
│   ├── theme.dart                  # BrandColors + light/dark themes
│   ├── responsive.dart             # Breakpoints, safe layouts
│   ├── api/
│   │   ├── client.dart             # apiFetch equivalent (timeout, errors)
│   │   ├── quiz.dart
│   │   ├── user.dart
│   │   ├── leaderboard.dart
│   │   └── play.dart
│   ├── auth/
│   │   └── auth_service.dart       # Auth0 + guest mode (ChangeNotifier)
│   ├── lib/
│   │   ├── bookmarks.dart          # Local store, persisted to prefs
│   │   ├── cards.dart              # Flashcard deck (auto-populated on quiz submit)
│   │   └── achievements.dart       # Pure rules engine
│   ├── models/
│   │   ├── quiz.dart               # Question, QuizSession, QuizResult, …
│   │   ├── user_stats.dart
│   │   ├── leaderboard.dart
│   │   └── play.dart               # Match, Participant, ScoreboardEntry
│   ├── realtime/
│   │   └── realtime.dart           # Supabase broadcast channel wrapper
│   ├── widgets/
│   │   ├── code_block.dart         # QuestionText: prose + code via flutter_highlight
│   │   ├── category_chip.dart
│   │   ├── achievements_grid.dart
│   │   └── report_dialog.dart
│   └── screens/
│       ├── home_screen.dart
│       ├── quiz_screen.dart
│       ├── result_screen.dart
│       ├── profile_screen.dart
│       ├── leaderboard_screen.dart
│       ├── bookmarks_screen.dart
│       ├── cards_screen.dart
│       ├── sandbox_screen.dart
│       ├── play_landing_screen.dart
│       └── play_match_screen.dart
└── ios/Runner/Info.plist.template  # Native config to merge after `flutter create`
```

## State management

- **Local screen state** → `setState` inside `StatefulWidget`.
- **Cross-screen state** → `ChangeNotifier`-backed singletons (`AuthService.instance`, `BookmarkStore.instance`). Screens subscribe in `initState` via `addListener` and clean up in `dispose`.
- **Persistence** → `shared_preferences` for everything we want to survive an app restart (auth, bookmarks, achievements perfect-quiz counter, theme TBD).

This is intentionally lightweight. Flutter's `Provider`/`Riverpod`/`Bloc` would all work but bring complexity that isn't justified at this scale.

## Responsive design

`mobile/lib/responsive.dart` defines breakpoints and helpers:

```dart
class Breakpoints {
  static const double phone = 600;        // iPhone SE through iPhone Pro Max
  static const double tablet = 900;       // iPad mini, iPad
  static const double desktop = 1200;     // iPad Pro / desktop web
}

bool isPhone(BuildContext c)   => MediaQuery.sizeOf(c).width <  Breakpoints.phone;
bool isTablet(BuildContext c)  => MediaQuery.sizeOf(c).width <  Breakpoints.tablet;
bool isDesktop(BuildContext c) => MediaQuery.sizeOf(c).width >= Breakpoints.desktop;
double contentMaxWidth(BuildContext c) {
  final w = MediaQuery.sizeOf(c).width;
  if (w < Breakpoints.phone) return double.infinity;
  if (w < Breakpoints.tablet) return 600;
  return 720;
}
```

All screens wrap their root in:

```dart
Center(
  child: ConstrainedBox(
    constraints: BoxConstraints(maxWidth: contentMaxWidth(context)),
    child: ListView(...),
  ),
)
```

This gives:
- **iPhone SE (375 wide)**: full width, comfortable padding.
- **iPhone Pro Max (430 wide)**: full width.
- **iPad mini portrait (768)**: content centered at 600 wide so line lengths stay readable.
- **iPad Pro 12.9" (1024+)**: content centered at 720 wide; surrounding space stays empty rather than awkwardly stretching.
- **Landscape on a phone**: still constrained, but the `ListView` keeps everything scrollable.

Other responsive details:
- `SafeArea` wraps the body of every screen so notch / dynamic island / home indicator are respected.
- Text sizes scale with `MediaQuery.textScalerOf(context)` automatically because we use `TextStyle` defaults rather than hard-pinning sizes everywhere.
- Code blocks (`flutter_highlight`) are wrapped in a horizontally-scrolling `SingleChildScrollView` — long lines on a 375-wide phone don't break the layout.
- Hit targets are ≥44x44 (Apple HIG) by default for `IconButton` / `Chip` / `ElevatedButton`.

## Build flags

Everything backend-related is configurable at run/build time via `--dart-define`:

| Flag | Default | What |
| --- | --- | --- |
| `API_BASE_URL` | `https://devquiz.vercel.app` | API root |
| `SUPABASE_URL` | (empty) | Realtime; if missing, multiplayer falls back to 4s polling |
| `SUPABASE_ANON_KEY` | (empty) | Same |
| `AUTH0_DOMAIN` | (empty) | Native universal login |
| `AUTH0_CLIENT_ID` | (empty) | Same |
| `AUTH0_AUDIENCE` | (empty) | API audience for access tokens |

Without any of these, the app boots into guest mode against the default API URL.

## iOS specifics

After running `flutter create --org com.devquiz --platforms ios .`, merge into `ios/Runner/Info.plist`:

```xml
<key>CFBundleDisplayName</key>
<string>DevQuiz</string>

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

Add to your Auth0 *Native* application's Allowed Callback URLs:
```
com.devquiz.app://YOUR_TENANT.auth0.com/ios/com.devquiz/callback
```

Sign in with Apple is recommended for App Store compliance (Guideline 4.8). Configure it as an identity provider inside Auth0 and it'll be offered automatically on the universal login page — no client code changes.

## Android specifics

`android/app/build.gradle` after `flutter create`:

```groovy
defaultConfig {
    manifestPlaceholders = [
        auth0Domain: "YOUR_TENANT.auth0.com",
        auth0Scheme: "com.devquiz.app"
    ]
}
```

Allowed Callback URL in Auth0:
```
com.devquiz.app://YOUR_TENANT.auth0.com/android/com.devquiz/callback
```

## Adding a screen

1. Create `mobile/lib/screens/my_screen.dart`. Wrap content in `Scaffold(appBar: …, body: SafeArea(child: …))`.
2. Use the responsive container pattern above.
3. Wire navigation via `Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MyScreen()))` from where it belongs.
4. Add to `home_screen.dart` tile grid if user-facing.

## Build & run

```bash
# One-time scaffolding (after cloning the repo, on a Mac)
cd mobile
flutter create --org com.devquiz --project-name devquiz \
               --platforms ios,android,web .
flutter pub get

# Dev (iOS simulator)
flutter run -d ios --dart-define=API_BASE_URL=http://localhost:3000

# Dev (physical iPhone)
flutter run -d <device-id>

# Release IPA
flutter build ipa --release \
  --dart-define=API_BASE_URL=https://devquiz.vercel.app \
  --dart-define=… (other flags)
```

## Honest limits

- **Sandbox security**: Pyodide runs in a `WebView` that shares the parent app's origin (no cross-origin isolation). Pyodide is sandboxed by being WASM (no DOM, no network by default), but it's not a hard security boundary — don't run untrusted user code on a phone with sensitive data.
- **Multiplayer host abandonment**: server-side cleanup auto-finishes a match after 5 min of no heartbeat, but a participant on a flaky connection can still get stuck on a stale screen until they refresh.
- **Sign in with Apple**: required by App Review when shipping third-party sign-in. Configure inside Auth0, no client code changes.
- **No automated test suite**. `flutter analyze` is the closest thing to a check.
