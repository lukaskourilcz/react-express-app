/** Server-only reference solutions and hidden assertions for the FDE bridge
 * module. Never imported from client code, and never from `../catalog`.
 *
 * The hidden assertions go after what the visible ones leave open: a
 * non-integer id that still looks numeric, a record whose fields are all
 * `null`, a plan that differs from a real one only by its first letter, a
 * problem list whose field order and alphabetical order disagree, and the
 * responses that arrive after the operator has already cancelled. */

import type { PathCodeSolution } from '../types';

export const FDE_BRIDGES_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-bridge-backend-mapping': {
    solution: `type Plan = 'starter' | 'growth' | 'enterprise';

interface RawAccount {
  account_id?: unknown;
  company_name?: unknown;
  owner_email?: unknown;
  signed_up_at?: unknown;
  plan?: unknown;
}

interface Account {
  id: number;
  companyName: string;
  ownerEmail: string;
  signedUpAt: string | null;
  plan: Plan;
}

type MapResult = { ok: true; record: Account } | { ok: false; problems: string[] };

const mapAccount = (raw: RawAccount): MapResult => {
  const problems: string[] = [];
  const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

  let id = 0;
  if (typeof raw.account_id === 'number' && Number.isInteger(raw.account_id)) id = raw.account_id;
  else if (/^\\d+$/.test(text(raw.account_id))) id = Number(text(raw.account_id));
  else problems.push('account_id must be a whole number');

  const companyName = text(raw.company_name);
  if (companyName === '') problems.push('company_name must not be empty');

  const ownerEmail = text(raw.owner_email).toLowerCase();
  if (!ownerEmail.includes('@')) problems.push('owner_email must contain @');

  const rawDate = raw.signed_up_at;
  let signedUpAt: string | null = null;
  if (rawDate === undefined || rawDate === null || text(rawDate) === '') signedUpAt = null;
  else if (typeof rawDate === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(rawDate.trim())) signedUpAt = rawDate.trim();
  else problems.push('signed_up_at must be YYYY-MM-DD');

  let plan: Plan = 'starter';
  const planText = text(raw.plan);
  if (planText === 'starter' || planText === 'growth' || planText === 'enterprise') plan = planText;
  else problems.push('plan must be one of starter, growth or enterprise');

  if (problems.length > 0) return { ok: false, problems: problems.sort() };
  return { ok: true, record: { id, companyName, ownerEmail, signedUpAt, plan } };
};`,
    hiddenTests: [
      {
        call: 'mapAccount(__raw({ account_id: 4821.5 }))',
        expected: { ok: false, problems: ['account_id must be a whole number'] },
      },
      {
        call: "mapAccount(__raw({ account_id: '  0084  ' }))",
        expected: {
          ok: true,
          record: {
            id: 84,
            companyName: 'Brightpier Freight',
            ownerEmail: 'ops@brightpier.example',
            signedUpAt: '2026-03-04',
            plan: 'growth',
          },
        },
      },
      {
        call: "mapAccount(__raw({ owner_email: 'ops-at-brightpier.example' }))",
        expected: { ok: false, problems: ['owner_email must contain @'] },
      },
      {
        call: "mapAccount(__raw({ company_name: '   ' }))",
        expected: { ok: false, problems: ['company_name must not be empty'] },
      },
      {
        call: "mapAccount(__raw({ plan: 'Growth' }))",
        expected: { ok: false, problems: ['plan must be one of starter, growth or enterprise'] },
      },
      {
        call: 'mapAccount(__raw({ account_id: null, company_name: null, owner_email: null, signed_up_at: null, plan: null }))',
        expected: {
          ok: false,
          problems: [
            'account_id must be a whole number',
            'company_name must not be empty',
            'owner_email must contain @',
            'plan must be one of starter, growth or enterprise',
          ],
        },
      },
      {
        call: 'Object.keys(mapAccount(__raw({}))).sort()',
        expected: ['ok', 'record'],
      },
      {
        call: "mapAccount(__raw({ plan: 'platinum', signed_up_at: 'yesterday' }))",
        expected: {
          ok: false,
          problems: ['plan must be one of starter, growth or enterprise', 'signed_up_at must be YYYY-MM-DD'],
        },
        criterion: 'deterministic-problems',
      },
    ],
    hiddenTypeTests: [
      {
        code: 'const __problems: string[] = ((): string[] => { const result = mapAccount({}); return result.ok ? [] : result.problems; })();',
        label: 'the failing branch narrows to a list of problem strings',
      },
      {
        code: "const __date: string = ((): string => { const result = mapAccount({ signed_up_at: '' }); return result.ok ? result.record.signedUpAt : ''; })();",
        label: 'signedUpAt is nullable and cannot be read as a plain string',
        rejects: true,
      },
    ],
  },
  'fde-v1-bridge-operator-state': {
    solution: `const initialOperatorState = {
  status: 'idle',
  requestId: null,
  proposal: null,
  error: null,
  abandoned: [],
};

const operatorReducer = (state, action) => {
  if (!action || typeof action.type !== 'string') return state;
  const inFlight = state.status === 'loading' || state.status === 'approving';

  switch (action.type) {
    case 'load':
      if (inFlight) return state;
      return { ...state, status: 'loading', requestId: action.requestId, proposal: null, error: null };

    case 'loaded':
      if (state.status !== 'loading' || action.requestId !== state.requestId) return state;
      return { ...state, status: 'ready', requestId: null, proposal: action.proposal, error: null };

    case 'approve':
      if (state.status !== 'ready') return state;
      return { ...state, status: 'approving', requestId: action.requestId, error: null };

    case 'approved':
      if (state.status !== 'approving' || action.requestId !== state.requestId) return state;
      return { ...state, status: 'approved', requestId: null };

    case 'failed':
      if (!inFlight || action.requestId !== state.requestId) return state;
      return { ...state, status: 'error', requestId: null, error: action.message };

    case 'cancel':
      if (!inFlight) return state;
      return {
        status: 'idle',
        requestId: null,
        proposal: null,
        error: null,
        abandoned: [...state.abandoned, state.requestId],
      };

    default:
      return state;
  }
};`,
    hiddenTests: [
      {
        call: "(function () { var state = __run([]); return operatorReducer(state, { type: 'approve', requestId: 9 }) === state; })()",
        expected: true,
      },
      {
        call: "(function () { var state = __run([]); return operatorReducer(state, { type: 'cancel' }) === state; })()",
        expected: true,
      },
      {
        call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'load', requestId: 2 }]))",
        expected: { status: 'loading', requestId: 1, proposal: null, error: null, abandoned: [] },
      },
      {
        call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'loaded', requestId: 2, proposal: __proposal }]))",
        expected: { status: 'loading', requestId: 1, proposal: null, error: null, abandoned: [] },
        criterion: 'stale-responses',
      },
      {
        call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'cancel' }, { type: 'failed', requestId: 1, message: 'ticket service timed out' }]))",
        expected: { status: 'idle', requestId: null, proposal: null, error: null, abandoned: [1] },
        criterion: 'stale-responses',
      },
      {
        call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'cancel' }, { type: 'load', requestId: 3 }, { type: 'loaded', requestId: 3, proposal: __proposal }]))",
        expected: {
          status: 'ready',
          requestId: null,
          proposal: { ticketId: 'BP-4821', action: 'refund', amountCents: 12500 },
          error: null,
          abandoned: [1],
        },
      },
      {
        call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'failed', requestId: 1, message: 'ticket service timed out' }, { type: 'load', requestId: 2 }]))",
        expected: { status: 'loading', requestId: 2, proposal: null, error: null, abandoned: [] },
      },
      {
        call: "__view(__run([{ type: 'load', requestId: 1 }, { type: 'cancel' }, { type: 'load', requestId: 2 }, { type: 'cancel' }]))",
        expected: { status: 'idle', requestId: null, proposal: null, error: null, abandoned: [1, 2] },
      },
    ],
  },
};
