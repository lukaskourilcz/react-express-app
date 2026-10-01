import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  forgetStoredSession,
  getSupabaseSession,
  hasStoredSession,
  loadSupabase,
  mayHaveSession,
  onSupabaseAuthStateChange,
  supabaseForSession,
  supabaseLoadFailed,
} from './supabaseClient';
import { apiFetch } from './api';
import { registerAccessTokenReader } from './roadmap';
import { clearAccountData } from './accountData';
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
/** supabase-js's AuthRetryableFetchError (no answer, or a 502/503/504) or any
 * other 5xx: the server did not decide anything. Read by name and status, as
 * importing supabase-js here would put it back in the first page load. */
function serverUnreachable(error: { name?: string; status?: number }): boolean {
  return error.name === 'AuthRetryableFetchError' || (typeof error.status === 'number' && (error.status === 0 || error.status >= 500));
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

// Whether an account was signed in on this page: a session was stored when it
// opened (supabase-js may still find it expired), or one arrived since. Only
// then does a SIGNED_OUT forget the account's data on this device; supabase-js
// also sends one for a guest's failed OAuth return, and a guest keeps theirs.
let accountSignedIn = typeof window !== 'undefined' && hasStoredSession();

/** How far a sign-out reaches. `local` ends this browser's session only (the
 * header's Log out); `global` also ends every other session of the account,
 * on every device (Profile → Account). */
export type SignOutScope = 'local' | 'global';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Sign in with Google. `returnTo` is a path on this site to come back to
   * after the round trip (see lib/authReturn.ts); without it the visitor comes
   * back to the page the sign-in was pressed on. Pages do not call this: they
   * open the sign-in dialog (lib/signInDialog.ts), whose Google button does.
   * Email and password sign-in lives in lib/emailAuth.ts. */
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  /** Signs out this browser, or every device with `'global'`. Either way
   * supabase-js announces SIGNED_OUT here, which forgets the account's data
   * on this device. */
  signOut: (scope?: SignOutScope) => Promise<void>;
  /** A sign-in pressed before a reload failed when this document finished it
   * (there is no button of that press left to say so). */
  signInResumeFailed: boolean;
  /** A password-reset link opened this session (supabase-js's
   * PASSWORD_RECOVERY), until it signs out. The app shell then opens
   * /reset-password once, wherever the link landed. */
  passwordRecovery: boolean;
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
  passwordRecovery: false,
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
  const [passwordRecovery, setPasswordRecovery] = useState(false);
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
    // TOKEN_REFRESHED are never reported, so the log records real logins. A
    // password-reset link signs in too, announced as PASSWORD_RECOVERY.
    // supabase-js also sends SIGNED_IN for a session it restores from storage,
    // while it initializes and before INITIAL_SESSION. The eager client sent
    // that before this effect ran; a client loaded on demand can attach this
    // listener first, and the order keeps the restore out of the log.
    let initialized = false;
    const unsubscribe = onSupabaseAuthStateChange((event, session) => {
      cachedAccessToken = session?.access_token ?? null;
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (session?.user) accountSignedIn = true;
      if (event === 'INITIAL_SESSION') initialized = true;
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && initialized && session?.user) reportSignIn();
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        clearSignInReport();
        // The next person on this device starts from nothing, not from the
        // progress, XP, coins, bookmarks and drafts of the account that left.
        if (accountSignedIn) clearAccountData();
        accountSignedIn = false;
      }
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
        if (session?.user) accountSignedIn = true;
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

  // Log out of this browser without the server: what supabase-js's SIGNED_OUT
  // would have done here, since it announces none.
  const forgetSessionHere = () => {
    forgetStoredSession();
    cachedAccessToken = null;
    clearSignInReport();
    clearAccountData();
    accountSignedIn = false;
    setPasswordRecovery(false);
    setUser(null);
  };

  // supabase-js signs out every device by default. Log out means this
  // browser; signing out everywhere is its own, explicit action.
  //
  // Offline, or while the sign-in service answers 5xx, supabase-js refuses a
  // local sign-out and keeps the session, so Log out did nothing. Ending the
  // session on this device needs nothing from the server, so it ends here
  // anyway; the server's copy of this session lapses with its refresh token.
  // Signing out everywhere does need the server, and still says it failed.
  const signOut = async (scope: SignOutScope = 'local') => {
    const client = await supabaseForSession();
    if (!client) {
      // supabase-js could not load (offline, a failed download).
      if (scope === 'local' && hasStoredSession()) forgetSessionHere();
      return;
    }
    const { error } = await client.auth.signOut({ scope });
    if (!error) return;
    if (scope === 'local' && serverUnreachable(error)) {
      forgetSessionHere();
      return;
    }
    throw error;
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, signInWithGoogle, signOut, signInResumeFailed, passwordRecovery }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Display fields from a Supabase user. Google populates user_metadata; an
// account made with an email and password has no name or picture there.
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
    // Never the email: this name can reach a public board, and an address is
    // not a name anybody chose to publish. Without one, a board says "Learner".
    name: (meta.full_name || meta.name) as string | undefined,
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
