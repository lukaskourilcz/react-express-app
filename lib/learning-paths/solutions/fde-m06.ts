/** Server-only reference solution and hidden assertions for FDE M06.
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible tests show each gate working on its own. The hidden ones aim at
 * the seams between gates: a scope refusal that has to win over an argument
 * refusal, a scope compared by prefix instead of by whole string, `null`
 * mistaken for absent, a key replayed against a different tool, and a second
 * approval of a call that already ran. The two scope assertions and the two
 * argument assertions carry the critical criteria, so neither can be averaged
 * away by a working retry loop. */

import type { PathCodeSolution } from '../types';

const DISPATCHER = `const createDispatcher = (registry, session) => {
  const held = (session && session.scopes) || [];
  const completed = {};
  const pending = {};
  let nextId = 1;

  const validate = (schema, args) => {
    const declared = Object.keys(schema || {});
    for (const name of declared) {
      const rule = schema[name];
      if (!Object.prototype.hasOwnProperty.call(args, name)) {
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
        error = String((thrown && thrown.message) || thrown);
      }
    }
    return { ok: false, reason: 'tool_failed', attempts, error };
  };

  const settle = (key, result) => {
    if (key === undefined) return result;
    if (result.ok || result.reason === 'pending_approval') completed[key] = result;
    else delete completed[key];
    return result;
  };

  const call = (name, args, options) => {
    const request = args || {};
    const key = (options || {}).idempotencyKey;
    if (key !== undefined && Object.prototype.hasOwnProperty.call(completed, key)) return completed[key];

    if (!Object.prototype.hasOwnProperty.call(registry, name)) return { ok: false, reason: 'unknown_tool', tool: name };
    const tool = registry[name];

    if (held.indexOf(tool.scope) === -1) return { ok: false, reason: 'scope_denied', scope: tool.scope };

    const problem = validate(tool.schema, request);
    if (problem) return { ok: false, reason: 'invalid_arguments', field: problem.field, problem: problem.problem };

    if (tool.approval) {
      const callId = 'CALL-' + nextId;
      nextId += 1;
      pending[callId] = { tool, args: request, key };
      return settle(key, { ok: false, reason: 'pending_approval', callId });
    }

    return settle(key, run(tool, request));
  };

  const approve = callId => {
    if (!Object.prototype.hasOwnProperty.call(pending, callId)) return { ok: false, reason: 'unknown_call' };
    const waiting = pending[callId];
    delete pending[callId];
    return settle(waiting.key, run(waiting.tool, waiting.args));
  };

  return { call, approve };
};`;

export const FDE_M06_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m06-tool-dispatcher': {
    solution: DISPATCHER,
    hiddenTests: [
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
    ],
  },
};
