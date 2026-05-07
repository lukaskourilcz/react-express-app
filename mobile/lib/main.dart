import 'package:flutter/material.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth/auth_service.dart';
import 'lib/bookmarks.dart';
import 'lib/cards.dart';
import 'lib/cards_sync.dart';
import 'screens/home_screen.dart';
import 'theme.dart';

const _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const _supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');
const _sentryDsn = String.fromEnvironment('SENTRY_DSN');
const _sentryEnv = String.fromEnvironment('SENTRY_ENV', defaultValue: 'production');

Future<void> _bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialise Supabase only when keys are provided. Without them,
  // `MatchChannel` returns a no-op and multiplayer falls back to polling.
  if (_supabaseUrl.isNotEmpty && _supabaseAnonKey.isNotEmpty) {
    try {
      await Supabase.initialize(
        url: _supabaseUrl,
        anonKey: _supabaseAnonKey,
      );
    } catch (e) {
      // Already initialised or bad config; keep going in degraded mode.
      debugPrint('Supabase init failed: $e');
    }
  }

  await AuthService.instance.loadFromStorage();
  await BookmarkStore.instance.load();
  await CardStore.instance.load();

  // Bridge auth state → card sync. Whenever the user signs in / out,
  // (re)initialise the sync layer.
  void onAuthChange() {
    final sub = AuthService.instance.sub;
    if (sub != null) {
      initCardSync(sub);
    } else {
      resetCardSync();
    }
  }
  AuthService.instance.addListener(onAuthChange);
  onAuthChange();

  runApp(const DevQuizApp());
}

void main() {
  if (_sentryDsn.isEmpty) {
    _bootstrap();
    return;
  }
  SentryFlutter.init(
    (options) {
      options.dsn = _sentryDsn;
      options.environment = _sentryEnv;
      options.tracesSampleRate = 0.1;
      options.attachScreenshot = false;
      options.attachViewHierarchy = false;
      // Strip auth-bearing query params from breadcrumbs.
      options.beforeBreadcrumb = (breadcrumb, _) {
        final data = breadcrumb?.data;
        final url = data?['url'];
        if (breadcrumb != null && url is String) {
          final scrubbed = url.replaceAllMapped(
            RegExp(r'(token|auth0_id|sub)=[^&]+', caseSensitive: false),
            (m) => '${m.group(1)}=[redacted]',
          );
          return breadcrumb.copyWith(data: {...?data, 'url': scrubbed});
        }
        return breadcrumb;
      };
    },
    appRunner: _bootstrap,
  );
}

class DevQuizApp extends StatelessWidget {
  const DevQuizApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DevQuiz',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(brightness: Brightness.light),
      darkTheme: buildTheme(brightness: Brightness.dark),
      themeMode: ThemeMode.system,
      home: const HomeScreen(),
    );
  }
}
