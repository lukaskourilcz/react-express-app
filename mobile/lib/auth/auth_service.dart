import 'package:auth0_flutter/auth0_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _auth0Domain = String.fromEnvironment('AUTH0_DOMAIN');
const _auth0ClientId = String.fromEnvironment('AUTH0_CLIENT_ID');
const _auth0Audience = String.fromEnvironment('AUTH0_AUDIENCE');

class AuthService extends ChangeNotifier {
  AuthService._();
  static final instance = AuthService._();

  String? _sub;
  String? _name;
  String? _email;
  String? _picture;
  String? _accessToken;

  Auth0? _auth0;

  String? get sub => _sub;
  String? get name => _name;
  String? get email => _email;
  String? get picture => _picture;
  String? get accessToken => _accessToken;
  bool get isAuthenticated => _sub != null;
  bool get isAuth0Configured => _auth0Domain.isNotEmpty && _auth0ClientId.isNotEmpty;

  Auth0 _client() {
    final existing = _auth0;
    if (existing != null) return existing;
    final c = Auth0(_auth0Domain, _auth0ClientId);
    _auth0 = c;
    return c;
  }

  Future<void> loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    _sub = prefs.getString('auth.sub');
    _name = prefs.getString('auth.name');
    _email = prefs.getString('auth.email');
    _picture = prefs.getString('auth.picture');
    _accessToken = prefs.getString('auth.accessToken');

    // If Auth0 was previously used, try to silently refresh credentials.
    if (isAuth0Configured && (prefs.getBool('auth.isAuth0') ?? false)) {
      try {
        final credentials = await _client().credentialsManager.credentials();
        await _persistFromAuth0(credentials, isAuth0: true);
      } catch (_) {
        // expired refresh / not signed in — fall through to whatever is stored
      }
    }
    notifyListeners();
  }

  /// Native Auth0 universal login. Caller must have set
  /// `--dart-define=AUTH0_DOMAIN=...` and `AUTH0_CLIENT_ID=...`.
  Future<bool> signInWithAuth0() async {
    if (!isAuth0Configured) return false;
    try {
      final creds = await _client().webAuthentication(scheme: 'com.devquiz.app').login(
        audience: _auth0Audience.isEmpty ? null : _auth0Audience,
        scopes: const {'openid', 'profile', 'email', 'offline_access'},
      );
      await _persistFromAuth0(creds, isAuth0: true);
      notifyListeners();
      return true;
    } catch (e) {
      if (kDebugMode) print('Auth0 sign-in failed: $e');
      return false;
    }
  }

  Future<void> _persistFromAuth0(Credentials creds, {required bool isAuth0}) async {
    final user = creds.user;
    _sub = user.sub;
    _name = user.name ?? user.nickname;
    _email = user.email;
    _picture = user.pictureUrl?.toString();
    _accessToken = creds.accessToken;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth.sub', _sub!);
    if (_name != null) await prefs.setString('auth.name', _name!);
    if (_email != null) await prefs.setString('auth.email', _email!);
    if (_picture != null) await prefs.setString('auth.picture', _picture!);
    if (_accessToken != null) await prefs.setString('auth.accessToken', _accessToken!);
    await prefs.setBool('auth.isAuth0', isAuth0);
  }

  /// Guest mode — pick a display name, get a stable client-side sub.
  Future<void> setGuest({required String displayName}) async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString('auth.sub');
    final id = existing != null && existing.startsWith('local|')
        ? existing
        : 'local|${DateTime.now().millisecondsSinceEpoch}';

    _sub = id;
    _name = displayName;
    _email = null;
    _picture = null;
    _accessToken = null;
    await prefs.setString('auth.sub', id);
    await prefs.setString('auth.name', displayName);
    await prefs.remove('auth.email');
    await prefs.remove('auth.picture');
    await prefs.remove('auth.accessToken');
    await prefs.setBool('auth.isAuth0', false);
    notifyListeners();
  }

  Future<void> signOut() async {
    if (isAuth0Configured) {
      try {
        await _client().webAuthentication(scheme: 'com.devquiz.app').logout();
      } catch (_) {
        // ignore — we still clear locally
      }
    }
    _sub = null;
    _name = null;
    _email = null;
    _picture = null;
    _accessToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth.sub');
    await prefs.remove('auth.name');
    await prefs.remove('auth.email');
    await prefs.remove('auth.picture');
    await prefs.remove('auth.accessToken');
    await prefs.remove('auth.isAuth0');
    notifyListeners();
  }
}
