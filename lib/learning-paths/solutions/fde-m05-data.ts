/** Server-only reference solution and hidden assertions for FDE M05 Data
 * plumbing. Never imported from client code, and never from `../catalog`.
 *
 * The visible assertions run the default fixture: a seven-row CSV export and
 * three API pages that overlap it. The hidden ones build their own sources to
 * reach what that fixture cannot show: three copies of one id, ids that are
 * absent, null, numeric or blank, versions delivered newest first, all six
 * orders of three batches, an equal-timestamp tie, a failure on the first
 * page, a frozen ledger, and a thousand accounts replayed.
 *
 * scripts/test-learning-paths.ts holds the flawed variants of this reference
 * (KNOWN_WRONG_PATH) and proves each one fails the criterion it names. */

import type { PathCodeSolution } from '../types';

const SOLUTION = String.raw`type Source = 'csv' | 'api';
type Reason = 'missing-id' | 'bad-email' | 'bad-timestamp';

interface AccountRecord {
  id: string;
  name: string;
  email: string;
  updatedAt: string;
  source: Source;
}

interface Rejection {
  ref: string;
  reason: Reason;
}

interface BatchReport {
  source: Source;
  read: number;
  applied: number;
  stale: number;
  rejected: Rejection[];
}

interface Applied {
  ledger: AccountRecord[];
  report: BatchReport;
}

interface ApiAccount {
  accountId?: unknown;
  displayName?: unknown;
  email?: unknown;
  modifiedAt?: unknown;
}

interface AccountPage {
  accounts: ApiAccount[];
  nextCursor: string | null;
}

interface AccountsClient {
  listAccounts(cursor: string | null): Promise<AccountPage>;
}

// Provided by the task harness: an RFC 4180 reader. Keep this declaration.
declare function parseCsv(text: string): string[][];

interface RawRow {
  ref: string;
  id: unknown;
  name: unknown;
  email: unknown;
  updatedAt: unknown;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const EMAIL = /^[^\s@]+@[^\s@]+$/;
const TIMESTAMP = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}:\d{2})|T(\d{2}:\d{2}:\d{2})Z)$/;

const toRecord = (row: RawRow, source: Source): AccountRecord | Reason => {
  const id = text(row.id).toUpperCase();
  if (id === '') return 'missing-id';
  const email = text(row.email).toLowerCase();
  if (!EMAIL.test(email)) return 'bad-email';
  const stamp = TIMESTAMP.exec(text(row.updatedAt));
  if (stamp === null) return 'bad-timestamp';
  return { id, name: text(row.name), email, updatedAt: stamp[1] + 'T' + (stamp[2] || stamp[3]) + 'Z', source };
};

const SOURCE_RANK: Record<Source, number> = { csv: 0, api: 1 };

// Newest version wins; on an equal timestamp the CRM outranks the export.
const supersedes = (incoming: AccountRecord, current: AccountRecord): boolean =>
  incoming.updatedAt > current.updatedAt
  || (incoming.updatedAt === current.updatedAt && SOURCE_RANK[incoming.source] > SOURCE_RANK[current.source]);

const merge = (ledger: readonly AccountRecord[], rows: RawRow[], source: Source): Applied => {
  const byId = new Map<string, AccountRecord>();
  for (const record of ledger) byId.set(record.id, record);
  const report: BatchReport = { source, read: rows.length, applied: 0, stale: 0, rejected: [] };
  for (const row of rows) {
    const result = toRecord(row, source);
    if (typeof result === 'string') {
      report.rejected.push({ ref: row.ref, reason: result });
      continue;
    }
    const current = byId.get(result.id);
    if (current === undefined || supersedes(result, current)) {
      byId.set(result.id, result);
      report.applied += 1;
    } else {
      report.stale += 1;
    }
  }
  const out = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { ledger: out, report };
};

const applyCsv = (ledger: readonly AccountRecord[], csv: string): Applied => {
  const [header = [], ...data] = parseCsv(csv);
  const columnOf = (name: string): number => header.findIndex(title => title.trim().toLowerCase() === name);
  const at = { id: columnOf('account_id'), name: columnOf('name'), email: columnOf('email'), updatedAt: columnOf('updated_at') };
  const cell = (row: string[], index: number): string => (index >= 0 && index < row.length ? row[index] : '');
  const rows = data.map((row, index): RawRow => ({
    ref: 'csv:' + (index + 1),
    id: cell(row, at.id),
    name: cell(row, at.name),
    email: cell(row, at.email),
    updatedAt: cell(row, at.updatedAt),
  }));
  return merge(ledger, rows, 'csv');
};

const applyApi = async (ledger: readonly AccountRecord[], client: AccountsClient): Promise<Applied> => {
  // Stage every page first. A failed page rejects before anything is merged.
  const rows: RawRow[] = [];
  let cursor: string | null = null;
  do {
    const page: AccountPage = await client.listAccounts(cursor);
    for (const account of page.accounts) {
      rows.push({
        ref: 'api:' + (rows.length + 1),
        id: account.accountId,
        name: account.displayName,
        email: account.email,
        updatedAt: account.modifiedAt,
      });
    }
    cursor = page.nextCursor;
  } while (cursor !== null);
  return merge(ledger, rows, 'api');
};`;

