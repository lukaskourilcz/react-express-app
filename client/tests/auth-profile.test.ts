import { expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { getUserProfile } from '../src/lib/auth';

const account = (user_metadata: Record<string, unknown>) =>
  ({ id: 'user-1', email: 'ada@example.invalid', user_metadata }) as unknown as User;

it('never offers the email address as the name a board could show', () => {
  const profile = getUserProfile(account({}));
  expect(profile.name).toBeUndefined();
  expect(profile.email).toBe('ada@example.invalid');
});

it('uses the name and Google picture the provider supplied', () => {
  expect(getUserProfile(account({ full_name: 'Ada Lovelace', avatar_url: 'https://lh3.googleusercontent.com/a/ada' })))
    .toEqual({ name: 'Ada Lovelace', email: 'ada@example.invalid', picture: 'https://lh3.googleusercontent.com/a/ada' });
  expect(getUserProfile(account({ name: 'Ada', picture: 'https://tracker.example/pixel.png' })).picture).toBeUndefined();
});
