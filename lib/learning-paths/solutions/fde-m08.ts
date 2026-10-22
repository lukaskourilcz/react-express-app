/** Server-only reference solution and hidden assertions for FDE M06, the
 * module learners see as "Tools, agents and MCP".
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible tests show each gate working on its own. The hidden ones aim at
 * the seams between gates: a scope refusal that has to win over an argument
 * refusal, a scope compared by prefix instead of by whole string, `null`
 * mistaken for absent, a key replayed against a different tool, a second
 * approval of a call that already ran, a rejection that must stick, and a
 * sub-agent that asks for more than the session holds, keeps calling after
 * its budget ran out, gets a budget from Infinity or a fraction, replays a key
 * to skip its budget, or has its settled approval land in the parent's keys. Scope, argument, approval and sub-agent budget
 * assertions carry critical criteria, so a working retry loop can never
 * average away a refund that ran without a person's approval. */

import type { PathCodeSolution } from '../types';

const DISPATCHER = `const createDispatcher = (registry, session) => {
  const held = (session && session.scopes) || [];
  const completed = Object.create(null);
  const waiting = Object.create(null);
  const queue = [];
  let nextId = 1;

  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  const validate = (schema, args) => {
    const declared = Object.keys(schema || {});
    for (const name of declared) {
      const rule = schema[name];
      if (!own(args, name)) {
        if (rule.required) return { field: name, problem: 'missing' };
        continue;
      }
      const value = args[name];
      if (typeof value !== rule.type) return { field: name, problem: 'type' };
      if (rule.enum && rule.enum.indexOf(value) === -1) return { field: name, problem: 'enum' };
    }
    for (const name of Object.keys(args)) {
      if (declared.indexOf(name) === -1) return { field: name, problem: 'unknown' };
    }
    return null;
  };

  const run = (tool, args) => {
    const budget = tool.maxAttempts || 1;
    let attempts = 0;
    let error = '';
    while (attempts < budget) {
      attempts += 1;
      try {
        return { ok: true, value: tool.handler(args), attempts };
      } catch (thrown) {
        error = thrown && typeof thrown.message === 'string' ? thrown.message : String(thrown);
      }
    }
    return { ok: false, reason: 'tool_failed', attempts, error };
  };

  const settle = (store, key, result) => {
    if (key === undefined) return result;
    if (result.ok || result.reason === 'pending_approval' || result.reason === 'rejected') store[key] = result;
    else delete store[key];
    return result;
  };

  const gate = (scopes, store, name, args, options) => {
    const request = args || {};
    const key = (options || {}).idempotencyKey;
    if (key !== undefined && own(store, key)) return store[key];

    if (!own(registry, name)) return { ok: false, reason: 'unknown_tool', tool: name };
    const tool = registry[name];

    if (scopes.indexOf(tool.scope) === -1) return { ok: false, reason: 'scope_denied', scope: tool.scope };

    const problem = validate(tool.schema, request);
    if (problem) return { ok: false, reason: 'invalid_arguments', field: problem.field, problem: problem.problem };

    if (tool.approval) {
      const callId = 'CALL-' + nextId;
      nextId += 1;
      waiting[callId] = { tool, name, args: { ...request }, key, store };
      queue.push(callId);
      return settle(store, key, { ok: false, reason: 'pending_approval', callId });
    }

    return settle(store, key, run(tool, request));
  };

  const take = callId => {
    if (!own(waiting, callId)) return null;
    const entry = waiting[callId];
    delete waiting[callId];
    queue.splice(queue.indexOf(callId), 1);
    return entry;
  };

  const approve = callId => {
    const entry = take(callId);
    if (!entry) return { ok: false, reason: 'unknown_call' };
    return settle(entry.store, entry.key, run(entry.tool, entry.args));
  };

  const reject = callId => {
    const entry = take(callId);
    if (!entry) return { ok: false, reason: 'unknown_call' };
    return settle(entry.store, entry.key, { ok: false, reason: 'rejected', callId });
  };

  const pending = () => queue.map(callId => ({ callId, tool: waiting[callId].name, args: { ...waiting[callId].args } }));

  const delegate = spec => {
    const asked = spec && Array.isArray(spec.scopes) ? spec.scopes : [];
    const scopes = asked.filter(scope => held.indexOf(scope) !== -1);
    const maxCalls = spec && Number.isInteger(spec.maxCalls) && spec.maxCalls > 0 ? spec.maxCalls : 0;
    const keys = Object.create(null);
    let used = 0;
    return {
      call: (name, args, options) => {
        if (used >= maxCalls) return { ok: false, reason: 'budget_exhausted', maxCalls };
        used += 1;
        return gate(scopes, keys, name, args, options);
      },
    };
  };

  return {
    call: (name, args, options) => gate(held, completed, name, args, options),
    approve,
    reject,
    pending,
    delegate,
  };
};`;

