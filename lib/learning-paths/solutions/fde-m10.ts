/** Server-only reference solution and hidden assertions for FDE M10.
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible tests show the happy path, the two cancels and the two refused
 * approvals. The hidden ones aim at what those leave open: a load that fails
 * and has to keep its message, a rejection that keeps the proposal on screen,
 * the exact payload `submitApproval` receives, an approval that fails after
 * the request left, an approve pressed from `idle` and pressed twice, a second
 * `load` that must never reach the dependency, and the ordering case where a
 * slow abandoned answer lands after a newer request has already gone `ready`.
 *
 * The two guard criteria carry the assertions that matter here, so a working
 * happy path cannot average away a screen that approves stale data or lets a
 * dead request overwrite a live one. */

import type { PathCodeSolution } from '../types';

const OPERATOR_SESSION = `const createOperatorSession = (deps) => {
  const state = {
    status: 'idle',
    ticketId: null,
    proposal: null,
    citations: [],
    warnings: [],
    superseded: false,
    receiptId: null,
    error: null,
    statusMessage: '',
    abandoned: [],
  };
  let nextRequest = 0;
  let inFlight = null;

  const announce = (message) => {
    state.statusMessage = message;
    if (deps && typeof deps.announce === 'function') deps.announce(message);
  };

  const clearProposal = () => {
    state.proposal = null;
    state.citations = [];
    state.warnings = [];
    state.superseded = false;
    state.receiptId = null;
  };

  const start = () => {
    nextRequest += 1;
    inFlight = nextRequest;
    return nextRequest;
  };

  const stale = (id) => inFlight !== id;
  const messageOf = (thrown) => String((thrown && thrown.message) || thrown);

  const load = (ticketId) => {
    if (state.status === 'loading' || state.status === 'approving') {
      announce('A request is already running. Cancel it before loading another ticket.');
      return Promise.resolve();
    }
    const id = start();
    state.status = 'loading';
    state.ticketId = ticketId;
    state.error = null;
    clearProposal();
    announce('Loading the proposal for ticket ' + ticketId + '.');
    return Promise.resolve(deps.loadProposal(ticketId)).then(
      (result) => {
        if (stale(id)) return;
        inFlight = null;
        const answer = result || {};
        state.status = 'ready';
        state.proposal = answer.proposal || null;
        state.citations = answer.citations || [];
        state.warnings = answer.warnings || [];
        state.superseded = false;
        state.error = null;
        announce(state.warnings.length === 0
          ? 'Proposal ready for ticket ' + ticketId + ' with ' + state.citations.length + ' citations.'
          : 'Proposal ready for ticket ' + ticketId + ' with ' + state.citations.length + ' citations and '
            + state.warnings.length + ' warnings to read before you approve.');
      },
      (thrown) => {
        if (stale(id)) return;
        inFlight = null;
        state.status = 'error';
        clearProposal();
        state.error = messageOf(thrown);
        announce('Loading ticket ' + ticketId + ' failed: ' + state.error);
      },
    );
  };

  const approve = () => {
    if (state.status !== 'ready') {
      announce('Approval needs a proposal on screen. Nothing was sent.');
      return Promise.resolve();
    }
    if (state.superseded) {
      announce('This ticket changed after the proposal was built. Load it again before approving.');
      return Promise.resolve();
    }
    const id = start();
    const ticketId = state.ticketId;
    const revision = state.proposal ? state.proposal.revision : null;
    state.status = 'approving';
    state.error = null;
    announce('Sending your approval for ticket ' + ticketId + '.');
    return Promise.resolve(deps.submitApproval({ ticketId: ticketId, revision: revision })).then(
      (result) => {
        if (stale(id)) return;
        inFlight = null;
        state.status = 'approved';
        state.receiptId = (result && result.receiptId) || null;
        announce('Approved. Receipt ' + state.receiptId + '.');
      },
      (thrown) => {
        if (stale(id)) return;
        inFlight = null;
        state.status = 'error';
        state.error = messageOf(thrown);
        announce('The approval did not go through: ' + state.error);
      },
    );
  };

  const reject = () => {
    if (state.status !== 'ready') {
      announce('There is no proposal on screen to reject.');
      return;
    }
    state.status = 'rejected';
    state.error = null;
    announce('Rejected. Nothing was sent to the ticket service.');
  };

  const cancel = () => {
    if (state.status !== 'loading' && state.status !== 'approving') {
      announce('There is no request in flight to cancel.');
      return;
    }
    if (inFlight !== null) state.abandoned.push(inFlight);
    inFlight = null;
    state.status = 'idle';
    state.ticketId = null;
    state.error = null;
    clearProposal();
    announce('Cancelled. The screen is back to idle and the answer to the abandoned request will be ignored.');
  };

  const noteRevision = (revision) => {
    if (state.status !== 'ready' || !state.proposal) return;
    if (!(revision > state.proposal.revision)) return;
    state.superseded = true;
    announce('The ticket changed while you were reading. Load it again before approving.');
  };

  const getState = () => ({
    status: state.status,
    ticketId: state.ticketId,
    proposal: state.proposal,
    citations: state.citations.slice(),
    warnings: state.warnings.slice(),
    superseded: state.superseded,
    receiptId: state.receiptId,
    error: state.error,
    statusMessage: state.statusMessage,
    abandoned: state.abandoned.slice(),
  });

  return {
    getState: getState,
    load: load,
    approve: approve,
    reject: reject,
    cancel: cancel,
    noteRevision: noteRevision,
  };
};`;

