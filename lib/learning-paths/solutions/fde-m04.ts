/** Server-only reference solution and hidden assertions for FDE M03.
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible assertions run one genuine delivery and one example of each
 * refusal. The hidden ones reach what those cannot show: a body edited after
 * signing, a valid signature second in a rotation list, a signature made with
 * the other tenant's secret, a comparison whose result is not the answer
 * `ctx.safeEqual` gave (two worlds: one where it accepts a pair that `===`
 * refuses, one where it refuses the genuine pair), the same webhook id on two
 * connections, a forged delivery that tries to use up a genuine id, the
 * tolerance edges in both directions, a ticket id that belongs to the other
 * tenant, the grant states at their exact boundaries, grant dates that do
 * not parse (they fail closed), and an audit entry for every refusal reason.
 * The oracle signature in the `acceptPair` world has the genuine signature's
 * length, so a receiver that checks lengths before `ctx.safeEqual`, as the
 * lesson's Node sketch does, is graded on the answer `ctx.safeEqual` gives.
 *
 * All four security criteria are critical, so none of them can be averaged
 * away by a correct record shape. `scripts/test-learning-paths.ts` also
 * re-runs this reference with one check removed at a time (no signature check,
 * `===` instead of `ctx.safeEqual`, `===` beside one unused `ctx.safeEqual`
 * call, no replay store, an unscoped replay key, no timestamp tolerance, the
 * tenant taken from the payload, an expired grant accepted, an unparseable
 * expiry read as never expiring, a grant refusal left out of the audit) and
 * requires each to fail its named criterion. */

import type { PathCodeSolution } from '../types';

