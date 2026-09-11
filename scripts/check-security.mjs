import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
const app = config.headers.find(rule => rule.source.startsWith('/((?!'));
const header = (rule, name) => rule.headers.find(item => item.key.toLowerCase() === name.toLowerCase())?.value;
const csp = header(app, 'Content-Security-Policy');
const boot = readFileSync('client/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const hash = `'sha256-${createHash('sha256').update(boot).digest('base64')}'`;
const scripts = csp.split(';').find(part => part.trim().startsWith('script-src '));
assert(scripts.includes(hash), 'Prepaint script must match its CSP hash');
assert(!scripts.includes("'unsafe-inline'") && !scripts.includes("'unsafe-eval'"), 'App scripts must not allow inline execution or eval');
for (const directive of ["frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) assert(csp.includes(directive));
assert.equal(header(app, 'X-Content-Type-Options'), 'nosniff');
assert.equal(header(app, 'X-Frame-Options'), 'DENY');
assert.match(header(app, 'Strict-Transport-Security'), /max-age=63072000/);
const sandbox = config.headers.find(rule => rule.source === '/sandbox/(.*)');
assert(header(sandbox, 'Content-Security-Policy').includes("frame-ancestors 'self'"), 'The isolated exercise frame must still be embeddable by the app');
assert(header(sandbox, 'Content-Security-Policy').includes("connect-src 'none'") || header(sandbox, 'Content-Security-Policy').includes("default-src 'none'"));
assert(!header(sandbox, 'X-Frame-Options'), 'Do not deny the exercise frame');
console.log('Security policy contracts passed: main app, theme bootstrap, isolated coding frame.');
const url = process.argv.find(arg => arg.startsWith('--url='))?.slice(6);
if (url) {
  const origin = new URL(url); assert.equal(origin.protocol, 'https:');
  for (const route of ['/', '/sandbox/index.html']) {
    const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(30_000) });
    assert(response.ok, `${route}: ${response.status}`);
    const live = response.headers.get('content-security-policy') || '';
    assert(live.includes(route === '/' ? hash : "frame-ancestors 'self'"), `${route}: expected deployed CSP`);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    console.log(`${origin.origin}${route}: HTTPS ${response.status}, expected security headers present`);
  }
}
