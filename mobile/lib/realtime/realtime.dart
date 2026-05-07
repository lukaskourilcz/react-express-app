import 'package:supabase_flutter/supabase_flutter.dart';

/// Wraps Supabase Realtime broadcast channels for live matches.
///
/// Initialise once in `main.dart`:
///   await Supabase.initialize(url: ..., anonKey: ...);
///
/// If Supabase isn't configured (no env vars), `joinMatchChannel` returns a
/// no-op channel so the app keeps working via polling.
class MatchChannel {
  MatchChannel._(this._channel);

  final RealtimeChannel? _channel;

  static MatchChannel join(String code) {
    try {
      final client = Supabase.instance.client;
      final ch = client.channel(
        'match:$code',
        opts: const RealtimeChannelConfig(self: true),
      );
      ch.subscribe();
      return MatchChannel._(ch);
    } catch (_) {
      return MatchChannel._(null);
    }
  }

  void onBroadcast(String event, void Function(Map<String, dynamic>) handler) {
    final ch = _channel;
    if (ch == null) return;
    ch.onBroadcast(
      event: event,
      callback: (payload) => handler(payload),
    );
  }

  Future<void> send(String event, Map<String, dynamic> payload) async {
    final ch = _channel;
    if (ch == null) return;
    await ch.sendBroadcastMessage(event: event, payload: payload);
  }

  Future<void> dispose() async {
    final ch = _channel;
    if (ch == null) return;
    try {
      await Supabase.instance.client.removeChannel(ch);
    } catch (_) {
      // ignore — already torn down or Supabase not configured
    }
  }
}
