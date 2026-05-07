# Authentication

## Quick mental model

Three auth states the app handles:

| State | UI | API perspective |
| --- | --- | --- |
| Anonymous | Quiz works (questions are static); no streak, no leaderboard | Server sees no auth0_id; profile features 401 / 503 |
| Guest | "Pick a display name", stats sync to a stable client-side ID | Server treats `local|<timestamp>` like any other auth0_id |
| Auth0 | Full sign-in via Universal Login | Server should verify the Bearer JWT (TODO) and use `payload.sub` |

Guest mode is the bridge: it's how new users get value without committing to
sign-up, and how the team tested the entire flow without an Auth0 tenant.

## Auth0 configuration

Two applications in the Auth0 dashboard:

1. **SPA application** — for `client/` (web).
   - Domain: `<your-tenant>.auth0.com`
   - Client ID: copy to `VITE_AUTH0_CLIENT_ID`
   - Allowed Callback URLs: `https://your-app.vercel.app, http://localhost:3000`
   - Allowed Logout URLs: same
   - Allowed Web Origins: same
2. **Native application** — for `mobile/` (iOS + Android).
   - Allowed Callback URLs (iOS): `com.devquiz.app://YOUR_TENANT.auth0.com/ios/com.devquiz/callback`
   - Allowed Callback URLs (Android): `com.devquiz.app://YOUR_TENANT.auth0.com/android/com.devquiz/callback`

If you want server-side JWT verification (recommended; see TODO below):

3. **API** — represents your backend.
   - Identifier: e.g. `https://api.devquiz.com` (this is the `audience` value)
   - Signing algorithm: RS256

## Web flow

```
[user]                           [client/]                          [Auth0]
   │                                │                                  │
   │  click Log in                  │                                  │
   ├───────────────────────────────►│                                  │
   │                                │  loginWithRedirect()             │
   │                                ├─────────────────────────────────►│
   │                                │                                  │
   │  ◄────── Auth0 hosted page ────────────────────────────────────────┤
   │                                │                                  │
   │  enter creds                   │                                  │
   ├────────────────────────────────────────────────────────────────────►│
   │                                │                                  │
   │  ◄────── redirect with code ───┤                                  │
   │                                │  exchange code for tokens        │
   │                                ├─────────────────────────────────►│
   │                                │  ◄── id_token + access_token ────┤
   │                                │                                  │
   │ session set in localStorage    │                                  │
   │ (cacheLocation: 'localstorage')│                                  │
```

Implementation in `client/src/main.tsx`:
```tsx
<Auth0Provider
  domain={auth0Domain}
  clientId={auth0ClientId}
  authorizationParams={{
    redirect_uri: window.location.origin,
    ...(auth0Audience ? { audience: auth0Audience } : {}),
  }}
  cacheLocation="localstorage"
  useRefreshTokens
>
```

The web client treats Auth0 as **optional**. If env vars are missing, the
provider isn't rendered and `useAuth0()` throws — caught by `try/catch` blocks
in components that use it.

## Mobile flow (Flutter)

`auth0_flutter` opens a system browser (ASWebAuthenticationSession on iOS,
Custom Tabs on Android) for Universal Login. After a successful login,
credentials are stored in the OS keychain via the package's
`CredentialsManager`.

`mobile/lib/auth/auth_service.dart` falls back to a guest-mode display-name
flow when `AUTH0_DOMAIN` / `AUTH0_CLIENT_ID` aren't set via `--dart-define`.
On cold start, it tries `credentialsManager.credentials()` to silently
refresh.

## Server side: the TODO

**Today** (as of the last commit): API handlers like `api/user/[op].ts`
accept `auth0_id` directly in the request body and trust it. This is
**not** secure. Anyone can `curl -X POST` to overwrite anyone's stats.

The mitigation is RLS on the database side — once Supabase is configured
with Auth0 as a third-party JWT provider, the policies in
`supabase-schema-002.sql` (`auth0_id = auth.jwt() ->> 'sub'`) enforce
per-user access at the DB layer. **But** the API uses the Supabase
*anon key* and never forwards the user's JWT, so RLS effectively grants
read/write to everyone via the API.

To close this gap:

1. **Frontend**: get the access token after `loginWithRedirect()`:
   ```tsx
   const token = await getAccessTokenSilently();
   fetch('/api/user/stats', {
     headers: { Authorization: `Bearer ${token}` },
     ...
   });
   ```
2. **API**: verify the JWT before trusting `auth0_id`:
   ```ts
   import { createRemoteJWKSet, jwtVerify } from 'jose';
   const JWKS = createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`));

   const auth = req.headers.authorization;
   if (!auth?.startsWith('Bearer ')) return jsonError(res, 401, 'unauthorized', '...');
   const { payload } = await jwtVerify(auth.slice(7), JWKS, {
     issuer: `https://${AUTH0_DOMAIN}/`,
     audience: AUTH0_AUDIENCE,
   });
   const verifiedSub = payload.sub as string;
   ```
3. **Always use `verifiedSub`**, never `body.auth0_id`.
4. **Configure Supabase** Project Settings → Auth → Third-party Auth → Add Auth0 as a provider. After this, RLS policies that use `auth.jwt() ->> 'sub'` actually do something useful.

This is documented as a TODO in `api/user/[op].ts` and tracked in `docs/operations.md`.

## Guest mode internals

```ts
// Web (client/src/lib/...)
//   No code path; the web client requires Auth0 to be configured for sign-in.
//   This is acceptable because the web app is at /profile, which is itself
//   gated.
//
// Mobile (mobile/lib/auth/auth_service.dart)
const id = 'local|${DateTime.now().millisecondsSinceEpoch}';
await prefs.setString('auth.sub', id);
```

The server treats `auth0_id` as opaque — it doesn't care whether the value
came from Auth0 or the guest-mode generator. Guest mode is **per-device**:
clearing app data wipes the identity. There's no recovery.

## Logout

- Web: `logout({ logoutParams: { returnTo: window.location.origin } })`
- Mobile (Auth0): `Auth0().webAuthentication(scheme).logout()` then clear local prefs.
- Mobile (guest): just clear local prefs.

## Security checklist

- ✅ Brand secret (`SESSION_SECRET`) only on server, never in client bundle.
- ✅ `react-syntax-highlighter` content is server-controlled (static question bank), not user input.
- ✅ CSP in `vercel.json` allows only `self` + jsdelivr (for Pyodide) + Auth0 + Supabase.
- ⚠️ JWT verification on the server is not yet implemented (TODO above).
- ⚠️ RLS depends on Supabase third-party Auth0 setup, which is a manual step.
- ✅ No service role key referenced anywhere in the API.
