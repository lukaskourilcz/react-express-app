import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth/auth_service.dart';
import 'lib/bookmarks.dart';
import 'lib/cards.dart';
import 'screens/home_screen.dart';
import 'theme.dart';

const _supabaseUrl = String.fromEnvironment('SUPABASE_URL');
const _supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

void main() async {
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

  runApp(const DevQuizApp());
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
