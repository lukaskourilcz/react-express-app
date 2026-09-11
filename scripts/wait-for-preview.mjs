const url = process.env.TEST_BASE_URL || 'http://localhost:4173';
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
  await new Promise(resolve => setTimeout(resolve, 500));
}
if (!ready) throw new Error(`Preview did not start at ${url}`);