export const FDE_M08_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m06-tool-dispatcher': {
    solution: DISPATCHER,
    hiddenTests: [
      {"call": "(function(){var f=__fixture({syncFails:3});var d=createDispatcher(f.registry,f.session);var a=d.call('ledger.sync',{batchId:'B'},{idempotencyKey:'retry'});var b=d.call('ledger.sync',{batchId:'B'},{idempotencyKey:'retry'});return {a:a,b:b,ran:f.log.length};})()", "expected": {"a": {"ok": false, "reason": "tool_failed", "attempts": 3, "error": "gateway timeout"}, "b": {"ok": true, "value": {"batchId": "B", "synced": true}, "attempts": 1}, "ran": 4}, "criterion": "idempotent-calls"},
      {"call": "(function(){var count=0;var registry={x:{scope:'x',schema:{},approval:true,handler:function(){count++;if(count===1)throw new Error('first');return 7;}}};var d=createDispatcher(registry,{operatorId:'U',scopes:['x']});var a=d.call('x',{}, {idempotencyKey:'k'});var fail=d.approve(a.callId);var b=d.call('x',{}, {idempotencyKey:'k'});var done=d.approve(b.callId);return {a:a,fail:fail,b:b,done:done,count:count};})()", "expected": {"a": {"ok": false, "reason": "pending_approval", "callId": "CALL-1"}, "fail": {"ok": false, "reason": "tool_failed", "attempts": 1, "error": "first"}, "b": {"ok": false, "reason": "pending_approval", "callId": "CALL-2"}, "done": {"ok": true, "value": 7, "attempts": 1}, "count": 2}, "criterion": "idempotent-calls"},

      {"call": "(function(){var f=__fixture();var d=createDispatcher(f.registry,f.session);var a=d.call('orders.read',{status:'open'},{idempotencyKey:'__proto__'});var b=d.call('ledger.sync',{batchId:'B'},{idempotencyKey:'__proto__'});return {a:a,b:b,ran:f.log.length};})()", "expected": {"a": {"ok": true, "value": {"count": 2}, "attempts": 1}, "b": {"ok": true, "value": {"count": 2}, "attempts": 1}, "ran": 1}, "criterion": "idempotent-calls"},
      {"call": "(function(){var f=__fixture();var d=createDispatcher(f.registry,f.session);var args={orderId:'A',amountCents:100,currency:'USD'};var waiting=d.call('refunds.create',args);args.amountCents=999;args.currency='EUR';var out=d.approve(waiting.callId);return {out:out,amount:f.log[0].args.amountCents,currency:f.log[0].args.currency};})()", "expected": {"out": {"ok": true, "value": {"refundId": "RFD-1", "amountCents": 100}, "attempts": 1}, "amount": 100, "currency": "USD"}, "criterion": "approval-held"},
      {"call": "(function(){var registry={'x':{scope:'x',schema:{},handler:function(){throw new Error('');}}};return createDispatcher(registry,{operatorId:'U',scopes:['x']}).call('x',{});})()", "expected": {"ok": false, "reason": "tool_failed", "attempts": 1, "error": ""}},
      {"call": "(function(){var f=__fixture();Object.freeze(f.session.scopes);Object.freeze(f.session);Object.keys(f.registry).forEach(function(k){Object.freeze(f.registry[k].schema);Object.freeze(f.registry[k]);});Object.freeze(f.registry);var d=createDispatcher(f.registry,f.session);var args=Object.freeze({orderId:'A',amountCents:0,currency:'EUR'});var wait=d.call('refunds.create',args,{idempotencyKey:'constructor'});var result=d.approve(wait.callId);var again=d.call('unknown',{}, {idempotencyKey:'constructor'});return {result:result,again:again,ran:f.log.length};})()", "expected": {"result": {"ok": true, "value": {"refundId": "RFD-1", "amountCents": 0}, "attempts": 1}, "again": {"ok": true, "value": {"refundId": "RFD-1", "amountCents": 0}, "attempts": 1}, "ran": 1}, "criterion": "idempotent-calls"},
      {"call": "(function(){var f=__fixture();var d=createDispatcher(f.registry,f.session);var a=d.call('refunds.create',{orderId:'A',amountCents:100,currency:'USD'},{idempotencyKey:''});var b=d.call('refunds.create',{orderId:'B',amountCents:200,currency:'EUR'},{idempotencyKey:''});return {a:a,b:b,ran:f.log.length};})()", "expected": {"a": {"ok": false, "reason": "pending_approval", "callId": "CALL-1"}, "b": {"ok": false, "reason": "pending_approval", "callId": "CALL-1"}, "ran": 0}, "criterion": "idempotent-calls"},

      {
        call: "(function () { var f = __fixture({ scopes: ['orders.read'] }); var d = createDispatcher(f.registry, f.session); var out = d.call('refunds.create', {}); return { out: out, ran: f.log.length }; })()",
        expected: { out: { ok: false, reason: 'scope_denied', scope: 'refunds.write' }, ran: 0 },
        criterion: 'scope-enforced',
      },
      {
        call: "(function () { var f = __fixture({ scopes: ['orders.read', 'refunds'] }); var d = createDispatcher(f.registry, f.session); var out = d.call('refunds.create', { orderId: 'ORD-4471', amountCents: 24050, currency: 'USD' }); return { out: out, ran: f.log.length }; })()",
        expected: { out: { ok: false, reason: 'scope_denied', scope: 'refunds.write' }, ran: 0 },
        criterion: 'scope-enforced',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var a = d.call('orders.read', {}); var b = d.call('orders.read', { status: 'archived' }); return { a: a, b: b, ran: f.log.length }; })()",
        expected: {
          a: { ok: true, value: { count: 2 }, attempts: 1 },
          b: { ok: false, reason: 'invalid_arguments', field: 'status', problem: 'enum' },
          ran: 1,
        },
        criterion: 'validated-before-effect',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var a = d.call('refunds.create', { orderId: null, amountCents: 24050, currency: 'USD' }); var b = d.call('refunds.create', { orderId: 'ORD-4471', amountCents: 0, currency: 'USD' }); return { a: a, b: b, ran: f.log.length }; })()",
        expected: {
          a: { ok: false, reason: 'invalid_arguments', field: 'orderId', problem: 'type' },
          b: { ok: false, reason: 'pending_approval', callId: 'CALL-1' },
          ran: 0,
        },
        criterion: 'validated-before-effect',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var a = d.call('orders.read', { status: 'open' }, { idempotencyKey: 'IDK-9' }); var b = d.call('ledger.sync', { batchId: 'BAT-1' }, { idempotencyKey: 'IDK-9' }); return { a: a, b: b, tools: __tools(f.log) }; })()",
        expected: {
          a: { ok: true, value: { count: 2 }, attempts: 1 },
          b: { ok: true, value: { count: 2 }, attempts: 1 },
          tools: ['orders.read'],
        },
        criterion: 'idempotent-calls',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var args = { orderId: 'ORD-4471', amountCents: 24050, currency: 'USD' }; var a = d.call('refunds.create', args, { idempotencyKey: 'IDK-4' }); var b = d.call('refunds.create', args, { idempotencyKey: 'IDK-4' }); var first = d.approve(a.callId); var second = d.approve(a.callId); return { a: a, b: b, first: first, second: second, ran: f.log.length }; })()",
        expected: {
          a: { ok: false, reason: 'pending_approval', callId: 'CALL-1' },
          b: { ok: false, reason: 'pending_approval', callId: 'CALL-1' },
          first: { ok: true, value: { refundId: 'RFD-1', amountCents: 24050 }, attempts: 1 },
          second: { ok: false, reason: 'unknown_call' },
          ran: 1,
        },
        criterion: 'idempotent-calls',
      },
      {
        call: "(function () { var f = __fixture({ readFails: 1 }); var d = createDispatcher(f.registry, f.session); var out = d.call('orders.read', { status: 'open' }); return { out: out, ran: f.log.length }; })()",
        expected: { out: { ok: false, reason: 'tool_failed', attempts: 1, error: 'orders backend unavailable' }, ran: 1 },
        criterion: 'retry-budget',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var e = createDispatcher(f.registry, f.session); var a = d.call('refunds.create', { orderId: 'ORD-4471', amountCents: 100, currency: 'USD' }); var b = d.call('refunds.create', { orderId: 'ORD-4472', amountCents: 200, currency: 'EUR' }); var c = e.call('refunds.create', { orderId: 'ORD-4473', amountCents: 300, currency: 'GBP' }); return [a.callId, b.callId, c.callId]; })()",
        expected: ['CALL-1', 'CALL-2', 'CALL-1'],
      },

      /* ── the approval state: pending, approved, rejected ─────────────── */
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var a = d.call('refunds.create', { orderId: 'ORD-1', amountCents: 100, currency: 'USD' }); var b = d.call('refunds.create', { orderId: 'ORD-2', amountCents: 200, currency: 'EUR' }); var no = d.reject('CALL-1'); var again = d.reject('CALL-1'); var late = d.approve('CALL-1'); var left = d.pending(); var yes = d.approve('CALL-2'); return { no: no, again: again, late: late, left: left, yes: yes, after: d.pending(), ran: f.log.length, refunded: f.log.map(function (e) { return e.args.orderId; }) }; })()",
        expected: {
          no: { ok: false, reason: 'rejected', callId: 'CALL-1' },
          again: { ok: false, reason: 'unknown_call' },
          late: { ok: false, reason: 'unknown_call' },
          left: [{ callId: 'CALL-2', tool: 'refunds.create', args: { orderId: 'ORD-2', amountCents: 200, currency: 'EUR' } }],
          yes: { ok: true, value: { refundId: 'RFD-1', amountCents: 200 }, attempts: 1 },
          after: [],
          ran: 1,
          refunded: ['ORD-2'],
        },
        criterion: 'approval-held',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var args = { orderId: 'ORD-1', amountCents: 100, currency: 'USD' }; var a = d.call('refunds.create', args, { idempotencyKey: 'IDK-R' }); var no = d.reject(a.callId); var replay = d.call('refunds.create', args, { idempotencyKey: 'IDK-R' }); return { no: no, replay: replay, queued: d.pending().length, ran: f.log.length }; })()",
        expected: {
          no: { ok: false, reason: 'rejected', callId: 'CALL-1' },
          replay: { ok: false, reason: 'rejected', callId: 'CALL-1' },
          queued: 0,
          ran: 0,
        },
        criterion: 'approval-held',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); d.call('refunds.create', { orderId: 'ORD-1', amountCents: 100, currency: 'USD' }); var shown = d.pending(); shown[0].args.amountCents = 99999; shown.length = 0; var out = d.approve('CALL-1'); return { out: out, amount: f.log[0].args.amountCents, unknown: d.reject('CALL-404') }; })()",
        expected: {
          out: { ok: true, value: { refundId: 'RFD-1', amountCents: 100 }, attempts: 1 },
          amount: 100,
          unknown: { ok: false, reason: 'unknown_call' },
        },
        criterion: 'approval-held',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var sub = d.delegate({ scopes: ['refunds.write'], maxCalls: 5 }); var mine = d.call('refunds.create', { orderId: 'ORD-1', amountCents: 100, currency: 'USD' }); var theirs = sub.call('refunds.create', { orderId: 'ORD-2', amountCents: 200, currency: 'USD' }); return { mine: mine, theirs: theirs, canApprove: typeof sub.approve, canReject: typeof sub.reject, queue: d.pending().map(function (p) { return p.callId; }), ran: f.log.length }; })()",
        expected: {
          mine: { ok: false, reason: 'pending_approval', callId: 'CALL-1' },
          theirs: { ok: false, reason: 'pending_approval', callId: 'CALL-2' },
          canApprove: 'undefined',
          canReject: 'undefined',
          queue: ['CALL-1', 'CALL-2'],
          ran: 0,
        },
        criterion: 'approval-held',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var sub = d.delegate({ scopes: ['refunds.write', 'orders.read'], maxCalls: 4 }); var a = sub.call('refunds.create', { orderId: 'ORD-1', amountCents: 100, currency: 'USD' }, { idempotencyKey: 'K1' }); var b = sub.call('refunds.create', { orderId: 'ORD-2', amountCents: 200, currency: 'USD' }, { idempotencyKey: 'K2' }); d.reject(a.callId); d.approve(b.callId); var rejected = sub.call('refunds.create', { orderId: 'ORD-1', amountCents: 100, currency: 'USD' }, { idempotencyKey: 'K1' }); var approved = sub.call('refunds.create', { orderId: 'ORD-2', amountCents: 200, currency: 'USD' }, { idempotencyKey: 'K2' }); var parent = d.call('orders.read', { status: 'open' }, { idempotencyKey: 'K1' }); return { rejected: rejected, approved: approved, parent: parent, queued: d.pending().length, refunded: f.log.filter(function (e) { return e.tool === 'refunds.create'; }).map(function (e) { return e.args.orderId; }) }; })()",
        expected: {
          rejected: { ok: false, reason: 'rejected', callId: 'CALL-1' },
          approved: { ok: true, value: { refundId: 'RFD-1', amountCents: 200 }, attempts: 1 },
          parent: { ok: true, value: { count: 2 }, attempts: 1 },
          queued: 0,
          refunded: ['ORD-2'],
        },
        criterion: 'approval-held',
      },

      /* ── sub-agents: narrowed scopes and a call budget ────────────────── */
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var narrow = d.delegate({ scopes: ['orders.read'], maxCalls: 3 }); var prefix = d.delegate({ scopes: ['refunds', 'ledger'], maxCalls: 3 }); var none = d.delegate({ scopes: 'ledger.write', maxCalls: 3 }); return { narrow: narrow.call('ledger.sync', { batchId: 'B' }), prefix: prefix.call('ledger.sync', { batchId: 'B' }), none: none.call('orders.read', {}), ran: f.log.length }; })()",
        expected: {
          narrow: { ok: false, reason: 'scope_denied', scope: 'ledger.write' },
          prefix: { ok: false, reason: 'scope_denied', scope: 'ledger.write' },
          none: { ok: false, reason: 'scope_denied', scope: 'orders.read' },
          ran: 0,
        },
        criterion: 'scope-enforced',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var parent = d.call('orders.read', { status: 'open' }, { idempotencyKey: 'IDK-1' }); var sub = d.delegate({ scopes: ['ledger.write'], maxCalls: 3 }); var replay = sub.call('orders.read', { status: 'open' }, { idempotencyKey: 'IDK-1' }); return { parent: parent, replay: replay, ran: f.log.length }; })()",
        expected: {
          parent: { ok: true, value: { count: 2 }, attempts: 1 },
          replay: { ok: false, reason: 'scope_denied', scope: 'orders.read' },
          ran: 1,
        },
        criterion: 'scope-enforced',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var zero = d.delegate({ scopes: ['orders.read'], maxCalls: 0 }); var missing = d.delegate({ scopes: ['orders.read'] }); var a = d.delegate({ scopes: ['orders.read'], maxCalls: 1 }); var b = d.delegate({ scopes: ['orders.read'], maxCalls: 1 }); return { zero: zero.call('orders.read', {}), missing: missing.call('orders.read', {}), a1: a.call('orders.read', {}), a2: a.call('orders.read', {}), b1: b.call('orders.read', {}), parent: d.call('orders.read', {}), ran: f.log.length }; })()",
        expected: {
          zero: { ok: false, reason: 'budget_exhausted', maxCalls: 0 },
          missing: { ok: false, reason: 'budget_exhausted', maxCalls: 0 },
          a1: { ok: true, value: { count: 2 }, attempts: 1 },
          a2: { ok: false, reason: 'budget_exhausted', maxCalls: 1 },
          b1: { ok: true, value: { count: 2 }, attempts: 1 },
          parent: { ok: true, value: { count: 2 }, attempts: 1 },
          ran: 3,
        },
        criterion: 'subagent-budget',
      },
      {
        call: "(function () { var f = __fixture({ syncFails: 2 }); var d = createDispatcher(f.registry, f.session); var sub = d.delegate({ scopes: ['ledger.write', 'orders.read'], maxCalls: 3 }); var a = sub.call('orders.purge', {}); var b = sub.call('orders.read', { status: 'archived' }); var c = sub.call('ledger.sync', { batchId: 'B' }); var e = sub.call('ledger.sync', { batchId: 'B' }, { idempotencyKey: 'IDK-1' }); return { a: a.reason, b: b.reason, c: c, e: e, ran: f.log.length }; })()",
        expected: {
          a: 'unknown_tool',
          b: 'invalid_arguments',
          c: { ok: true, value: { batchId: 'B', synced: true }, attempts: 3 },
          e: { ok: false, reason: 'budget_exhausted', maxCalls: 3 },
          ran: 3,
        },
        criterion: 'subagent-budget',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var out = [Infinity, 2.5, '3', -1].map(function (n) { return d.delegate({ scopes: ['orders.read'], maxCalls: n }).call('orders.read', {}); }); return { out: out, ran: f.log.length }; })()",
        expected: {
          out: [
            { ok: false, reason: 'budget_exhausted', maxCalls: 0 },
            { ok: false, reason: 'budget_exhausted', maxCalls: 0 },
            { ok: false, reason: 'budget_exhausted', maxCalls: 0 },
            { ok: false, reason: 'budget_exhausted', maxCalls: 0 },
          ],
          ran: 0,
        },
        criterion: 'subagent-budget',
      },
      {
        call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var sub = d.delegate({ scopes: ['orders.read'], maxCalls: 1 }); var a = sub.call('orders.read', { status: 'open' }, { idempotencyKey: 'K' }); var b = sub.call('orders.read', { status: 'open' }, { idempotencyKey: 'K' }); return { a: a, b: b, ran: f.log.length }; })()",
        expected: {
          a: { ok: true, value: { count: 2 }, attempts: 1 },
          b: { ok: false, reason: 'budget_exhausted', maxCalls: 1 },
          ran: 1,
        },
        criterion: 'subagent-budget',
      },
    ],
  },
};