export const FDE_M05_DATA_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m05-data-reconcile': {
    solution: SOLUTION,
    hiddenTests: [
      {
        call: "applyCsv([], __csv(['account_id,name,email,updated_at', 'ACC-0010,First,a@x.example,2026-03-01 09:00:00', 'ACC-0010,Second,b@x.example,2026-03-01 11:00:00', 'ACC-0010,First,a@x.example,2026-03-01 09:00:00']))",
        expected: {"ledger":[{"id":"ACC-0010","name":"Second","email":"b@x.example","updatedAt":"2026-03-01T11:00:00Z","source":"csv"}],"report":{"source":"csv","read":3,"applied":2,"stale":1,"rejected":[]}},
        label: "three copies of one id: the newest wins, and the replayed old copy is stale",
        edge: true,
      },
      {
        call: "applyApi([], __page([{ displayName: 'No id field', email: 'a@x.example', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: null, email: 'b@x.example', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: 42, email: 'c@x.example', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: '   ', email: 'd@x.example', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: 'acc-0011', email: 'e@x.example', modifiedAt: '2026-03-01T09:00:00Z' }])).then(function (r) { return { ids: __ids(r), report: r.report }; })",
        expected: {"ids":["ACC-0011"],"report":{"source":"api","read":5,"applied":1,"stale":0,"rejected":[{"ref":"api:1","reason":"missing-id"},{"ref":"api:2","reason":"missing-id"},{"ref":"api:3","reason":"missing-id"},{"ref":"api:4","reason":"missing-id"}]}},
        label: "an id that is absent, null, a number or whitespace is a missing-id rejection at its own position",
        edge: true,
        async: true,
        criterion: "accounted",
      },
      {
        call: "applyApi([], __page([{ accountId: '', email: 'not-an-email', modifiedAt: 'yesterday' }, { accountId: 'ACC-0012', email: 'nope', modifiedAt: 'yesterday' }, { accountId: 'ACC-0013', email: 'ok@x.example', modifiedAt: 'yesterday' }])).then(function (r) { return r.report.rejected; })",
        expected: [{"ref":"api:1","reason":"missing-id"},{"ref":"api:2","reason":"bad-email"},{"ref":"api:3","reason":"bad-timestamp"}],
        label: "only the first failing check is reported: id, then email, then timestamp",
        async: true,
        criterion: "accounted",
      },
      {
        call: "(function () { var pages = [{ cursor: null, nextCursor: 'b', accounts: [{ accountId: 'ACC-0020', displayName: 'Third', email: 'v3@x.example', modifiedAt: '2026-03-03T00:00:00Z' }] }, { cursor: 'b', nextCursor: 'c', accounts: [{ accountId: 'ACC-0020', displayName: 'First', email: 'v1@x.example', modifiedAt: '2026-03-01T00:00:00Z' }] }, { cursor: 'c', nextCursor: null, accounts: [{ accountId: 'ACC-0020', displayName: 'Second', email: 'v2@x.example', modifiedAt: '2026-03-02T00:00:00Z' }] }]; return applyApi([], __makeClient(pages, {})).then(function (r) { return { ledger: r.ledger, counts: __counts(r) }; }); })()",
        expected: {"ledger":[{"id":"ACC-0020","name":"Third","email":"v3@x.example","updatedAt":"2026-03-03T00:00:00Z","source":"api"}],"counts":{"read":3,"applied":1,"stale":2,"rejected":0}},
        label: "three versions delivered newest first, oldest second: the newest stays and two are stale",
        edge: true,
        async: true,
        criterion: "replay",
      },
      {
        call: "(function () { var later = __csv(['name,account_id,email,updated_at', 'Fenwick Hale Group,ACC-0002,accounts@fenwickhale.example,2026-03-05 10:00:00', 'Wren Street Books Ltd,ACC-0007,shop@wrenstreet.example,2026-03-04 10:00:00', 'Hollin Yard,ACC-0009,yard@hollin.example,2026-03-05 11:00:00']); var steps = { a: function (l) { return Promise.resolve(applyCsv(l, __CSV)); }, b: function (l) { return applyApi(l, __client()); }, c: function (l) { return Promise.resolve(applyCsv(l, later)); } }; var orders = ['abc', 'acb', 'bac', 'bca', 'cab', 'cba']; return Promise.all(orders.map(function (order) { return order.split('').reduce(function (p, k) { return p.then(function (l) { return steps[k](l).then(function (r) { return r.ledger; }); }); }, Promise.resolve([])); })).then(function (ledgers) { var seen = {}; ledgers.forEach(function (l) { seen[JSON.stringify(l)] = true; }); return { distinct: Object.keys(seen).length, ledger: ledgers[0] }; }); })()",
        expected: {"distinct":1,"ledger":[{"id":"ACC-0001","name":"Orchard Row Bakery","email":"billing@orchardrow.example","updatedAt":"2026-03-01T09:00:00Z","source":"csv"},{"id":"ACC-0002","name":"Fenwick Hale Group","email":"accounts@fenwickhale.example","updatedAt":"2026-03-05T10:00:00Z","source":"csv"},{"id":"ACC-0004","name":"Quill and Ledger","email":"finance@quillledger.example","updatedAt":"2026-03-02T08:15:00Z","source":"api"},{"id":"ACC-0006","name":"Brackenridge Clinic","email":"admin@brackenridge.example","updatedAt":"2026-03-03T12:00:00Z","source":"api"},{"id":"ACC-0007","name":"Wren Street Books","email":"shop@wrenstreet.example","updatedAt":"2026-03-04T10:00:00Z","source":"api"},{"id":"ACC-0009","name":"Hollin Yard","email":"yard@hollin.example","updatedAt":"2026-03-05T11:00:00Z","source":"csv"}]},
        label: "all six orders of three batches end on one ledger",
        async: true,
        criterion: "replay",
      },
      {
        call: "(function () { var csv = __csv(['account_id,name,email,updated_at', 'ACC-0030,Export name,x@x.example,2026-03-01 09:00:00']); var api = function () { return __page([{ accountId: 'ACC-0030', displayName: 'CRM name', email: 'x@x.example', modifiedAt: '2026-03-01T09:00:00Z' }]); }; return applyApi(applyCsv([], csv).ledger, api()).then(function (one) { return applyApi([], api()).then(function (b) { var two = applyCsv(b.ledger, csv); return [one.ledger, two.ledger, one.report.applied, two.report.stale]; }); }); })()",
        expected: [[{"id":"ACC-0030","name":"CRM name","email":"x@x.example","updatedAt":"2026-03-01T09:00:00Z","source":"api"}],[{"id":"ACC-0030","name":"CRM name","email":"x@x.example","updatedAt":"2026-03-01T09:00:00Z","source":"api"}],1,1],
        label: "equal timestamps: the CRM record wins whichever source arrives first",
        edge: true,
        async: true,
        criterion: "replay",
      },
      {
        call: "applyApi([], __client()).then(function (a) { return applyApi(a.ledger, __client()).then(function (b) { return { same: JSON.stringify(a.ledger) === JSON.stringify(b.ledger), counts: __counts(b) }; }); })",
        expected: {"same":true,"counts":{"read":8,"applied":0,"stale":6,"rejected":2}},
        label: "replaying the API walk applies nothing",
        async: true,
        criterion: "replay",
      },
      {
        call: "(function () { var ledger = applyCsv([], __CSV).ledger; var before = JSON.stringify(ledger); var c = __makeClient(__PAGES, { failOn: null, status: 500 }); return applyApi(ledger, c).then(function () { return 'resolved'; }, function (e) { return { status: e && e.status, message: e && e.message, requests: c.requests.length, unchanged: JSON.stringify(ledger) === before }; }); })()",
        expected: {"status":500,"message":"account service unavailable","requests":1,"unchanged":true},
        label: "a failure on the first page rejects with the same status and message, after one request",
        edge: true,
        async: true,
        criterion: "atomic",
      },
      {
        call: "(function () { var ledger = applyCsv([], __CSV).ledger.map(function (r) { return Object.freeze(r); }); Object.freeze(ledger); var out = applyCsv(ledger, __CSV); return applyApi(ledger, __client()).then(function (r) { return { length: ledger.length, fresh: out.ledger !== ledger && r.ledger !== ledger, ids: __ids(r) }; }); })()",
        expected: {"length":3,"fresh":true,"ids":["ACC-0001","ACC-0002","ACC-0004","ACC-0006","ACC-0007"]},
        label: "a frozen ledger can be loaded into, and a new array comes back",
        edge: true,
        async: true,
        criterion: "atomic",
      },
      {
        call: "(function () { var ledger = applyCsv([], __CSV).ledger; var before = JSON.stringify(ledger); return applyApi(ledger, __client()).then(function (r) { var again = applyCsv(ledger, __CSV); return { unchanged: JSON.stringify(ledger) === before, fresh: r.ledger !== ledger && again.ledger !== ledger }; }); })()",
        expected: {"unchanged":true,"fresh":true},
        label: "after a successful load the ledger passed in is unchanged",
        async: true,
        criterion: "atomic",
      },
      {
        call: "applyCsv([], __csv([' EMAIL ,updated_at,Name,ACCOUNT_ID,notes', 'a@x.example,2026-03-01 09:00:00,  Padded  ,acc-0040,ignore me', 'b@x.example,2026-03-01 09:00:00']))",
        expected: {"ledger":[{"id":"ACC-0040","name":"Padded","email":"a@x.example","updatedAt":"2026-03-01T09:00:00Z","source":"csv"}],"report":{"source":"csv","read":2,"applied":1,"stale":0,"rejected":[{"ref":"csv:2","reason":"missing-id"}]}},
        label: "columns found by trimmed, case-insensitive header name; a short row has empty cells",
        edge: true,
      },
      {
        call: "(function () { var r = applyCsv([], __csv(['account_id,name,email,updated_at', 'ACC-0050,Iso,a@x.example,2026-03-01T09:00:00Z', 'ACC-0051,No zone,a@x.example,2026-03-01T09:00:00', 'ACC-0052,Space and Z,a@x.example,2026-03-01 09:00:00Z', 'ACC-0053,Padded, a@x.example , 2026-03-01 09:00:00 ', 'ACC-0054,Short,a@x.example,2026-3-1 09:00:00'])); return { stamps: r.ledger.map(function (x) { return x.id + ' ' + x.updatedAt; }), rejected: r.report.rejected }; })()",
        expected: {"stamps":["ACC-0050 2026-03-01T09:00:00Z","ACC-0053 2026-03-01T09:00:00Z"],"rejected":[{"ref":"csv:2","reason":"bad-timestamp"},{"ref":"csv:3","reason":"bad-timestamp"},{"ref":"csv:5","reason":"bad-timestamp"}]},
        label: "both timestamp shapes accepted and stored as ISO; a missing Z, a stray Z and a short date rejected",
        edge: true,
      },
      {
        call: "applyApi([], __page([{ accountId: 'ACC-0060', email: ' A@X.EXAMPLE ', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: 'ACC-0061', email: 'a b@x.example', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: 'ACC-0062', email: 'a@b@x.example', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: 'ACC-0063', email: '@x.example', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: 'ACC-0064', email: 'a@', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: 'ACC-0065', email: 42, modifiedAt: '2026-03-01T09:00:00Z' }])).then(function (r) { return { ledger: r.ledger, rejected: r.report.rejected }; })",
        expected: {"ledger":[{"id":"ACC-0060","name":"","email":"a@x.example","updatedAt":"2026-03-01T09:00:00Z","source":"api"}],"rejected":[{"ref":"api:2","reason":"bad-email"},{"ref":"api:3","reason":"bad-email"},{"ref":"api:4","reason":"bad-email"},{"ref":"api:5","reason":"bad-email"},{"ref":"api:6","reason":"bad-email"}]},
        label: "email is trimmed and lowercased; whitespace, two @ and an empty side are rejected",
        edge: true,
        async: true,
      },
      {
        call: "applyApi([], __page([{ accountId: 'b-1', email: 'b@x.example', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: 'ACC-9', email: 'n@x.example', modifiedAt: '2026-03-01T09:00:00Z' }, { accountId: 'ACC-10', email: 't@x.example', modifiedAt: '2026-03-01T09:00:00Z' }])).then(__ids)",
        expected: ["ACC-10","ACC-9","B-1"],
        label: "ids sort by UTF-16 code units, not as numbers",
        async: true,
      },
      {
        call: "(function () { var pages = [{ cursor: null, nextCursor: 'b', accounts: [] }, { cursor: 'b', nextCursor: 'c', accounts: [] }, { cursor: 'c', nextCursor: null, accounts: [{ accountId: 'ACC-0070', displayName: 'Last page', email: 'l@x.example', modifiedAt: '2026-03-01T09:00:00Z' }] }]; var c = __makeClient(pages, {}); return applyApi([], c).then(function (r) { return { ids: __ids(r), requests: c.requests, headerOnly: __counts(applyCsv(r.ledger, 'account_id,name,email,updated_at\\r\\n')) }; }); })()",
        expected: {"ids":["ACC-0070"],"requests":[null,"b","c"],"headerOnly":{"read":0,"applied":0,"stale":0,"rejected":0}},
        label: "empty pages do not end the walk, and a header-only export reads zero rows",
        edge: true,
        async: true,
      },
      {
        call: "(function () { var pages = []; for (var p = 0; p < 20; p++) { var accounts = []; for (var j = 0; j < 50; j++) { var n = p * 50 + j; accounts.push({ accountId: 'ACC-' + ('0000' + n).slice(-4), displayName: 'Account ' + n, email: 'a' + n + '@x.example', modifiedAt: '2026-03-01T09:00:00Z' }); } pages.push({ cursor: p === 0 ? null : 'p' + p, nextCursor: p === 19 ? null : 'p' + (p + 1), accounts: accounts }); } return applyApi([], __makeClient(pages, {})).then(function (r) { return applyApi(r.ledger, __makeClient(pages, {})).then(function (again) { return { size: again.ledger.length, first: again.ledger[0].id, last: again.ledger[999].id, counts: __counts(again) }; }); }); })()",
        expected: {"size":1000,"first":"ACC-0000","last":"ACC-0999","counts":{"read":1000,"applied":0,"stale":1000,"rejected":0}},
        label: "a thousand accounts over twenty pages load, and a replay of them is all stale",
        async: true,
      },
      {
        call: "applyApi(applyCsv([], __CSV).ledger, __client()).then(function (r) { var x = r.report; return { counts: __counts(r), adds: x.read === x.applied + x.stale + x.rejected.length, rejected: x.rejected }; })",
        expected: {"counts":{"read":8,"applied":4,"stale":2,"rejected":2},"adds":true,"rejected":[{"ref":"api:3","reason":"missing-id"},{"ref":"api:8","reason":"bad-email"}]},
        label: "CSV then API: read equals applied plus stale plus rejected",
        async: true,
        criterion: "accounted",
      },
      {
        call: "applyApi([], __page([{ accountId: 'ACC-0080', displayName: 7, email: 'n@x.example', modifiedAt: '2026-03-01T09:00:00Z' }])).then(function (r) { return r.ledger; })",
        expected: [{"id":"ACC-0080","name":"","email":"n@x.example","updatedAt":"2026-03-01T09:00:00Z","source":"api"}],
        label: "a non-string name becomes an empty string",
        edge: true,
        async: true,
      },
    ],
    hiddenTypeTests: [
      {
        code: "const __reason: Reason = 'bad-name';",
        label: 'a rejection reason is one of the three',
        rejects: true,
      },
      {
        code: 'declare const __result: Applied; const __unaccounted: number = __result.report.read - __result.report.applied - __result.report.stale - __result.report.rejected.length;',
        label: 'the report counts are numbers and the rejections a list',
      },
      {
        code: 'applyApi([], { listAccounts: (cursor: number) => Promise.resolve({ accounts: [], nextCursor: null }) });',
        label: 'a client must take a string or null cursor',
        rejects: true,
      },
      {
        code: 'declare const __rejection: Rejection; const __asNumber: number = __rejection.reason;',
        label: 'a rejection reason is text',
        rejects: true,
      },
    ],
  },
};
