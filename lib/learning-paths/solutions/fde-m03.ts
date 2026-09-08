/** Server-only reference solution and hidden assertions for FDE M03.
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible assertions run one session: Dunfold Freight, a valid grant, and
 * arguments that ask for the wrong tenant. The hidden ones reach what that
 * session cannot show — the other tenant reading its own rows, a grant issued
 * to a different tenant, an expiry that falls exactly on the request instant,
 * a revocation dated after the request, a grant that is both revoked and
 * expired, a refusal that must not touch the store, and a call with no
 * `arguments` object at all.
 *
 * The two boundary criteria are critical, so none of it can be averaged away
 * by a correct record shape. */

import type { PathCodeSolution } from '../types';

export const FDE_M03_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m03-tenant-tool-wrapper': {
    solution: `const TOOLS = ['orders.read'];

const callTool = (session, request, store) => {
  if (TOOLS.indexOf(request.tool) === -1) return { ok: false, reason: 'unknown_tool' };

  const tenantId = session.tenantId;
  const args = request.arguments || {};

  const grant = session.grants.find(one => one.scope === request.tool && one.tenantId === tenantId);
  if (!grant) return { ok: false, reason: 'no_grant' };

  const at = Date.parse(session.at);
  if (grant.revokedAt && Date.parse(grant.revokedAt) <= at) return { ok: false, reason: 'grant_revoked' };
  if (Date.parse(grant.expiresAt) <= at) return { ok: false, reason: 'grant_expired' };

  const rows = store.queryOrders(tenantId, { status: args.status });
  return {
    ok: true,
    records: rows.map(row => ({ id: row.id, tenantId: row.tenantId, status: row.status, total: row.total })),
  };
};`,
    hiddenTests: [
      {
        call:
          "(function () { var s = __store(); var session = __session({ tenantId: 'TEN-7788', grants: [__grant('TEN-7788', null)] }); var out = callTool(session, { tool: 'orders.read', arguments: {} }, s); return { ids: __ids(out), tenants: __tenants(out), reads: s.reads }; })()",
        expected: { ids: ['ORD-2001', 'ORD-2002'], tenants: ['TEN-7788'], reads: ['queryOrders:TEN-7788'] },
        label: 'the other tenant reads its own two orders and nothing of the first tenant',
        criterion: 'tenant-isolation',
      },
      {
        call:
          "(function () { var out = callTool(__session(), { tool: 'orders.read', arguments: { tenantId: 'TEN-7788', status: 'open' } }, __store()); return { ids: __ids(out), tenants: __tenants(out) }; })()",
        expected: { ids: ['ORD-1001', 'ORD-1005'], tenants: ['TEN-4021'] },
        label: 'the status argument still narrows, and the tenant argument beside it is still ignored',
        edge: true,
        criterion: 'tenant-isolation',
      },
      {
        call:
          "(function () { var s = __store(); var out = callTool(__session({ grants: [__grant('TEN-7788', null)] }), { tool: 'orders.read', arguments: {} }, s); return { ok: out.ok, reason: out.reason, reads: s.reads.length }; })()",
        expected: { ok: false, reason: 'no_grant', reads: 0 },
        label: 'a grant issued to another tenant does not authorize this session',
        edge: true,
        criterion: 'tenant-isolation',
      },
      {
        call:
          "(function () { var session = __session({ grants: [__grant('TEN-4021', { expiresAt: '2026-04-02T09:00:00Z' })] }); return callTool(session, { tool: 'orders.read', arguments: {} }, __store()); })()",
        expected: { ok: false, reason: 'grant_expired' },
        label: 'a grant expiring exactly at the request instant has already expired',
        edge: true,
        criterion: 'permission-freshness',
      },
      {
        call:
          "(function () { var session = __session({ grants: [__grant('TEN-4021', { revokedAt: '2026-04-02T16:00:00Z' })] }); var out = callTool(session, { tool: 'orders.read', arguments: {} }, __store()); return { ok: out.ok, ids: __ids(out) }; })()",
        expected: { ok: true, ids: ['ORD-1001', 'ORD-1002', 'ORD-1005'] },
        label: 'a revocation dated after this request has not taken effect yet',
        edge: true,
        criterion: 'permission-freshness',
      },
      {
        call:
          "(function () { var session = __session({ grants: [__grant('TEN-4021', { expiresAt: '2026-04-02T08:00:00Z', revokedAt: '2026-04-02T07:00:00Z' })] }); return callTool(session, { tool: 'orders.read', arguments: {} }, __store()); })()",
        expected: { ok: false, reason: 'grant_revoked' },
        label: 'a grant that is both revoked and expired is reported as revoked',
        edge: true,
        criterion: 'permission-freshness',
      },
      {
        call:
          "(function () { var s = __store(); var out = callTool(__session({ grants: [] }), { tool: 'orders.read', arguments: { tenantId: 'TEN-7788' } }, s); return { reason: out.reason, reads: s.reads.length }; })()",
        expected: { reason: 'no_grant', reads: 0 },
        label: 'a refused call reads nothing, so the decision really does come before the fetch',
        criterion: 'permission-freshness',
      },
      {
        call: "(function () { var out = callTool(__session(), { tool: 'orders.read' }, __store()); return { ok: out.ok, ids: __ids(out) }; })()",
        expected: { ok: true, ids: ['ORD-1001', 'ORD-1002', 'ORD-1005'] },
        label: 'a call with no arguments object at all still works',
        edge: true,
      },
    ],
  },
};
