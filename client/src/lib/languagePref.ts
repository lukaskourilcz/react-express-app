// The learner's preferred UI language, persisted to the account so it loads on
// sign-in across devices. Stored in Supabase `user_metadata` (like the token
// sign-up bonus flag) — no DB migration needed. The live language still lives
// in the LanguageContext; this module only handles the account-synced default.

import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type { Lang } from '../i18n/LanguageContext';

const META_KEY = 'devquiz_lang';

/** The language saved on the account, or null if none/invalid. */
export function preferredLanguageOf(user: User | null): Lang | null {
  const value = (user?.user_metadata ?? {})[META_KEY];
  return value === 'en' || value === 'cs' ? value : null;
}

/** Persist the preferred language to the account (best-effort). */
export async function savePreferredLanguage(lang: Lang): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.updateUser({ data: { [META_KEY]: lang } });
  } catch {
    // Best-effort — the live language already changed locally.
  }
}