export const FDE_M10_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m10-operator-state': {
    solution: OPERATOR_SESSION,
    hiddenTests: [
      {
        call: '(async function () { var f = __fixture({ loadFails: "The ticket service timed out." }); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); return __view(s.getState()); })()',
        expected: {
          status: 'error',
          ticketId: 'MB-3312',
          proposalTicket: null,
          revision: null,
          citations: [],
          warnings: [],
          superseded: false,
          receiptId: null,
          error: 'The ticket service timed out.',
        },
        async: true,
      },
      {
        call: '(async function () { var f = __fixture(); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); s.reject(); return { view: __view(s.getState()), submitted: f.submissions.length }; })()',
        expected: {
          view: {
            status: 'rejected',
            ticketId: 'MB-3312',
            proposalTicket: 'MB-3312',
            revision: 7,
            citations: ['KB-118', 'TCK-3312-note-2'],
            warnings: [],
            superseded: false,
            receiptId: null,
            error: null,
          },
          submitted: 0,
        },
        async: true,
      },
      {
        call: '(async function () { var f = __fixture({ revision: 12 }); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); __go(s.approve()); await __drain(); return f.submissions; })()',
        expected: [{ ticketId: 'MB-3312', revision: 12 }],
        async: true,
      },
      {
        call: '(async function () { var f = __fixture({ approveFails: "The ticket service refused the approval." }); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); __go(s.approve()); await __drain(); return __view(s.getState()); })()',
        expected: {
          status: 'error',
          ticketId: 'MB-3312',
          proposalTicket: 'MB-3312',
          revision: 7,
          citations: ['KB-118', 'TCK-3312-note-2'],
          warnings: [],
          superseded: false,
          receiptId: null,
          error: 'The ticket service refused the approval.',
        },
        async: true,
      },
      {
        call: '(async function () { var f = __fixture(); var s = createOperatorSession(f.deps); __go(s.approve()); await __drain(); return { status: s.getState().status, submitted: f.submissions.length }; })()',
        expected: { status: 'idle', submitted: 0 },
        async: true,
        criterion: 'approval-guarded',
      },
      {
        call: '(async function () { var f = __fixture(); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); __go(s.approve()); await __drain(); __go(s.approve()); await __drain(); var st = s.getState(); return { status: st.status, receiptId: st.receiptId, submitted: f.submissions.length }; })()',
        expected: { status: 'approved', receiptId: 'RCP-1', submitted: 1 },
        async: true,
        criterion: 'approval-guarded',
      },
      {
        call: '(async function () { var f = __fixture({ loadDelay: 100 }); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); __go(s.load("MB-9001")); await __drain(); var st = s.getState(); return { loads: f.loads, ticketId: st.ticketId, proposalTicket: st.proposal ? st.proposal.ticketId : null, status: st.status }; })()',
        expected: { loads: ['MB-3312'], ticketId: 'MB-3312', proposalTicket: 'MB-3312', status: 'ready' },
        async: true,
        criterion: 'no-stale-overwrite',
      },
      {
        call: '(async function () { var f = __fixture({ loadDelays: [300, 50] }); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); s.cancel(); __go(s.load("MB-9001")); await __drain(); var st = s.getState(); return { view: __view(st), abandoned: st.abandoned, loads: f.loads }; })()',
        expected: {
          view: {
            status: 'ready',
            ticketId: 'MB-9001',
            proposalTicket: 'MB-9001',
            revision: 7,
            citations: ['KB-118', 'TCK-3312-note-2'],
            warnings: [],
            superseded: false,
            receiptId: null,
            error: null,
          },
          abandoned: [1],
          loads: ['MB-3312', 'MB-9001'],
        },
        async: true,
        criterion: 'no-stale-overwrite',
      },
    ],
  },
};
