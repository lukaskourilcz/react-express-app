// lib/supabaseClient.ts decides whether to download supabase-js by looking for
// the session under supabase-js's own default key. If the two ever named
// different keys, every returning learner would look signed out, so this
// compares the derivation with the real library for the URL shapes a project
// can have.
import { expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { sessionKeyFor } from '../src/lib/supabaseClient';

it.each([
  'https://abcdefghijklmnopqrst.supabase.co',
  'https://bcdefghijklmnopqrstu.supabase.co/',
  '  https://cdefghijklmnopqrstuv.supabase.co  ',
  'https://DEFGHIJKLMNOPQRSTUVW.supabase.co',
  'https://auth.custom-domain.example',
  'http://127.0.0.1:54321',
])('names the key supabase-js uses for %j', (url) => {
  const client = createClient(url, 'test-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const libraryKey = (client.auth as unknown as { storageKey: string }).storageKey;
  expect(libraryKey).toMatch(/^sb-.+-auth-token$/);
  expect(sessionKeyFor(url)).toBe(libraryKey);
});
