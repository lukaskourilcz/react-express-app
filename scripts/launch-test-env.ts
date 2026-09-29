// The launch and coding-authorization suites run the real handlers against
// stand-in databases. lib/auth.ts, lib/http.ts, lib/rate-limit.ts and
// lib/quiz-tokens.ts read their configuration once, when first imported, so
// those suites import this module before any of them. It removes every
// variable that would point them at a real Supabase project or Redis, or put
// them in production mode, so a developer's exported credentials can neither
// skip those checks nor reach a real service.
for (const key of [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'NODE_ENV',
  'VERCEL_ENV',
  'VERCEL',
]) {
  delete process.env[key];
}
