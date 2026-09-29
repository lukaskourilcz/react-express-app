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

export interface CoalescedRead {
  // Ask for a read. Resolves once a read that started after this call ends.
  request: () => Promise<void>;
  // Stop for good: a queued trailing read never starts.
  cancel: () => void;
}

// A burst of broadcasts (a room changing question, a class joining the lobby)
// would otherwise send one state read per broadcast per client. This keeps at
// most one read in flight and folds every request that lands meanwhile into a
// single trailing read, which starts after the last broadcast and so always
// fetches the final state.
export function coalesceReads(read: () => Promise<void>): CoalescedRead {
  let inFlight: Promise<void> | null = null;
  let trailing: Promise<void> | null = null;
  let cancelled = false;

  const start = (): Promise<void> => {
    const current = read()
      .catch(noop)
      .then(() => {
        inFlight = null;
      });
    inFlight = current;
    return current;
  };

  return {
    request: () => {
      if (cancelled) return Promise.resolve();
      if (!inFlight) return start();
      if (!trailing) {
        trailing = inFlight.then(() => {
          trailing = null;
          return cancelled ? undefined : start();
        });
      }
      return trailing;
    },
    cancel: () => {
      cancelled = true;
    },
  };
}

export interface TrailingThrottle {
  /** Ask for a run: the first request of a quiet spell schedules one `waitMs`
   * later, and the requests that land before it runs join it. */
  request: () => void;
  /** Stop for good: a scheduled run never starts. */
  cancel: () => void;
}

// A class answering one question sends the host a stream of `answered`
// events. This turns the stream into at most one run per `waitMs`, and the
// last event is always followed by a run within `waitMs`.
export function trailingThrottle(run: () => void, waitMs: number): TrailingThrottle {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  return {
    request: () => {
      if (cancelled || timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        if (!cancelled) run();
      }, waitMs);
    },
    cancel: () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
