import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { apiFetch } from './api';
import { registerAccessTokenReader } from './roadmap';

// Cache the latest access token in memory so the pagehide beacon (which can't
// await getSession()) can attach the Authorization header synchronously.
let cachedAccessToken: string | null = null;
registerAccessTokenReader(() => cachedAccessToken);

// Report a real sign-in to the server (powers the /dev "Logs" tab) at most once
// per browser tab session, so page refreshes (which re-emit SIGNED_IN) don't log
// repeatedly. The server verifies the token and classifies register vs login.
const AUTH_REPORTED_KEY = 'devquiz:auth-reported';
const AUTH_BOOT_TIMEOUT_MS = 8_000;

function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Authentication timed out')), timeoutMs);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}
function reportSignIn(): void {
  try {
    if (sessionStorage.getItem(AUTH_REPORTED_KEY)) return;
    sessionStorage.setItem(AUTH_REPORTED_KEY, '1');
  } catch {
    // sessionStorage unavailable — fall through and still report once
  }
  // Fire-and-forget: never let logging affect the sign-in UX.
  void apiFetch('/api/user/authevent', { method: 'POST', body: '{}' }).catch(() => {});
}
function clearSignInReport(): void {
  try {
    sessionStorage.removeItem(AUTH_REPORTED_KEY);
  } catch {
    // ignore
  }
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  // Default throws so a tree missing <AuthProvider> surfaces an error instead
  // of silently doing nothing (which is the bug this contract guards against).
  signInWithGoogle: async () => {
    throw new Error('useAuth must be used within an AuthProvider');
  },
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    void withDeadline(supabase.auth.getSession(), AUTH_BOOT_TIMEOUT_MS)
      .then(({ data: { session } }) => {
        cachedAccessToken = session?.access_token ?? null;
        setUser(session?.user ?? null);
      })
      .catch(() => {
        cachedAccessToken = null;
        setUser(null);
      })
      .finally(() => setIsLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      cachedAccessToken = session?.access_token ?? null;
      setUser(session?.user ?? null);
      setIsLoading(false);
      // Only a genuine sign-in emits SIGNED_IN; INITIAL_SESSION (restored on page
      // load) and TOKEN_REFRESHED are ignored so the log records real logins.
      if (event === 'SIGNED_IN' && session?.user) reportSignIn();
      if (event === 'SIGNED_OUT') clearSignInReport();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) {
      throw new Error('Sign-in is not available in this deployment.');
    }
    // On success supabase-js redirects to Google; on failure (e.g. the Google
    // provider isn't enabled, or the redirect URL isn't allow-listed) it
    // returns an error instead of navigating — surface it so the click isn't
    // a silent no-op.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Display fields from a Supabase user. Google populates user_metadata.
export function getUserProfile(user: User | null) {
  const meta = user?.user_metadata ?? {};
  const rawPicture = (meta.avatar_url || meta.picture) as string | undefined;
  let picture: string | undefined;
  if (rawPicture) {
    try {
      const url = new URL(rawPicture);
      if (url.protocol === 'https:' && (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))) {
        picture = url.toString();
      }
    } catch {
      // Untrusted metadata is rendered as initials instead of loading a tracker.
    }
  }
  return {
    name: (meta.full_name || meta.name || user?.email) as string | undefined,
    email: user?.email,
    picture,
  };
}

export interface UserProfile {
  name?: string;
  email?: string;
  picture?: string;
}

// Best display name for a profile: full name, else the local part of the email,
// else the given fallback (e.g. 'Host' / 'Player').
export function displayNameFromProfile(profile: UserProfile, fallback: string): string {
  return profile.name || profile.email?.split('@')[0] || fallback;
}
