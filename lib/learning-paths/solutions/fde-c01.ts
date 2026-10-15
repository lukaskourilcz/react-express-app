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
      {"call": "(async function(){var calls=0;var c={listTickets:function(){calls++;return Promise.reject(null);}};var result=await buildCaseList(c,'customer_id,tenant_id,company').then(function(){return false;},function(e){return e===null;});return {same:result,calls:calls};})()", "expected": {"same": true, "calls": 1}, "label": "a null rejection propagates unchanged without retry", "async": true},
      {"call": "(async function(){var c=__makeClient([{cursor:null,nextCursor:null,tickets:[]}],{throttleCursor:null,retryAfterMs:0});await buildCaseList(c,'customer_id,tenant_id,company');return {calls:c.requests.length,gap:c.requests[1].at-c.requests[0].at};})()", "expected": {"calls": 2, "gap": 0}, "label": "a zero retryAfterMs remains zero", "async": true},
      {"call": "(async function(){var ticket=Object.freeze({id:' 2 ',customerId:' C ',subject:'  keep this spacing  '});var c={listTickets:function(cursor){if(cursor!==null)throw new Error('bad cursor');return Promise.resolve(Object.freeze({tickets:Object.freeze([ticket]),nextCursor:null}));}};return await buildCaseList(c,'customer_id,tenant_id,company\\r\\nC,T,\"comma, company\"\\r\\n');})()", "expected": {"cases": [{"id": "2", "tenantId": "T", "customerId": "C", "subject": "  keep this spacing  "}], "skipped": [], "duplicates": 0}, "label": "CRLF restricted CSV and frozen ticket preserve original subject", "async": true},
      {"call": "(async function(){var c=__makeClient([{cursor:null,nextCursor:'__proto__',tickets:[]},{cursor:'__proto__',nextCursor:null,tickets:[{id:'I',customerId:'__proto__',subject:'S'}]}],{throttleCursor:'__proto__',retryAfterMs:0});var out=await buildCaseList(c,'customer_id,tenant_id,company\\n__proto__,T,Company');return {cases:out.cases,tries:__attempts(c,'__proto__').length};})()", "expected": {"cases": [{"id": "I", "tenantId": "T", "customerId": "__proto__", "subject": "S"}], "tries": 2}, "label": "prototype-like cursor and customer ids are ordinary data under the fixture contract", "async": true},
      {"call": "(async function(){var rows=['customer_id,tenant_id,company'];var tickets=[];for(var i=999;i>=0;i--){rows.push('C'+i+',T,Company');tickets.push({id:String(i).padStart(4,'0'),customerId:'C'+i,subject:'S'});}var c=__makeClient([{cursor:null,nextCursor:null,tickets:tickets}],{throttleCursor:'none'});var out=await buildCaseList(c,rows.join('\\n'));return {count:out.cases.length,first:out.cases[0].id,last:out.cases[999].id,skipped:out.skipped.length};})()", "expected": {"count": 1000, "first": "0000", "last": "0999", "skipped": 0}, "label": "one thousand rows and reverse-ordered tickets sort by text id", "async": true},

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
  const cited = new Set();
  for (const id of parsed.articleIds) {
    if (typeof id !== 'string' || !byId.has(id)) return refuse('uncited-article');
    cited.add(id);
  }
  if (cited.size === 0) return refuse('uncited-article');

  const best = Array.from(cited).reduce((top, id) => Math.max(top, byId.get(id).score), 0);
  if (best < SUPPORT_THRESHOLD) return refuse('weak-support');

  return {
    status: 'proposed',
    action: parsed.action,
    articleIds: permitted.filter(article => cited.has(article.id)).map(article => article.id),
    reason: '',
  };
};`,
    hiddenTests: [
      {"call": "(function(){var r=Object.freeze({id:'I',tenantId:'T',visibility:'published',updatedAt:'2026-01-01',score:0.6,get text(){throw new Error('untrusted text read');}});return proposeAction(Object.freeze({tenantId:'T',clearances:Object.freeze([])}),Object.freeze([r]),'{\"action\":\"route_billing\",\"articleIds\":[\"I\"]}');})()", "expected": {"status": "proposed", "action": "route_billing", "articleIds": ["I"], "reason": ""}, "label": "exact support threshold permits a frozen article without reading text"},
      {"call": "(function(){var r=[{id:'__proto__',tenantId:'T',visibility:'published',updatedAt:'2026-01-01',score:0.7}];return proposeAction({tenantId:'T',clearances:[]},r,'{\"action\":\"route_billing\",\"articleIds\":[\"__proto__\",\"__proto__\"]}');})()", "expected": {"status": "proposed", "action": "route_billing", "articleIds": ["__proto__"], "reason": ""}, "label": "prototype-like ids deduplicate as ordinary strings"},
      {"call": "(function(){var r=[];var ids=[];for(var i=999;i>=0;i--){var id=String(i).padStart(4,'0');r.push(Object.freeze({id:id,tenantId:'T',visibility:'published',updatedAt:'2026-01-01',score:0.8}));ids.push(id);}var out=proposeAction({tenantId:'T',clearances:[]},Object.freeze(r),JSON.stringify({action:'route_access',articleIds:ids}));return {status:out.status,count:out.articleIds.length,first:out.articleIds[0],last:out.articleIds[999],original:r[0].id};})()", "expected": {"status": "proposed", "count": 1000, "first": "0000", "last": "0999", "original": "0999"}, "label": "one thousand tied citations rank safely without mutating results"},
      {"call": "proposeAction(__viewer('dunfold'),__set('plain'),'{\"action\":\"unknown\",\"articleIds\":[false]}')", "expected": {"status": "refused", "action": "needs_human", "articleIds": [], "reason": "unknown-action"}, "label": "unknown action refuses before malformed citation contents"},

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
    const prediction = Object.prototype.hasOwnProperty.call(predictions, row.id) ? predictions[row.id] : null;
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
  const bySlice = Object.create(null);
  for (const [name, slice] of slices) bySlice[name] = round3(slice.correct / slice.total);

  return {
    id: candidate.id,
    accuracy: round3(correct / heldOut.length),
    abstention: round3(abstained / heldOut.length),
    bySlice,
    costPerCase: round3(cost / heldOut.length),
    latencyP50: round3(latencies[Math.ceil(latencies.length / 2) - 1]),
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
      slice => Math.round((report.bySlice[slice] === undefined ? 0 : report.bySlice[slice]) * 1000) < Math.round(baseline.bySlice[slice] * 1000) - 20,
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
      {"call": "(function(){var rows=[{id:'A',slice:'s',expected:'yes',split:'holdout'},{id:'B',slice:'s',expected:'yes',split:'holdout'}];var out=compareCandidates(rows,[{id:'base',predictions:{A:{action:'yes',costUnits:0,latencyMs:1.23456},B:{action:'yes',costUnits:0,latencyMs:3.5}}}],'base');return out.reports[0].latencyP50;})()", "expected": 1.235, "label": "fractional lower-median latency rounds to three decimals"},
      {"call": "(function(){var data=[{id:'A',slice:'__proto__',expected:'yes',split:'holdout'},{id:'B',slice:'constructor',expected:'yes',split:'holdout'}];var out=compareCandidates(data,[{id:'base',predictions:{A:{action:'yes',costUnits:0,latencyMs:1},B:{action:'yes',costUnits:0,latencyMs:1}}}],'base').reports[0];return {keys:Object.keys(out.bySlice).sort(),own:Object.prototype.hasOwnProperty.call(out.bySlice,'__proto__'),values:[out.bySlice.__proto__,out.bySlice.constructor]};})()", "expected": {"keys": ["__proto__", "constructor"], "own": true, "values": [1, 1]}, "label": "prototype-like slice names remain own report keys"},
      {"call": "(function(){var data=[{id:'A',slice:'s',expected:'yes',split:'holdout'}];var predictions=Object.create({A:{action:'yes',costUnits:9,latencyMs:9}});return compareCandidates(data,[{id:'base',predictions:predictions}],'base').reports[0];})()", "expected": {"id": "base", "accuracy": 0, "abstention": 0, "bySlice": {"s": 0}, "costPerCase": 0, "latencyP50": 0}, "label": "an inherited prediction is missing rather than scored"},
      {"call": "(function(){var rows=[],base={},candidate={};for(var i=0;i<200;i++){var id='R'+i;rows.push({id:id,slice:i<100?'s':'t',expected:'yes',split:'holdout'});base[id]={action:i<5?'yes':'no',costUnits:0,latencyMs:1};candidate[id]={action:(i<3||(i>=100&&i<120))?'yes':'no',costUnits:0,latencyMs:1};}var out=compareCandidates(rows,[{id:'base',predictions:base},{id:'candidate',predictions:candidate}],'base');return {winner:out.winner,blocked:out.blocked,baseline:out.reports[0].bySlice.s,candidate:out.reports[1].bySlice.s};})()", "expected": {"winner": "candidate", "blocked": [], "baseline": 0.05, "candidate": 0.03}, "label": "exact rounded 0.02 slice regression is permitted despite binary subtraction noise"},
      {"call": "(function(){var rows=[],candidates=[];for(var i=0;i<200;i++)rows.push(Object.freeze({id:'R'+i,slice:'s'+i%3,expected:'yes',split:'holdout'}));for(var j=0;j<10;j++){var predictions=Object.create(null);rows.forEach(function(row){predictions[row.id]=Object.freeze({action:j===0?'no':'yes',costUnits:0,latencyMs:1.23456});});candidates.push(Object.freeze({id:j===0?'base':'C'+j,predictions:Object.freeze(predictions)}));}var out=compareCandidates(Object.freeze(rows),Object.freeze(candidates),'base');return {scored:out.scored,reports:out.reports.length,winner:out.winner,p50:out.reports[9].latencyP50};})()", "expected": {"scored": 200, "reports": 10, "winner": "C1", "p50": 1.235}, "label": "two hundred frozen cases and ten candidates preserve order and deterministic tie breaking"},

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
  const cited = new Set();
  for (const id of parsed.articleIds) {
    if (typeof id !== 'string' || !byId.has(id)) return refuse('assisted', 'uncited-article');
    cited.add(id);
  }
  if (cited.size === 0) return refuse('assisted', 'uncited-article');

  const best = Array.from(cited).reduce((top, id) => Math.max(top, byId.get(id).score), 0);
  if (best < SUPPORT_THRESHOLD) return refuse('assisted', 'weak-support');

  return {
    status: 'proposed',
    path: 'assisted',
    action: parsed.action,
    articleIds: permitted.filter(article => cited.has(article.id)).map(article => article.id),
    reason: '',
  };
};`,
    hiddenTests: [
      {"call": "(function(){var request={ticket:{subject:'Invoice return access'},timings:{retrievalMs:2,projectedModelMs:0},budgetMs:1};for(var key of ['viewer','results','modelOutput'])Object.defineProperty(request,key,{get:function(){throw new Error('over-budget data read');}});return routeCase(Object.freeze(request));})()", "expected": {"status": "proposed", "path": "deterministic", "action": "route_billing", "articleIds": [], "reason": "latency-budget"}, "label": "over-budget routing reads no viewer results or model output and follows first substring rule"},
      {"call": "(function(){return [null,''].map(function(restricted){return routeCase({ticket:{subject:'access',tenantId:'T'},viewer:{tenantId:'T',clearances:['kb-restricted']},results:[{id:'I',tenantId:'SHARED',visibility:'published',restrictedTo:restricted,updatedAt:'2026-01-01',score:1,text:''}],modelOutput:'{\"action\":\"route_access\",\"articleIds\":[\"I\"]}',budgetMs:10,timings:{retrievalMs:0,projectedModelMs:0}});});})()", "expected": [{"status": "refused", "path": "assisted", "action": "needs_human", "articleIds": [], "reason": "no-permitted-article"}, {"status": "refused", "path": "assisted", "action": "needs_human", "articleIds": [], "reason": "no-permitted-article"}], "label": "null and empty restriction values cannot widen shared access"},
      {"call": "(function(){var article=Object.freeze({id:'I',tenantId:'SHARED',visibility:'published',updatedAt:'2026-01-01',score:0.6,get text(){throw new Error('text read');}});return routeCase(Object.freeze({ticket:Object.freeze({subject:'return',tenantId:'T'}),viewer:Object.freeze({tenantId:'T',clearances:Object.freeze([])}),results:Object.freeze([article]),modelOutput:'{\"action\":\"route_returns\",\"articleIds\":[\"I\",\"I\"]}',budgetMs:10,timings:Object.freeze({retrievalMs:4,projectedModelMs:6})}));})()", "expected": {"status": "proposed", "path": "assisted", "action": "route_returns", "articleIds": ["I"], "reason": ""}, "label": "exact timing and support thresholds allow a frozen shared citation without reading text"},
      {"call": "(function(){var req=__req('access','ardwell','ardwellLeak','ardwellCite','ok');return {sameTenant:req.ticket.tenantId===req.viewer.tenantId,out:routeCase(req)};})()", "expected": {"sameTenant": true, "out": {"status": "proposed", "path": "assisted", "action": "route_access", "articleIds": ["KB-950"], "reason": ""}}, "label": "Ardwell fixture uses a ticket authorized for that viewer"},
      {"call": "(function(){var results=[],ids=[];for(var i=999;i>=0;i--){var id=String(i).padStart(4,'0');results.push(Object.freeze({id:id,tenantId:'T',visibility:'published',updatedAt:'2026-01-01',score:0.8}));ids.push(id);}var out=routeCase({ticket:{tenantId:'T',subject:'access'},viewer:{tenantId:'T',clearances:[]},results:Object.freeze(results),modelOutput:JSON.stringify({action:'route_access',articleIds:ids}),budgetMs:1,timings:{retrievalMs:0,projectedModelMs:0}});return {count:out.articleIds.length,first:out.articleIds[0],last:out.articleIds[999],original:results[0].id};})()", "expected": {"count": 1000, "first": "0000", "last": "0999", "original": "0999"}, "label": "one thousand tied citations retain ranked order without input mutation"},

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
