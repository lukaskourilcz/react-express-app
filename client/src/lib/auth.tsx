import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) {
      throw new Error(
        'Sign-in is not available: Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
      );
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
    await supabase.auth.signOut();
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
  return {
    name: (meta.full_name || meta.name || user?.email) as string | undefined,
    email: user?.email,
    picture: (meta.avatar_url || meta.picture) as string | undefined,
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
