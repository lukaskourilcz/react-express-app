import { supabase } from './supabase';

// Thin wrapper around Supabase Realtime broadcast channels for live matches.
// Falls back to a no-op subscription if Supabase isn't configured so callers
// still work locally — they will just not receive live events.

type Listener<T = unknown> = (payload: T) => void;

export interface RealtimeChannel {
  send: (event: string, payload: unknown) => Promise<void>;
  subscribe: <T = unknown>(event: string, fn: Listener<T>) => () => void;
  unsubscribe: () => void;
}

const noop = () => undefined;

export function joinMatchChannel(code: string): RealtimeChannel {
  if (!supabase) {
    return {
      send: async () => undefined,
      subscribe: () => noop,
      unsubscribe: noop,
    };
  }

  const client = supabase;
  const channel = client.channel(`match:${code}`, {
    config: { broadcast: { self: true } },
  });

  channel.subscribe();

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
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}
