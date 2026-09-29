import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  getSupabaseSession,
  loadSupabase,
  mayHaveSession,
  onSupabaseAuthStateChange,
  supabaseForSession,
  supabaseLoadFailed,
} from './supabaseClient';
import { apiFetch } from './api';
import { registerAccessTokenReader } from './roadmap';
import { clearAuthReturn, clearSignInResume, currentReturnPath, markSignInResume, rememberAuthReturn, takeSignInResume } from './authReturn';
import { RELOAD_GRACE_MS, browserRecovery, isChunkLoadError, reloadOnPress, type Recovery } from './routeRecovery';

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

// Read once, as the modules evaluate: whether the document before this one
// reloaded on a sign-in press and left the sign-in for this one to finish.
let resumePending = typeof window !== 'undefined' && takeSignInResume();

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Sign in with Google. `returnTo` is a path on this site to come back to
   * after the round trip (see lib/authReturn.ts); without it the visitor comes
   * back to the page the sign-in was pressed on. */
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** A sign-in pressed before a reload failed when this document finished it
   * (there is no button of that press left to say so). */
  signInResumeFailed: boolean;
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
  signInResumeFailed: false,
});

export function AuthProvider({ children, recovery = browserRecovery }: {
  children: ReactNode;
  /** The build check and the reload; tests pass their own. */
  recovery?: Recovery;
}) {
  const [user, setUser] = useState<User | null>(null);
  // No stored session and no OAuth return: the visitor is signed out from the
  // first render, and supabase-js is never downloaded (lib/supabaseClient.ts).
  const [isLoading, setIsLoading] = useState(mayHaveSession);
  const [signInResumeFailed, setSignInResumeFailed] = useState(false);
  const graceTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(graceTimer.current), []);

  /**
   * Imports supabase-js when needed and leaves for Google. `pressed` is false
   * for the sign-in a reload carried over from the previous document, which
   * never reloads again. The return path stays in sessionStorage until the
   * account arrives, and goes when the sign-in fails here.
   */
  const startSignIn = async (pressed: boolean) => {
    const failedBefore = supabaseLoadFailed();
    let client: SupabaseClient | null;
    try {
      client = await loadSupabase();
    } catch (error) {
      // The download failed before in this document and failed again on this
      // press. A browser that remembers failed module fetches (Chromium up to
      // 155, Safari) answers every later import from memory, so the press
      // reloads the page, and the next document finishes the sign-in.
      if (pressed && failedBefore && isChunkLoadError(error)) {
        markSignInResume();
        if (await reloadOnPress(recovery)) {
          // Busy until the new document arrives. A refused reload (the
          // leave-page prompt) fails the press after all.
          await new Promise((resolve) => { graceTimer.current = window.setTimeout(resolve, RELOAD_GRACE_MS); });
        }
        clearSignInResume();
      }
      clearAuthReturn();
      throw error;
    }
    if (!client) {
      clearAuthReturn();
      throw new Error('Sign-in is not available in this deployment.');
    }
    // On success supabase-js redirects to Google; on failure (e.g. the Google
    // provider isn't enabled, or the redirect URL isn't allow-listed) it
    // returns an error instead of navigating: surface it so the click isn't a
    // silent no-op.
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      clearAuthReturn();
      throw error;
    }
  };

  useEffect(() => {
    // A sign-in is a SIGNED_IN after INITIAL_SESSION; INITIAL_SESSION and
    // TOKEN_REFRESHED are never reported, so the log records real logins.
    // supabase-js also sends SIGNED_IN for a session it restores from storage,
    // while it initializes and before INITIAL_SESSION. The eager client sent
    // that before this effect ran; a client loaded on demand can attach this
    // listener first, and the order keeps the restore out of the log.
    let initialized = false;
    const unsubscribe = onSupabaseAuthStateChange((event, session) => {
      cachedAccessToken = session?.access_token ?? null;
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (event === 'INITIAL_SESSION') initialized = true;
      if (event === 'SIGNED_IN' && initialized && session?.user) reportSignIn();
      if (event === 'SIGNED_OUT') clearSignInReport();
    });

    if (!mayHaveSession()) {
      setIsLoading(false);
      // The document before this one reloaded on a sign-in press: finish it.
      if (resumePending) {
        resumePending = false;
        void startSignIn(false).catch(() => setSignInResumeFailed(true));
      }
      return unsubscribe;
    }
    // A session or an OAuth return is here already, so the account arriving
    // is the sign-in a reload carried over, and App takes the return path.
    resumePending = false;

    // The deadline covers the download too: a stalled chunk settles as signed
    // out, like a stalled session read always has.
    void withDeadline(getSupabaseSession(), AUTH_BOOT_TIMEOUT_MS)
      .then((session) => {
        cachedAccessToken = session?.access_token ?? null;
        setUser(session?.user ?? null);
      })
      .catch(() => {
        cachedAccessToken = null;
        setUser(null);
      })
      .finally(() => setIsLoading(false));

    return unsubscribe;
  }, []);

  const signInWithGoogle = async (returnTo?: string) => {
    // A sign-in from anywhere else must not inherit an older page's return.
    clearAuthReturn();
    // A classroom invite (/play/K7Q2AB), a flashcard deck or the GitHub
    // settings page must not turn into the home page on the way back.
    const path = returnTo ?? currentReturnPath();
    if (path) rememberAuthReturn(path);
    // Signing in is when a signed-out visitor downloads supabase-js.
    await startSignIn(true);
  };

  const signOut = async () => {
    const client = await supabaseForSession();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, signInWithGoogle, signOut, signInResumeFailed }}
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
