// Supabase client for React Native. Uses AsyncStorage for session persistence
// and the PKCE flow for OAuth on mobile. `react-native-url-polyfill` provides
// the URL/`URLSearchParams` globals supabase-js relies on.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase config missing. Set supabaseUrl / supabaseAnonKey in app.json (expo.extra) or EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env.',
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          // No URL session detection on native — we exchange the OAuth code
          // ourselves after the in-app browser returns (see lib/auth.tsx).
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      })
    : null;
