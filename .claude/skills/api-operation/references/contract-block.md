# Templates for a new operation

The three pieces `/add-api-op` writes, shown for `api/user/[op].ts`. Replace `<op>` with the kebab-case op (`study-plan`), `<Name>` with its PascalCase form (`StudyPlan`) and `<name>` with its camelCase form (`studyPlan`). For another handler, keep the shape and use that handler's dispatch style and route-level limit line (the table in `../SKILL.md`).

## 1. The dispatch line and the op

In `routeHandler` of `api/user/[op].ts`, before the `github-` and `friends-` prefix lines:

```ts
  if (op === '<op>') return handle<Name>(req, res, supabase);
```

The op, below `routeHandler`. The shape follows `handleLeaderboardVisibility` in the same file:

```ts
/** What <op> answers and who may call it. GET only, signed in; the
 * account comes from the verified token, never from the body or query. */
export async function handle<Name>(req: VercelRequest, res: VercelResponse, db: SupabaseClient | null) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'method_not_allowed', 'Method not allowed');
  }
  // Only with an own bucket (section 2); otherwise delete these two lines.
  if (!(await enforceClassRateLimit(req, res, RATE_LIMITS.<name>Address, RATE_LIMITS.<name>))) return;
  const userId = await requireAuthSub(req, res);
  if (!userId) return;
  if (!db) return jsonError(res, 503, 'not_configured', 'Backend is not configured');
  try {
    // Read with withTimeout(db.from(...)...); answer a db error with
    // jsonError(res, 500, 'db_error', '...').
    return res.json({ ok: true });
  } catch {
    return jsonError(res, 500, 'internal_error', 'Internal error');
  }
}
```

Import `enforceClassRateLimit` from `../../lib/rate-limit` when the op takes its own bucket; `jsonError`, `requireAuthSub` and `withTimeout` already come from `../../lib/http`.

## 2. The rate-limit entry

Skip this section when the route-level limit covers the op (`limitUserWrite` for a write, `LIMITED_READS` and `limitRead` for a script-drivable GET). Otherwise add the pair to `RATE_LIMITS` in `lib/rate-limit.ts`, after the entry it relates to:

```ts
  // <op>: why one person needs <n> a minute, and what the address bucket
  // holds (a class behind one NAT at the per-person rate).
  <name>: { key: '<name_snake>', capacity: <n>, refillPerSecond: <n> / 60 },
  <name>Address: { key: '<name_snake>_address', capacity: SHARED_NETWORK_SEATS * <n>, refillPerSecond: (SHARED_NETWORK_SEATS * <n>) / 60 },
```

## 3. The launch-contract block

In `scripts/test-launch-contracts.ts`, import the op beside `handleLeaderboardVisibility`:

```ts
import { handle<Name>, handleLeaderboardVisibility, limitUserWrite } from '../api/user/[op]';
```

Add the function after `leaderboardVisibilityContracts()`:

```ts
/** op=<op>: what it answers. A branch of api/user/[op].ts after the route's
 * limits, signed in only, GET only, private, and limited per account. */
async function <name>Contracts() {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
  // 1. Placement: the exact dispatch line, after the route's limits.
  const route = read('api/user/[op].ts');
  const limited = route.indexOf('if (!(await limitUserRead(req, res, op))) return;');
  const branch = route.indexOf("if (op === '<op>') return handle<Name>(req, res, supabase);");
  assert.ok(limited > 0 && branch > limited, 'op=<op> is a branch of api/user/[op].ts after the route limits');
  assert.ok(branch < route.indexOf("if (op.startsWith('github-'))"), 'and it is reached before the prefix families');

  // 2. Behaviour against a stand-in. lib/auth.ts takes the query's user_id
  //    as the caller, because scripts/launch-test-env.ts clears Supabase.
  const db = {} as never; // grow it into the supabase-js calls the op makes
  const call = async (method: string, user: string | null = 'contract-<op>-1') => {
    const res = mockResponse();
    await handle<Name>({
      method,
      headers: { 'x-forwarded-for': `<op>-${user ?? 'guest'}` },
      query: { op: '<op>', ...(user ? { user_id: user } : {}) },
      socket: {},
    } as never, res as never, db);
    return res;
  };
  assert.equal((await call('GET', null)).statusCode, 401, 'a guest cannot read it');
  const post = await call('POST');
  assert.equal(post.statusCode, 405);
  assert.equal(post.headers.get('allow'), 'GET');
  const ok = await call('GET');
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(ok.body, { ok: true });

  // 3. The limit (only with an own bucket): one account spends its own
  //    budget and nobody else's.
  //    A fresh account per run keeps earlier calls out of the count.
  const stamp = Date.now();
  for (let n = 0; n < RATE_LIMITS.<name>.capacity; n += 1) {
    assert.equal((await call('GET', `contract-<op>-${stamp}`)).statusCode, 200, `read ${n + 1} is allowed`);
  }
  assert.equal((await call('GET', `contract-<op>-${stamp}`)).statusCode, 429, 'one account is bounded at its own rate');
  assert.equal((await call('GET', `contract-<op>-${stamp}-b`)).statusCode, 200, 'which spends nobody else\'s budget');
}
```

`call` keys the address by the user, so the address bucket never fills first. For an op limited by the route (`limitUserWrite`), test the limit through `limitUserWrite` itself, as the end of `leaderboardVisibilityContracts()` does.

Register it in `main()`:

```ts
  await leaderboardVisibilityContracts();
  await <name>Contracts();
```

## 4. A verified-caller case (account data only)

When the op reads or writes one account's rows, add a case to `main()` in `scripts/test-verified-caller.ts`, after "leaderboard visibility reads and writes the token's account":

```ts
    seen.length = 0;
    const <name> = await user('<op>', { account: A, query: { user_id: B.id } });
    assert.equal(<name>.statusCode, 200, JSON.stringify(<name>.body));
    assert.deepEqual(reads('/rest/v1/<table>').map((one) => one.filters.user_id), [A.id], '<op> reads the token\'s account');
    console.log('PASS verified caller: <op> reads the token\'s account');
```
