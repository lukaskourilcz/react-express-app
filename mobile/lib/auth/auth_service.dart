import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight auth wrapper.
///
/// The mobile app supports a "guest mode" out of the box (quizzes work, stats
/// don't persist server-side). Set `AUTH0_DOMAIN` / `AUTH0_CLIENT_ID` /
/// `AUTH0_AUDIENCE` via --dart-define to enable real Auth0 sign-in via
/// `auth0_flutter`.
///
/// We don't import auth0_flutter here directly so the build works even if the
/// package isn't installed yet; wire it up in main.dart once you have your
/// Auth0 SPA configured.
class AuthService extends ChangeNotifier {
  AuthService._();
  static final instance = AuthService._();

  String? _sub;
  String? _name;
  String? _email;
  String? _picture;

  String? get sub => _sub;
  String? get name => _name;
  String? get email => _email;
  String? get picture => _picture;
  bool get isAuthenticated => _sub != null;

  Future<void> loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    _sub = prefs.getString('auth.sub');
    _name = prefs.getString('auth.name');
    _email = prefs.getString('auth.email');
    _picture = prefs.getString('auth.picture');
    notifyListeners();
  }

  Future<void> setUser({
    required String sub,
    String? name,
    String? email,
    String? picture,
  }) async {
    _sub = sub;
    _name = name;
    _email = email;
    _picture = picture;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth.sub', sub);
    if (name != null) await prefs.setString('auth.name', name);
    if (email != null) await prefs.setString('auth.email', email);
    if (picture != null) await prefs.setString('auth.picture', picture);
    notifyListeners();
  }

  Future<void> clear() async {
    _sub = null;
    _name = null;
    _email = null;
    _picture = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth.sub');
    await prefs.remove('auth.name');
    await prefs.remove('auth.email');
    await prefs.remove('auth.picture');
    notifyListeners();
  }
}
