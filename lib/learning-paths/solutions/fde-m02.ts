/** Server-only reference solution and hidden assertions for FDE M02.
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible assertions run the default fixture: three pages, one skipped
 * customer id, one duplicate, one throttled read. The hidden ones build their
 * own page sets to reach what that fixture cannot show — a third delivery of
 * the same id, a ticket with no id at all, an empty page in the middle of the
 * walk, every page throttled, a page that never stops throttling, and a
 * rejection that is not a 429 and must not be retried. */

import type { PathCodeSolution } from '../types';

export const FDE_M02_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m02-connector-adapter': {
    solution: `const syncTickets = async client => {
  const records = [];
  const seen = new Set();
  let skipped = 0;
  let duplicates = 0;

  const text = value => (typeof value === 'string' ? value.trim() : '');

  const fetchPage = async cursor => {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await client.listTickets(cursor);
      } catch (error) {
        if (!error || error.status !== 429 || attempt >= 3) throw error;
        await sleep(error.retryAfterMs);
      }
    }
  };

  let cursor = null;
  for (;;) {
    const page = await fetchPage(cursor);

    for (const ticket of page.tickets) {
      const id = text(ticket.id);
      const customerId = text(ticket.customerId);
      if (id === '' || customerId === '') {
        skipped += 1;
        continue;
      }
      if (seen.has(id)) {
        duplicates += 1;
        continue;
      }
      seen.add(id);
      records.push({ id, customerId, subject: ticket.subject });
    }

    if (page.nextCursor === null || page.nextCursor === undefined) break;
    cursor = page.nextCursor;
  }

  records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { records, skipped, duplicates };
};`,
    hiddenTests: [
      {
        call:
          "(function () { var pages = [{ cursor: null, nextCursor: 'b', tickets: [{ id: 'TCK-3001', customerId: 'CUS-1', subject: 'First' }] }, { cursor: 'b', nextCursor: 'c', tickets: [{ id: 'TCK-3001', customerId: 'CUS-1', subject: 'Second' }] }, { cursor: 'c', nextCursor: null, tickets: [{ id: 'TCK-3001', customerId: 'CUS-9', subject: 'Third' }] }]; return syncTickets(__makeClient(pages, { throttleCursor: '__none' })).then(function (out) { return { records: out.records, skipped: out.skipped, duplicates: out.duplicates }; }); })()",
        expected: { records: [{ id: 'TCK-3001', customerId: 'CUS-1', subject: 'First' }], skipped: 0, duplicates: 2 },
        label: 'a third delivery of one id is a second duplicate, and the first copy is the one that stays',
        edge: true,
        async: true,
      },
      {
        call:
          "(function () { var pages = [{ cursor: null, nextCursor: 'b', tickets: [{ customerId: 'CUS-2', subject: 'No id at all' }, { id: 'TCK-4001', subject: 'No customer' }] }, { cursor: 'b', nextCursor: null, tickets: [{ id: 'TCK-4001', subject: 'No customer' }, { id: 'TCK-4002', customerId: 'CUS-2', subject: 'Usable' }] }]; return syncTickets(__makeClient(pages, { throttleCursor: '__none' })).then(function (out) { return { ids: __ids(out), skipped: out.skipped, duplicates: out.duplicates }; }); })()",
        expected: { ids: ['TCK-4002'], skipped: 3, duplicates: 0 },
        label: 'a missing id is a skip, and a second delivery of a skipped ticket is a skip again',
        edge: true,
        async: true,
      },
      {
        call:
          "(function () { var pages = [{ cursor: null, nextCursor: 'b', tickets: [] }, { cursor: 'b', nextCursor: 'c', tickets: [] }, { cursor: 'c', nextCursor: null, tickets: [{ id: 'TCK-5001', customerId: 'CUS-3', subject: 'Last page' }] }]; return syncTickets(__makeClient(pages, { throttleCursor: '__none' })).then(__ids); })()",
        expected: ['TCK-5001'],
        label: 'an empty page in the middle does not end the walk',
        edge: true,
        async: true,
      },
      {
        call:
          "(function () { var pages = [{ cursor: null, nextCursor: 'b', tickets: [{ id: 'TCK-9', customerId: 'CUS-4', subject: 'Nine' }, { id: 'TCK-31', customerId: 'CUS-4', subject: 'Thirty-one' }] }, { cursor: 'b', nextCursor: null, tickets: [{ id: 'TCK-10', customerId: 'CUS-4', subject: 'Ten' }] }]; return syncTickets(__makeClient(pages, { throttleCursor: '__none' })).then(__ids); })()",
        expected: ['TCK-10', 'TCK-31', 'TCK-9'],
        label: 'the sort is textual and spans pages',
        async: true,
      },
      {
        call:
          "(function () { var c = __makeClient(__PAGES, { throttleCursor: '*', retryAfterMs: 20 }); return syncTickets(c).then(function (out) { return { ids: __ids(out), requests: c.requests.length }; }); })()",
        expected: { ids: ['TCK-1001', 'TCK-1002', 'TCK-1004', 'TCK-1009'], requests: 6 },
        label: 'every page throttled once: three pages, six requests, nothing lost',
        edge: true,
        async: true,
        criterion: 'throttling',
      },
      {
        call:
          "(function () { var c = __makeClient(__PAGES, { throttleCursor: 'p2', throttles: 99, retryAfterMs: 10 }); return syncTickets(c).then(function () { return 'resolved'; }, function (error) { return { status: error && error.status, attempts: __attempts(c, 'p2').length }; }); })()",
        expected: { status: 429, attempts: 4 },
        label: 'a page that never stops throttling is given up on after three retries',
        edge: true,
        async: true,
        criterion: 'throttling',
      },
      {
        call:
          "(function () { var c = __makeClient(__PAGES, { throttleCursor: '__none', failWith: { cursor: 'p2', status: 500, message: 'ticket store unavailable' } }); return syncTickets(c).then(function () { return 'resolved'; }, function (error) { return { status: error && error.status, attempts: __attempts(c, 'p2').length }; }); })()",
        expected: { status: 500, attempts: 1 },
        label: 'a rejection that is not a 429 is not retried and reaches the caller',
        edge: true,
        async: true,
      },
      {
        call:
          '(function () { var c = __client(); return syncTickets(c).then(function () { return syncTickets(c); }).then(function () { return syncTickets(c); }).then(function (out) { return { ids: __ids(out), skipped: out.skipped, duplicates: out.duplicates }; }); })()',
        expected: { ids: ['TCK-1001', 'TCK-1002', 'TCK-1004', 'TCK-1009'], skipped: 2, duplicates: 1 },
        label: 'a third run still agrees with the first',
        async: true,
        criterion: 'idempotent',
      },
    ],
  },
};
