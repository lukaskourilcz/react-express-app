// Centralized runtime config for the mobile app.
//
// Values are committed in app.json under `expo.extra` (so `expo start` works
// after a fresh clone without creating a .env), but any EXPO_PUBLIC_* env var
// still overrides — handy for pointing a dev build at a LAN API or a staging
// Supabase project. Only PUBLIC values belong here (the Supabase anon key is
// safe to ship; it's protected by row-level security).
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
};

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  extra.apiBaseUrl ||
  ''
).replace(/\/$/, '');
