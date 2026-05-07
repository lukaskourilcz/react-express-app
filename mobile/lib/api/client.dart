import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../auth/auth_service.dart';

/// Base URL for the API. Override at build time:
///   flutter run --dart-define=API_BASE_URL=https://your-app.vercel.app
/// Defaults assume the same Vercel deployment your web app uses.
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://devquiz.vercel.app',
);

class ApiException implements Exception {
  final int status;
  final String code;
  final String message;
  ApiException(this.status, this.code, this.message);

  @override
  String toString() => 'ApiException($status $code): $message';
}

class ApiClient {
  ApiClient({http.Client? client, this.timeout = const Duration(seconds: 15)})
      : _client = client ?? http.Client();

  final http.Client _client;
  final Duration timeout;

  Map<String, String> _baseHeaders({bool withBody = false}) {
    final h = <String, String>{
      'Accept': 'application/json',
      if (withBody) 'Content-Type': 'application/json',
    };
    final token = AuthService.instance.accessToken;
    if (token != null && token.isNotEmpty) {
      h['Authorization'] = 'Bearer $token';
    }
    return h;
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) async {
    final uri = Uri.parse('$apiBaseUrl$path').replace(queryParameters: query);
    final res = await _client.get(uri, headers: _baseHeaders()).timeout(timeout);
    return _decode(res);
  }

  Future<Map<String, dynamic>> post(String path, Object body) async {
    final uri = Uri.parse('$apiBaseUrl$path');
    final res = await _client
        .post(uri, headers: _baseHeaders(withBody: true), body: jsonEncode(body))
        .timeout(timeout);
    return _decode(res);
  }

  Map<String, dynamic> _decode(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return const {};
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    try {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final err = body['error'] as Map<String, dynamic>?;
      throw ApiException(
        res.statusCode,
        (err?['code'] as String?) ?? 'http_error',
        (err?['message'] as String?) ?? 'Request failed (${res.statusCode})',
      );
    } catch (_) {
      throw ApiException(res.statusCode, 'http_error', 'Request failed (${res.statusCode})');
    }
  }
}

String friendlyError(Object err) {
  if (err is TimeoutException) return 'Request timed out. Please try again.';
  if (err is ApiException) {
    if (err.status >= 500) return 'Server error. Please try again in a moment.';
    if (err.status == 401 || err.status == 403) return 'You need to sign in for that.';
    return err.message;
  }
  return 'Network error. Check your connection and try again.';
}
