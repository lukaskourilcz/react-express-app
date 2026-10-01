import { HttpResponse } from 'msw';
// Supabase Auth (GoTrue v2) as the browser meets it, for tests that run the
// real supabase-js against MSW. Invented test data only. The shapes are the
// ones GoTrue v2.197.0 answered a local run with (1 Oct 2026), under the API
// version supabase-js asks for (`X-Supabase-Api-Version: 2024-01-01`): errors
// carry that header, `code` and `message`, a weak password adds
// `weak_password.reasons`, a sign-up that needs a confirmation answers with
// the user alone, and an address that already has a confirmed account
// answers with a user without identities. Successes carry no version header.

export const PROJECT_URL = 'https://testprojectref.supabase.co';
export const ANON_KEY = 'test-anon-key';
export const STORAGE_KEY = 'sb-testprojectref-auth-token';
export const AUTH = `${PROJECT_URL}/auth/v1`;

const API_VERSION = { 'x-supabase-api-version': '2024-01-01' };
const NOW = '2026-10-01T09:00:00.000000Z';

/** A user made with an email and password: no name, no picture, and an
 * `email` identity instead of a Google one. */
export function emailUser({ id = '6b1c2a54-0000-4000-8000-0000000000e1', email = 'ada@example.com', confirmed = true } = {}) {
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    ...(confirmed ? { email_confirmed_at: NOW, confirmed_at: NOW, last_sign_in_at: NOW } : { confirmation_sent_at: NOW }),
    phone: '',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { email, email_verified: confirmed, phone_verified: false, sub: id },
    identities: [{
      identity_id: '0f0e0d0c-0000-4000-8000-0000000000a1',
      id,
      user_id: id,
      identity_data: { email, email_verified: confirmed, phone_verified: false, sub: id },
      provider: 'email',
      last_sign_in_at: NOW,
      created_at: NOW,
      updated_at: NOW,
      email,
    }],
    created_at: NOW,
    updated_at: NOW,
    is_anonymous: false,
  };
}

export function sessionFor(user: ReturnType<typeof emailUser>, accessToken = 'access-token-email') {
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: `${accessToken}-refresh`,
    user,
  };
}

/** A GoTrue error answer. */
export function authError(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return HttpResponse.json({ code, message, ...extra }, { status, headers: API_VERSION });
}

export const gotrueOk = (body: unknown) => HttpResponse.json(body as never);