export const FDE_M04_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m03-webhook-receiver': {
    solution: `type Reason =
  | 'unknown_connection'
  | 'bad_signature'
  | 'stale_timestamp'
  | 'grant_revoked'
  | 'grant_expired'
  | 'bad_payload'
  | 'tenant_mismatch'
  | 'unknown_ticket'
  | 'replayed';

type TicketStatus = 'open' | 'pending' | 'solved';

interface Delivery {
  connectionId: string;
  headers: Record<string, string | undefined>;
  body: string;
}

interface Grant {
  id: string;
  expiresAt: string;
  revokedAt: string | null;
}

interface Connection {
  tenantId: string;
  secret: string;
  grant: Grant;
}

interface Ticket {
  id: string;
  tenantId: string;
  status: TicketStatus;
}

interface AuditEntry {
  webhookId: string | null;
  connectionId: string;
  tenantId: string | null;
  decision: 'accept' | 'refuse';
  reason: Reason | 'accepted';
}

interface ReceiverContext {
  now: string;
  getConnection(id: string): Connection | null;
  sign(secret: string, content: string): string;
  safeEqual(a: string, b: string): boolean;
  claim(key: string): boolean;
  findTicket(tenantId: string, ticketId: string): Ticket | null;
  updateStatus(tenantId: string, ticketId: string, status: TicketStatus): void;
  audit(entry: AuditEntry): void;
}

type Outcome = { ok: true; ticketId: string; status: TicketStatus } | { ok: false; reason: Reason };

interface TicketEvent {
  ticketId: string;
  tenantId: string;
  status: TicketStatus;
}

const TOLERANCE_SECONDS = 300;

const parseEvent = (body: string): TicketEvent | null => {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { type, ticketId, tenantId, status } = value as Record<string, unknown>;
  if (type !== 'ticket.status_changed' || typeof ticketId !== 'string' || typeof tenantId !== 'string') return null;
  if (status !== 'open' && status !== 'pending' && status !== 'solved') return null;
  return { ticketId, tenantId, status };
};

const receiveWebhook = (delivery: Delivery, ctx: ReceiverContext): Outcome => {
  const connectionId = delivery.connectionId;
  const webhookId = delivery.headers['webhook-id'] || null;
  const connection = ctx.getConnection(connectionId);
  const refuse = (reason: Reason): Outcome => {
    ctx.audit({ webhookId, connectionId, tenantId: connection ? connection.tenantId : null, decision: 'refuse', reason });
    return { ok: false, reason };
  };
  if (!connection) return refuse('unknown_connection');

  const timestamp = delivery.headers['webhook-timestamp'] || '';
  const header = delivery.headers['webhook-signature'] || '';
  if (!webhookId || !timestamp || !header) return refuse('bad_signature');
  const expected = 'v1,' + ctx.sign(connection.secret, webhookId + '.' + timestamp + '.' + delivery.body);
  const signed = header.split(' ').some((entry) => ctx.safeEqual(entry, expected));
  if (!signed) return refuse('bad_signature');

  const nowMs = Date.parse(ctx.now);
  if (!/^[0-9]+$/.test(timestamp) || Math.abs(nowMs / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return refuse('stale_timestamp');

  // Fail closed: a date that does not parse counts as already passed.
  const grant = connection.grant;
  if (grant.revokedAt !== null && !(Date.parse(grant.revokedAt) > nowMs)) return refuse('grant_revoked');
  if (!(Date.parse(grant.expiresAt) > nowMs)) return refuse('grant_expired');

  const event = parseEvent(delivery.body);
  if (!event) return refuse('bad_payload');

  const tenantId: string = connection.tenantId;
  if (event.tenantId !== tenantId) return refuse('tenant_mismatch');

  const ticket = ctx.findTicket(tenantId, event.ticketId);
  if (!ticket) return refuse('unknown_ticket');

  if (!ctx.claim(connectionId + ':' + webhookId)) return refuse('replayed');

  ctx.updateStatus(tenantId, ticket.id, event.status);
  ctx.audit({ webhookId, connectionId, tenantId, decision: 'accept', reason: 'accepted' });
  return { ok: true, ticketId: ticket.id, status: event.status };
};`,
    hiddenTests: [
      /* ── signature ─────────────────────────────────────────────────── */
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ bodyAfterSigning: JSON.stringify({ type: 'ticket.status_changed', ticketId: 'TCK-1001', tenantId: 'TEN-4021', status: 'open' }) }), w.ctx); return { out: out, writes: w.writes }; })()",
        expected: { out: { ok: false, reason: 'bad_signature' }, writes: [] },
        label: 'a body edited after signing is refused',
        criterion: 'signature',
      },
      {
        call: "(function () { var w = __world(); var raw = JSON.stringify(__event(null)); var out = receiveWebhook(__deliver({ rawBody: raw, bodyAfterSigning: JSON.stringify(JSON.parse(raw), null, 2) }), w.ctx); return out; })()",
        expected: { ok: false, reason: 'bad_signature' },
        label: 'the same JSON with different spacing is not the body that was signed',
        edge: true,
        criterion: 'signature',
      },
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ extraSignatures: ['v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', 'v1a,c2lnbmVkLWVsc2V3aGVyZQ=='] }), w.ctx); return { out: out, writes: w.writes }; })()",
        expected: { out: { ok: true, ticketId: 'TCK-1001', status: 'solved' }, writes: ['TEN-4021:TCK-1001:solved'] },
        label: 'a valid entry after two others in the signature list is accepted, as during a secret rotation',
        edge: true,
        criterion: 'signature',
      },
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ secret: 'whsec-fixture-kestrel-29ab' }), w.ctx); return { out: out, writes: w.writes }; })()",
        expected: { out: { ok: false, reason: 'bad_signature' }, writes: [] },
        label: 'Kestrel’s secret does not sign for Dunfold’s connection',
        criterion: 'signature',
      },
      {
        call: "(function () { var w = __world(); var d = __deliver(); var bare = d.headers['webhook-signature'].slice(3); var out = receiveWebhook(__deliver({ signature: bare }), w.ctx); return out; })()",
        expected: { ok: false, reason: 'bad_signature' },
        label: 'a signature without the v1 prefix is refused',
        edge: true,
        criterion: 'signature',
      },
      {
        call: "(function () { var genuine = __deliver().headers['webhook-signature']; var w = __world({ acceptPair: ['v1,c2FmZUVxdWFsLW9yYWNsZS1zYW1lLWxlbmd0aC1wYWQ=', genuine] }); var out = receiveWebhook(__deliver({ signature: 'v1,c2FmZUVxdWFsLW9yYWNsZS1zYW1lLWxlbmd0aC1wYWQ=' }), w.ctx); return { out: out, writes: w.writes }; })()",
        expected: { out: { ok: true, ticketId: 'TCK-1001', status: 'solved' }, writes: ['TEN-4021:TCK-1001:solved'] },
        label: 'the accept decision is the answer ctx.safeEqual gives for the header entry and the expected signature',
        criterion: 'signature',
      },
      {
        call: "(function () { var w = __world({ safeEqual: 'never' }); var out = receiveWebhook(__deliver(), w.ctx); return { out: out, writes: w.writes, claims: w.claims }; })()",
        expected: { out: { ok: false, reason: 'bad_signature' }, writes: [], claims: [] },
        label: 'a genuine signature is refused when ctx.safeEqual says it does not match',
        criterion: 'signature',
      },
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ omit: ['webhook-id'] }), w.ctx); return { out: out, audit: w.audit, claims: w.claims }; })()",
        expected: {
          out: { ok: false, reason: 'bad_signature' },
          audit: [{ webhookId: null, connectionId: 'CON-DUN', tenantId: 'TEN-4021', decision: 'refuse', reason: 'bad_signature' }],
          claims: [],
        },
        label: 'a delivery with no webhook id is refused and audited with a null id',
        edge: true,
        criterion: 'signature',
      },

      /* ── replay ────────────────────────────────────────────────────── */
      {
        call: "(function () { var w = __world(); var a = receiveWebhook(__deliver(), w.ctx); var b = receiveWebhook(__deliver({ connectionId: 'CON-KES', event: { ticketId: 'TCK-2001', tenantId: 'TEN-7788', status: 'pending' } }), w.ctx); return { a: a, b: b, writes: w.writes }; })()",
        expected: {
          a: { ok: true, ticketId: 'TCK-1001', status: 'solved' },
          b: { ok: true, ticketId: 'TCK-2001', status: 'pending' },
          writes: ['TEN-4021:TCK-1001:solved', 'TEN-7788:TCK-2001:pending'],
        },
        label: 'the same webhook id on two connections is two deliveries',
        criterion: 'replay',
      },
      {
        call: "(function () { var w = __world(); var forged = receiveWebhook(__deliver({ secret: 'whsec-guessed' }), w.ctx); var genuine = receiveWebhook(__deliver(), w.ctx); return { forged: forged, genuine: genuine, claims: w.claims }; })()",
        expected: {
          forged: { ok: false, reason: 'bad_signature' },
          genuine: { ok: true, ticketId: 'TCK-1001', status: 'solved' },
          claims: ['CON-DUN:msg_2Lk9'],
        },
        label: 'a forged delivery cannot use up the id of the genuine one that follows',
        criterion: 'replay',
      },
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ event: { ticketId: 'TCK-9999' } }), w.ctx); var again = receiveWebhook(__deliver({ event: { ticketId: 'TCK-9999' } }), w.ctx); return { out: out, again: again, claims: w.claims }; })()",
        expected: { out: { ok: false, reason: 'unknown_ticket' }, again: { ok: false, reason: 'unknown_ticket' }, claims: [] },
        label: 'a delivery refused before the claim does not claim its id',
        criterion: 'replay',
      },
      {
        call: '(function () { var w = __world(); var out = receiveWebhook(__deliver({ age: 300 }), w.ctx); return out; })()',
        expected: { ok: true, ticketId: 'TCK-1001', status: 'solved' },
        label: 'exactly 300 seconds old is still inside the tolerance',
        edge: true,
        criterion: 'replay',
      },
      {
        call: '(function () { var w = __world(); var out = receiveWebhook(__deliver({ age: -301 }), w.ctx); return { out: out, writes: w.writes }; })()',
        expected: { out: { ok: false, reason: 'stale_timestamp' }, writes: [] },
        label: 'a timestamp 301 seconds in the future is refused',
        edge: true,
        criterion: 'replay',
      },
      {
        call: "(function () { var w = __world(); var stamp = String(__NOW_SECONDS - 40); return [stamp + '.5', ' ' + stamp, '+' + stamp, '1e9'].map(function (value) { return receiveWebhook(__deliver({ timestamp: value }), w.ctx).reason; }); })()",
        expected: ['stale_timestamp', 'stale_timestamp', 'stale_timestamp', 'stale_timestamp'],
        label: 'a signed timestamp that is not plain digits is refused',
        edge: true,
        criterion: 'replay',
      },
      {
        call: '(function () { var w = __world(); var d = __deliver(); receiveWebhook(d, w.ctx); receiveWebhook(d, w.ctx); return { claims: w.claims, audit: w.audit.map(function (e) { return e.reason; }) }; })()',
        expected: { claims: ['CON-DUN:msg_2Lk9', 'CON-DUN:msg_2Lk9'], audit: ['accepted', 'replayed'] },
        label: 'the replay key is the connection and the webhook id, and the replay is audited',
        criterion: 'replay',
      },

      /* ── tenant isolation ──────────────────────────────────────────── */
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ event: { ticketId: 'TCK-2001' } }), w.ctx); return { out: out, reads: w.reads, writes: w.writes }; })()",
        expected: { out: { ok: false, reason: 'unknown_ticket' }, reads: ['TEN-4021:TCK-2001'], writes: [] },
        label: 'Kestrel’s ticket id under Dunfold’s own tenant misses the scoped lookup',
        criterion: 'tenant-isolation',
      },
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ event: { tenantId: 'TEN-7788' } }), w.ctx); return { out: out, reads: w.reads, writes: w.writes, audit: w.audit }; })()",
        expected: {
          out: { ok: false, reason: 'tenant_mismatch' },
          reads: [],
          writes: [],
          audit: [{ webhookId: 'msg_2Lk9', connectionId: 'CON-DUN', tenantId: 'TEN-4021', decision: 'refuse', reason: 'tenant_mismatch' }],
        },
        label: 'a payload naming Kestrel for Dunfold’s own ticket is refused, and the audit names Dunfold',
        edge: true,
        criterion: 'tenant-isolation',
      },
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ connectionId: 'CON-KES', event: { ticketId: 'TCK-1001', tenantId: 'TEN-4021' } }), w.ctx); return { out: out, reads: w.reads, writes: w.writes }; })()",
        expected: { out: { ok: false, reason: 'tenant_mismatch' }, reads: [], writes: [] },
        label: 'Kestrel’s connection cannot reach Dunfold’s ticket either',
        criterion: 'tenant-isolation',
      },
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ connectionId: 'CON-KES', event: { ticketId: 'TCK-2001', tenantId: 'TEN-7788', status: 'pending' } }), w.ctx); return { out: out, reads: w.reads, writes: w.writes }; })()",
        expected: { out: { ok: true, ticketId: 'TCK-2001', status: 'pending' }, reads: ['TEN-7788:TCK-2001'], writes: ['TEN-7788:TCK-2001:pending'] },
        label: 'Kestrel’s connection updates Kestrel’s own ticket',
        criterion: 'tenant-isolation',
      },

      /* ── permission freshness ──────────────────────────────────────── */
      {
        call: "(function () { var w = __world({ grant: { revokedAt: '2026-04-01T12:00:00Z' } }); var out = receiveWebhook(__deliver(), w.ctx); return { out: out, reads: w.reads, claims: w.claims, writes: w.writes }; })()",
        expected: { out: { ok: false, reason: 'grant_revoked' }, reads: [], claims: [], writes: [] },
        label: 'a grant revoked yesterday refuses before any read, claim or write',
        criterion: 'permission-freshness',
      },
      {
        call: "(function () { var w = __world({ grant: { expiresAt: '2026-04-02T08:00:00Z', revokedAt: '2026-04-02T07:00:00Z' } }); return receiveWebhook(__deliver(), w.ctx); })()",
        expected: { ok: false, reason: 'grant_revoked' },
        label: 'a grant that is both revoked and expired is reported as revoked',
        edge: true,
        criterion: 'permission-freshness',
      },
      {
        call: "(function () { var w = __world({ grant: { expiresAt: '2026-04-02T09:00:00Z' } }); return receiveWebhook(__deliver(), w.ctx); })()",
        expected: { ok: false, reason: 'grant_expired' },
        label: 'a grant expiring exactly now has already expired',
        edge: true,
        criterion: 'permission-freshness',
      },
      {
        call: "(function () { var w = __world({ grant: { revokedAt: '2026-04-02T09:00:00Z' } }); return receiveWebhook(__deliver(), w.ctx); })()",
        expected: { ok: false, reason: 'grant_revoked' },
        label: 'a revocation dated exactly now has taken effect',
        edge: true,
        criterion: 'permission-freshness',
      },
      {
        call: "(function () { return [{ expiresAt: '' }, { expiresAt: 'next week' }, { revokedAt: 'yesterday' }, { revokedAt: '', expiresAt: 'soon' }].map(function (grant) { var w = __world({ grant: grant }); return [receiveWebhook(__deliver(), w.ctx).reason, w.reads.length, w.claims.length, w.writes.length]; }); })()",
        expected: [
          ['grant_expired', 0, 0, 0],
          ['grant_expired', 0, 0, 0],
          ['grant_revoked', 0, 0, 0],
          ['grant_revoked', 0, 0, 0],
        ],
        label: 'a grant date that does not parse fails closed: expired, or revoked when revokedAt is set',
        edge: true,
        criterion: 'permission-freshness',
      },
      {
        call: "(function () { var w = __world({ grant: { revokedAt: '2026-04-02T16:00:00Z' } }); var out = receiveWebhook(__deliver(), w.ctx); return { out: out, writes: w.writes }; })()",
        expected: { out: { ok: true, ticketId: 'TCK-1001', status: 'solved' }, writes: ['TEN-4021:TCK-1001:solved'] },
        label: 'a revocation dated after now has not taken effect yet',
        edge: true,
        criterion: 'permission-freshness',
      },

      /* ── core ──────────────────────────────────────────────────────── */
      {
        call: "(function () { var w = __world(); return ['{not json', '[]', 'null', '\"text\"', JSON.stringify({ type: 'ticket.created', ticketId: 'TCK-1001', tenantId: 'TEN-4021', status: 'open' }), JSON.stringify({ type: 'ticket.status_changed', ticketId: 1001, tenantId: 'TEN-4021', status: 'open' }), JSON.stringify({ type: 'ticket.status_changed', ticketId: 'TCK-1001', status: 'open' })].map(function (body) { return receiveWebhook(__deliver({ rawBody: body }), w.ctx).reason; }).concat([w.writes.length, w.claims.length]); })()",
        expected: ['bad_payload', 'bad_payload', 'bad_payload', 'bad_payload', 'bad_payload', 'bad_payload', 'bad_payload', 0, 0],
        label: 'bodies that do not parse or miss a field are bad payloads, and nothing is claimed or written',
      },
      {
        call: "(function () { var w = __world(); receiveWebhook(__deliver({ connectionId: 'CON-XYZ' }), w.ctx); receiveWebhook(__deliver({ age: 900 }), w.ctx); receiveWebhook(__deliver(), w.ctx); receiveWebhook(__deliver({ event: { status: 'pending' }, id: 'msg_3Rt8' }), w.ctx); return w.audit.map(function (e) { return [e.webhookId, e.tenantId, e.decision, e.reason]; }); })()",
        expected: [
          ['msg_2Lk9', null, 'refuse', 'unknown_connection'],
          ['msg_2Lk9', 'TEN-4021', 'refuse', 'stale_timestamp'],
          ['msg_2Lk9', 'TEN-4021', 'accept', 'accepted'],
          ['msg_3Rt8', 'TEN-4021', 'accept', 'accepted'],
        ],
        label: 'every delivery writes exactly one audit entry',
      },
      {
        call: "(function () { return [[{ grant: { revokedAt: '2026-04-01T12:00:00Z' } }, {}], [{ grant: { expiresAt: '2026-04-02T08:00:00Z' } }, {}], [{}, { rawBody: '{not json' }], [{}, { event: { ticketId: 'TCK-9999' } }]].map(function (c) { var w = __world(c[0]); receiveWebhook(__deliver(c[1]), w.ctx); return w.audit; }); })()",
        expected: [
          [{ webhookId: 'msg_2Lk9', connectionId: 'CON-DUN', tenantId: 'TEN-4021', decision: 'refuse', reason: 'grant_revoked' }],
          [{ webhookId: 'msg_2Lk9', connectionId: 'CON-DUN', tenantId: 'TEN-4021', decision: 'refuse', reason: 'grant_expired' }],
          [{ webhookId: 'msg_2Lk9', connectionId: 'CON-DUN', tenantId: 'TEN-4021', decision: 'refuse', reason: 'bad_payload' }],
          [{ webhookId: 'msg_2Lk9', connectionId: 'CON-DUN', tenantId: 'TEN-4021', decision: 'refuse', reason: 'unknown_ticket' }],
        ],
        label: 'a refused grant, a bad payload and an unknown ticket each write one audit entry',
      },
      {
        call: "(function () { var w = __world(); var d = __deliver({ event: { status: 'pending', note: 'x'.repeat(20000) } }); Object.freeze(d.headers); Object.freeze(d); var before = JSON.stringify(d); var out = receiveWebhook(d, w.ctx); return { out: out, unchanged: JSON.stringify(d) === before }; })()",
        expected: { out: { ok: true, ticketId: 'TCK-1001', status: 'pending' }, unchanged: true },
        label: 'a frozen delivery with a large body is applied and left unchanged',
        edge: true,
      },
      {
        call: "(function () { var w = __world(); var out = receiveWebhook(__deliver({ event: { status: 'open' } }), w.ctx); return { out: out, writes: w.writes }; })()",
        expected: { out: { ok: true, ticketId: 'TCK-1001', status: 'open' }, writes: ['TEN-4021:TCK-1001:open'] },
        label: 'the status written is the status the payload carries',
      },
    ],
  },
};
