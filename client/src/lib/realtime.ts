import { loadedSupabase } from './supabaseClient';

// Thin wrapper around Supabase Realtime broadcast channels for live matches.
// Falls back to a no-op subscription if Supabase isn't configured so callers
// still work locally — they will just not receive live events. Only a
// signed-in player opens a match channel, and restoring or starting that
// session loaded the client (lib/supabaseClient.ts), so it is read
// synchronously here.

type Listener<T = unknown> = (payload: T) => void;

export interface RealtimeChannel {
  send: (event: string, payload: unknown) => Promise<void>;
  subscribe: <T = unknown>(event: string, fn: Listener<T>) => () => void;
  onStatus: (fn: Listener<string>) => () => void;
  unsubscribe: () => void;
}

const noop = () => undefined;

export function joinMatchChannel(code: string): RealtimeChannel {
  const client = loadedSupabase();
  if (!client) {
    return {
      send: async () => undefined,
      subscribe: () => noop,
      onStatus: (fn) => {
        fn('DISCONNECTED');
        return noop;
      },
      unsubscribe: noop,
    };
  }

  const channel = client.channel(`match:${code}`, {
    config: { broadcast: { self: true } },
  });

  let currentStatus = 'CONNECTING';
  const statusListeners = new Set<Listener<string>>();
  channel.subscribe((status) => {
    currentStatus = status;
    statusListeners.forEach((listener) => listener(status));
  });

  return {
    send: async (event, payload) => {
      await channel.send({ type: 'broadcast', event, payload });
    },
    subscribe: <T,>(event: string, fn: Listener<T>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (channel as any).on('broadcast', { event }, (msg: { payload: T }) => fn(msg.payload));
      return () => {
        /* channel-wide unsubscribe via unsubscribe() below */
      };
    },
    onStatus: (fn) => {
      statusListeners.add(fn);
      fn(currentStatus);
      return () => statusListeners.delete(fn);
    },
    unsubscribe: () => {
      statusListeners.clear();
      client.removeChannel(channel);
    },
  };
}
