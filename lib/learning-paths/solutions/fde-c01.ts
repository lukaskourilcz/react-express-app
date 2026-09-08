/** Server-only reference solutions and hidden assertions for the FDE
 * capstone. Never imported from client code, and never from `../catalog`.
 *
 * The visible assertions run the default fixtures, which are the ones the
 * prompts describe. The hidden ones reach what those cannot show: a third
 * delivery of the same ticket id, an empty page in the middle of the walk, a
 * page that never stops throttling, a rejection that must not be retried, a
 * cited article that is a number rather than a string, a permitted set that
 * is empty before the model output is even parsed, an evaluation split that
 * has been swapped so a hard-coded holdout answer fails, and a shared article
 * that must still reach the tenant it was written for. */

import type { PathCodeSolution } from '../types';

export const FDE_C01_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-c01-triage-adapter': {
    solution: `const buildCaseList = async (client, csvText) => {
  const text = value => (typeof value === 'string' ? value.trim() : '');

  const tenants = new Map();
  const rows = String(csvText).split('\\n').slice(1);
  for (const row of rows) {
    if (row.trim() === '') continue;
    const columns = row.split(',');
    const customerId = text(columns[0]);
    const tenantId = text(columns[1]);
    if (customerId === '' || tenantId === '') continue;
    if (!tenants.has(customerId)) tenants.set(customerId, tenantId);
    else if (tenants.get(customerId) !== tenantId) tenants.set(customerId, null);
  }

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

  const cases = [];
  const skipped = [];
  const seen = new Set();
  let duplicates = 0;

  let cursor = null;
  for (;;) {
    const page = await fetchPage(cursor);

    for (const ticket of page.tickets) {
      const id = text(ticket.id);
      if (seen.has(id)) {
        duplicates += 1;
        continue;
      }
      seen.add(id);

      const customerId = text(ticket.customerId);
      if (customerId === '') {
        skipped.push({ id, reason: 'no-customer-id' });
        continue;
      }
      if (!tenants.has(customerId)) {
        skipped.push({ id, reason: 'unknown-customer' });
        continue;
      }
      const tenantId = tenants.get(customerId);
      if (tenantId === null) {
        skipped.push({ id, reason: 'ambiguous-customer' });
        continue;
      }
      cases.push({ id, tenantId, customerId, subject: ticket.subject });
    }

    if (page.nextCursor === null) break;
    cursor = page.nextCursor;
  }

  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  cases.sort(byId);
  skipped.sort(byId);
  return { cases, skipped, duplicates };
};`,
    hiddenTests: [
      {
        call:
          "(function () { var pages = [{ cursor: null, nextCursor: null, tickets: [{ id: 'TCK-9001', customerId: 'CUS-99', subject: 'Unknown account' }] }]; return buildCaseList(__makeClient(pages, { throttleCursor: '__none' }), __csv()).then(function (out) { return out.skipped; }); })()",
        expected: [{ id: 'TCK-9001', reason: 'unknown-customer' }],
        async: true,
        criterion: 'tenant-tagged',
      },
      {
        call:
          "(function () { var csv = 'customer_id,tenant_id,company\\nCUS-12,TEN-4021,Dunfold Freight'; var pages = [{ cursor: null, nextCursor: null, tickets: [{ id: 'TCK-9005', customerId: 'CUS-21', subject: 'Ambiguous only in the full export' }] }]; return buildCaseList(__makeClient(pages, { throttleCursor: '__none' }), csv).then(function (out) { return out.skipped; }); })()",
        expected: [{ id: 'TCK-9005', reason: 'unknown-customer' }],
        async: true,
        criterion: 'tenant-tagged',
      },
      {
        call:
          "(function () { var pages = [{ cursor: null, nextCursor: 'p2', tickets: [] }, { cursor: 'p2', nextCursor: null, tickets: [{ id: 'TCK-9002', customerId: 'CUS-12', subject: 'After an empty page' }] }]; return buildCaseList(__makeClient(pages, { throttleCursor: '__none' }), __csv()).then(__ids); })()",
        expected: ['TCK-9002'],
        async: true,
      },
      {
        call:
          "(function () { var pages = [{ cursor: null, nextCursor: null, tickets: [{ id: 'TCK-9003', customerId: 'CUS-12', subject: 'One' }, { id: 'TCK-9003', customerId: 'CUS-12', subject: 'Two' }, { id: 'TCK-9003', customerId: 'CUS-12', subject: 'Three' }] }]; return buildCaseList(__makeClient(pages, { throttleCursor: '__none' }), __csv()).then(function (out) { return { cases: out.cases, duplicates: out.duplicates }; }); })()",
        expected: { cases: [{ id: 'TCK-9003', tenantId: 'TEN-4021', customerId: 'CUS-12', subject: 'One' }], duplicates: 2 },
        async: true,
      },
      {
        call:
          "(function () { var pages = [{ cursor: null, nextCursor: null, tickets: [{ id: 'TCK-9004', customerId: '   ', subject: 'Blank' }, { id: 'TCK-9004', customerId: 'CUS-12', subject: 'Same id again' }] }]; return buildCaseList(__makeClient(pages, { throttleCursor: '__none' }), __csv()).then(function (out) { return { cases: out.cases.length, skipped: out.skipped, duplicates: out.duplicates }; }); })()",
        expected: { cases: 0, skipped: [{ id: 'TCK-9004', reason: 'no-customer-id' }], duplicates: 1 },
        async: true,
      },
      {
        call:
          "(function () { return buildCaseList(__makeClient(__PAGES, { throttleCursor: '*', throttles: 3, retryAfterMs: 10 }), __csv()).then(__ids); })()",
        expected: ['TCK-3001', 'TCK-3002', 'TCK-3004', 'TCK-3016'],
        async: true,
      },
      {
        call:
          "(function () { return buildCaseList(__makeClient(__PAGES, { throttleCursor: '*', throttles: 9, retryAfterMs: 5 }), __csv()).then(function () { return 'resolved'; }, function (error) { return error.status; }); })()",
        expected: 429,
        async: true,
      },
      {
        call:
          "(function () { var c = __makeClient(__PAGES, { throttleCursor: '__none', failWith: { cursor: 'p2', status: 500, message: 'boom' } }); return buildCaseList(c, __csv()).then(function () { return 'resolved'; }, function () { return __attempts(c, 'p2').length; }); })()",
        expected: 1,
        async: true,
      },
    ],
  },

  'fde-v1-c01-guarded-retrieval': {
    solution: `const ALLOWED_ACTIONS = ['route_billing', 'route_returns', 'route_access', 'ask_customer'];
const SUPPORT_THRESHOLD = 0.6;

const refuse = reason => ({ status: 'refused', action: 'needs_human', articleIds: [], reason });

const permittedArticles = (results, viewer) => {
  const clearances = Array.isArray(viewer.clearances) ? viewer.clearances : [];
  const allowed = (results || []).filter(article => {
    if (article.tenantId !== viewer.tenantId) return false;
    if (article.visibility === 'published') return true;
    if (article.visibility === 'restricted') return clearances.indexOf('kb-restricted') !== -1;
    return false;
  });
  allowed.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return allowed;
};

const proposeAction = (viewer, results, modelOutput) => {
  const permitted = permittedArticles(results, viewer);
  if (permitted.length === 0) return refuse('no-permitted-article');

  let parsed = null;
  try {
    parsed = JSON.parse(String(modelOutput));
  } catch (error) {
    return refuse('unparseable-model-output');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return refuse('unparseable-model-output');
  if (typeof parsed.action !== 'string' || !Array.isArray(parsed.articleIds)) return refuse('unparseable-model-output');
  if (ALLOWED_ACTIONS.indexOf(parsed.action) === -1) return refuse('unknown-action');

  const byId = new Map(permitted.map(article => [article.id, article]));
  const cited = [];
  for (const id of parsed.articleIds) {
    if (typeof id !== 'string' || !byId.has(id)) return refuse('uncited-article');
    if (cited.indexOf(id) === -1) cited.push(id);
  }
  if (cited.length === 0) return refuse('uncited-article');

  const best = cited.reduce((top, id) => Math.max(top, byId.get(id).score), 0);
  if (best < SUPPORT_THRESHOLD) return refuse('weak-support');

  return {
    status: 'proposed',
    action: parsed.action,
    articleIds: permitted.filter(article => cited.indexOf(article.id) !== -1).map(article => article.id),
    reason: '',
  };
};`,
    hiddenTests: [
      {
        call: "proposeAction(__viewer('dunfold'), __set('superseded'), __model('good'))",
        expected: { status: 'refused', action: 'needs_human', articleIds: [], reason: 'uncited-article' },
        criterion: 'access-filter',
      },
      {
        call: "proposeAction(__viewer('kestrel'), __set('crossTenant'), __model('crossTenantCite'))",
        expected: { status: 'proposed', action: 'route_returns', articleIds: ['KB-901'], reason: '' },
        criterion: 'access-filter',
      },
      {
        call: "proposeAction(__viewer('dunfold'), __set('allStale'), __model('prose'))",
        expected: { status: 'refused', action: 'needs_human', articleIds: [], reason: 'no-permitted-article' },
        criterion: 'abstains',
      },
      {
        call: "proposeAction(__viewer('dunfold'), __set('empty'), __model('good'))",
        expected: { status: 'refused', action: 'needs_human', articleIds: [], reason: 'no-permitted-article' },
        criterion: 'abstains',
      },
      {
        call: "proposeAction(__viewer('dunfold'), __set('plain'), __model('noCites'))",
        expected: { status: 'refused', action: 'needs_human', articleIds: [], reason: 'uncited-article' },
        criterion: 'abstains',
      },
      {
        call: "proposeAction(__viewer('dunfold'), __set('plain'), __model('numericCite'))",
        expected: { status: 'refused', action: 'needs_human', articleIds: [], reason: 'uncited-article' },
        criterion: 'no-injected-action',
      },
      {
        call: "proposeAction(__viewer('dunfold'), __set('tied'), __model('tiedCite'))",
        expected: { status: 'proposed', action: 'route_returns', articleIds: ['KB-118', 'KB-402'], reason: '' },
      },
      {
        call:
          "(function () { var set = __set('plain'); proposeAction(__viewer('dunfold'), set, __model('good')); return set.map(function (article) { return article.id; }); })()",
        expected: ['KB-118', 'KB-204', 'KB-090'],
      },
    ],
  },

  'fde-v1-c01-evaluation': {
    solution: `const round3 = value => Math.round(value * 1000) / 1000;

const emptyReport = id => ({ id, accuracy: 0, abstention: 0, bySlice: {}, costPerCase: 0, latencyP50: 0 });

const scoreCandidate = (candidate, heldOut) => {
  const predictions = candidate.predictions || {};
  const slices = new Map();
  let correct = 0;
  let abstained = 0;
  let cost = 0;
  const latencies = [];

  for (const row of heldOut) {
    const prediction = predictions[row.id];
    const action = prediction ? prediction.action : null;
    const hit = action === row.expected;
    if (hit) correct += 1;
    if (action === 'abstain') abstained += 1;
    cost += prediction ? prediction.costUnits : 0;
    latencies.push(prediction ? prediction.latencyMs : 0);
    if (!slices.has(row.slice)) slices.set(row.slice, { correct: 0, total: 0 });
    const slice = slices.get(row.slice);
    slice.total += 1;
    if (hit) slice.correct += 1;
  }

  latencies.sort((a, b) => a - b);
  const bySlice = {};
  for (const [name, slice] of slices) bySlice[name] = round3(slice.correct / slice.total);

  return {
    id: candidate.id,
    accuracy: round3(correct / heldOut.length),
    abstention: round3(abstained / heldOut.length),
    bySlice,
    costPerCase: round3(cost / heldOut.length),
    latencyP50: latencies[Math.ceil(latencies.length / 2) - 1],
  };
};

const compareCandidates = (dataset, candidates, baselineId) => {
  const heldOut = (dataset || []).filter(row => row.split === 'holdout');
  if (heldOut.length === 0) {
    return {
      scored: 0,
      reports: candidates.map(candidate => emptyReport(candidate.id)),
      blocked: [],
      winner: baselineId,
      reason: 'no-holdout-cases',
    };
  }

  const reports = candidates.map(candidate => scoreCandidate(candidate, heldOut));
  const baseline = reports.find(report => report.id === baselineId);

  const blocked = [];
  const eligible = [];
  for (const report of reports) {
    if (report.id === baselineId) continue;
    if (report.accuracy <= baseline.accuracy) continue;
    const regressed = Object.keys(baseline.bySlice).some(
      slice => (report.bySlice[slice] === undefined ? 0 : report.bySlice[slice]) < baseline.bySlice[slice] - 0.02,
    );
    if (regressed) blocked.push(report.id);
    else eligible.push(report);
  }
  blocked.sort();

  eligible.sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    if (a.costPerCase !== b.costPerCase) return a.costPerCase - b.costPerCase;
    if (a.latencyP50 !== b.latencyP50) return a.latencyP50 - b.latencyP50;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return {
    scored: heldOut.length,
    reports,
    blocked,
    winner: eligible.length > 0 ? eligible[0].id : baselineId,
    reason: eligible.length > 0 ? 'candidate-wins' : 'baseline-kept',
  };
};`,
    hiddenTests: [
      {
        call:
          "(function () { var out = compareCandidates(__dataset('swapped'), __candidates('main'), 'baseline'); return { scored: out.scored, winner: out.winner, blocked: out.blocked }; })()",
        expected: { scored: 12, winner: 'candidate-b', blocked: [] },
        criterion: 'held-out',
      },
      {
        call: "compareCandidates(__dataset('swapped'), __candidates('main'), 'baseline').reports[2].bySlice",
        expected: { billing: 1, returns: 1, access: 1 },
        criterion: 'held-out',
      },
      {
        call: "compareCandidates(__dataset('holdoutOnly'), __candidates('main'), 'baseline').reports[1].accuracy",
        expected: 0.917,
        criterion: 'held-out',
      },
      {
        call: "compareCandidates(__dataset('main'), __candidates('tie'), 'baseline').winner",
        expected: 'candidate-d',
      },
      {
        call:
          "(function () { var out = compareCandidates(__dataset('main'), __candidates('baselineOnly'), 'baseline'); return { winner: out.winner, reason: out.reason, blocked: out.blocked }; })()",
        expected: { winner: 'baseline', reason: 'baseline-kept', blocked: [] },
      },
      {
        call: "compareCandidates(__dataset('main'), __candidates('gappy'), 'baseline').reports[1]",
        expected: {
          id: 'candidate-c',
          accuracy: 0.792,
          abstention: 0.083,
          bySlice: { billing: 0.8, returns: 0.75, access: 0.833 },
          costPerCase: 2.167,
          latencyP50: 600,
        },
        criterion: 'cost-latency-separate',
      },
      {
        call:
          "(function () { var out = compareCandidates(__dataset('main'), __candidates('gappy'), 'baseline'); return { winner: out.winner, reason: out.reason, blocked: out.blocked }; })()",
        expected: { winner: 'candidate-c', reason: 'candidate-wins', blocked: [] },
        criterion: 'slice-aware',
      },
      {
        call:
          "(function () { var out = compareCandidates(__dataset('main'), __candidates('all'), 'baseline'); return { winner: out.winner, blocked: out.blocked, reports: out.reports.length }; })()",
        expected: { winner: 'candidate-a', blocked: ['candidate-b'], reports: 4 },
        criterion: 'slice-aware',
      },
    ],
  },

  'fde-v1-c01-change-request': {
    solution: `const ALLOWED_ACTIONS = ['route_billing', 'route_returns', 'route_access', 'ask_customer'];
const SUPPORT_THRESHOLD = 0.6;
const ROUTING_RULES = [
  { action: 'route_billing', words: ['invoice', 'billing', 'charge'] },
  { action: 'route_returns', words: ['return', 'refund'] },
  { action: 'route_access', words: ['password', 'login', 'access'] },
];

const refuse = (path, reason) => ({ status: 'refused', path, action: 'needs_human', articleIds: [], reason });

const deterministicAction = subject => {
  const text = String(subject === undefined || subject === null ? '' : subject).toLowerCase();
  for (const rule of ROUTING_RULES) {
    if (rule.words.some(word => text.indexOf(word) !== -1)) return rule.action;
  }
  return null;
};

const routeDeterministically = (ticket, reason) => {
  const action = deterministicAction(ticket ? ticket.subject : '');
  if (action === null) return refuse('deterministic', 'no-rule-matched');
  return { status: 'proposed', path: 'deterministic', action, articleIds: [], reason };
};

const permittedArticles = (results, viewer) => {
  const clearances = Array.isArray(viewer.clearances) ? viewer.clearances : [];
  const allowed = (results || []).filter(article => {
    if (article.restrictedTo !== undefined && article.restrictedTo !== viewer.tenantId) return false;
    if (article.tenantId !== viewer.tenantId && article.tenantId !== 'SHARED') return false;
    if (article.visibility === 'published') return true;
    if (article.visibility === 'restricted') return clearances.indexOf('kb-restricted') !== -1;
    return false;
  });
  allowed.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return allowed;
};

const routeCase = request => {
  const timings = request.timings || {};
  const projected = (timings.retrievalMs || 0) + (timings.projectedModelMs || 0);
  if (projected > request.budgetMs) return routeDeterministically(request.ticket, 'latency-budget');

  const permitted = permittedArticles(request.results, request.viewer);
  if (permitted.length === 0) return refuse('assisted', 'no-permitted-article');

  let parsed = null;
  try {
    parsed = JSON.parse(String(request.modelOutput));
  } catch (error) {
    return refuse('assisted', 'unparseable-model-output');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return refuse('assisted', 'unparseable-model-output');
  if (typeof parsed.action !== 'string' || !Array.isArray(parsed.articleIds)) return refuse('assisted', 'unparseable-model-output');
  if (ALLOWED_ACTIONS.indexOf(parsed.action) === -1) return refuse('assisted', 'unknown-action');

  const byId = new Map(permitted.map(article => [article.id, article]));
  const cited = [];
  for (const id of parsed.articleIds) {
    if (typeof id !== 'string' || !byId.has(id)) return refuse('assisted', 'uncited-article');
    if (cited.indexOf(id) === -1) cited.push(id);
  }
  if (cited.length === 0) return refuse('assisted', 'uncited-article');

  const best = cited.reduce((top, id) => Math.max(top, byId.get(id).score), 0);
  if (best < SUPPORT_THRESHOLD) return refuse('assisted', 'weak-support');

  return {
    status: 'proposed',
    path: 'assisted',
    action: parsed.action,
    articleIds: permitted.filter(article => cited.indexOf(article.id) !== -1).map(article => article.id),
    reason: '',
  };
};`,
    hiddenTests: [
      {
        call: "routeCase(__req('access', 'dunfoldRestricted', 'restricted', 'restrictedCite', 'ok'))",
        expected: { status: 'proposed', path: 'assisted', action: 'route_access', articleIds: ['KB-777'], reason: '' },
        criterion: 'no-regression',
      },
      {
        call: "routeCase(__req('returns', 'dunfold', 'injected', 'injectedAction', 'ok'))",
        expected: { status: 'refused', path: 'assisted', action: 'needs_human', articleIds: [], reason: 'unknown-action' },
        criterion: 'no-regression',
      },
      {
        call: "routeCase(__req('returns', 'dunfold', 'plain', 'prose', 'ok'))",
        expected: { status: 'refused', path: 'assisted', action: 'needs_human', articleIds: [], reason: 'unparseable-model-output' },
        criterion: 'no-regression',
      },
      {
        call: "routeCase(__req('returns', 'dunfold', 'superseded', 'good', 'ok'))",
        expected: { status: 'refused', path: 'assisted', action: 'needs_human', articleIds: [], reason: 'uncited-article' },
        criterion: 'no-regression',
      },
      {
        call: "routeCase(__req('returns', 'dunfold', 'plain', 'good', 'exact'))",
        expected: { status: 'proposed', path: 'assisted', action: 'route_returns', articleIds: ['KB-118'], reason: '' },
        criterion: 'latency-budget',
      },
      {
        call: "routeCase(__req('returns', 'dunfold', 'plain', 'prose', 'spent'))",
        expected: { status: 'proposed', path: 'deterministic', action: 'route_returns', articleIds: [], reason: 'latency-budget' },
        criterion: 'latency-budget',
      },
      {
        call: "routeCase(__req('returns', 'dunfoldRestricted', 'ardwellLeak', 'good', 'ok'))",
        expected: { status: 'proposed', path: 'assisted', action: 'route_returns', articleIds: ['KB-118'], reason: '' },
        criterion: 'new-tenant-isolated',
      },
      {
        call: "routeCase(__req('returns', 'ardwell', 'sharedOk', 'sharedCite', 'ok'))",
        expected: { status: 'proposed', path: 'assisted', action: 'route_billing', articleIds: ['KB-050'], reason: '' },
        criterion: 'new-tenant-isolated',
      },
    ],
  },
};
