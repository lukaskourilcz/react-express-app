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
 * dead request overwrite a live one.
 *
 * The module's three written artifacts (`fde-v1-m10-runbook`,
 * `fde-v1-m10-workshop-outline`, `fde-v1-m10-pushback-email`) have nothing
 * here: the grader records each as self-reviewed after checking presence and
 * length caps, so there is no reference to seal. */

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
  const messageOf = (thrown) => (thrown && typeof thrown.message === 'string' ? thrown.message : String(thrown));

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
        announce('Approval request failed; check its server outcome: ' + state.error);
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
    announce('Cancelled locally. Late answers will be ignored. A submitted approval may still complete; check its server status.');
  };

  const noteRevision = (revision) => {
    if (state.status !== 'ready' || !state.proposal || state.superseded) return;
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
      {"call": "(async function(){var f=__fixture();var s=createOperatorSession(f.deps);s.load('A');await __drain();s.noteRevision(8);var count=f.announcements.length;var before=JSON.stringify(s.getState());s.noteRevision(8);s.noteRevision(9);return {same:before===JSON.stringify(s.getState()),extra:f.announcements.length-count};})()", "expected": {"same": true, "extra": 0}, "label": "once superseded, later revision notices do not change state or announce again", "async": true},
      {"call": "(async function(){var spoken=[];var s=createOperatorSession({loadProposal:function(){return Promise.reject(new Error(''));},submitApproval:function(){throw new Error('not called');},announce:function(x){spoken.push(x);}});await s.load('A');return {status:s.getState().status,error:s.getState().error,announcements:spoken.length};})()", "expected": {"status": "error", "error": "", "announcements": 2}, "label": "an empty Error message from loading remains an empty string", "async": true},
      {"call": "(async function(){var f=__fixture();f.deps.submitApproval=function(){return Promise.reject(new Error(''));};var s=createOperatorSession(f.deps);await s.load('A');await s.approve();return {status:s.getState().status,error:s.getState().error,proposal:s.getState().proposal.ticketId};})()", "expected": {"status": "error", "error": "", "proposal": "A"}, "label": "an empty approval error message is preserved with its proposal", "async": true},
      {"call": "(async function(){var f=__fixture({loadFails:'late failure',loadDelay:100});var s=createOperatorSession(f.deps);s.load('A');s.cancel();var before=JSON.stringify(s.getState());var count=f.announcements.length;await __drain();return {same:before===JSON.stringify(s.getState()),extra:f.announcements.length-count,abandoned:s.getState().abandoned};})()", "expected": {"same": true, "extra": 0, "abandoned": [1]}, "label": "a cancelled failing load is silent and cannot overwrite any field", "async": true},
      {"call": "(async function(){var f=__fixture({approveFails:'late approval failure',approveDelay:300});var s=createOperatorSession(f.deps);await s.load('A');s.approve();s.cancel();await s.load('B');var before=JSON.stringify(s.getState()),count=f.announcements.length;await __drain();return {same:before===JSON.stringify(s.getState()),extra:f.announcements.length-count,abandoned:s.getState().abandoned,submitted:f.submissions};})()", "expected": {"same": true, "extra": 0, "abandoned": [2], "submitted": [{"ticketId": "A", "revision": 7}]}, "label": "late rejected approval stays silent after a new ticket is ready", "async": true},
      {"call": "(async function(){var f=__fixture();var s=createOperatorSession(f.deps);s.cancel();s.reject();s.approve();s.load('A');s.load('B');s.cancel();await __drain();s.load('C');s.cancel();await __drain();return {abandoned:s.getState().abandoned,loads:f.loads,announcements:f.announcements.length};})()", "expected": {"abandoned": [1, 2], "loads": ["A", "C"], "announcements": 8}, "label": "refused actions do not allocate ids and every refusal is announced", "async": true},
      {"call": "(async function(){var f=__fixture({revision:0,warnings:['one','two']});var s=createOperatorSession(f.deps);await s.load('A');var a=s.getState(),b=s.getState();await s.approve();return {fresh:a!==b,warnings:s.getState().warnings,payload:f.submissions,status:s.getState().status};})()", "expected": {"fresh": true, "warnings": ["one", "two"], "payload": [{"ticketId": "A", "revision": 0}], "status": "approved"}, "label": "zero revision, warnings and fresh top-level snapshots preserve explicit approval payload", "async": true},

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
      // A revision that is not newer than the loaded one supersedes nothing.
      {
        call: '(async function () { var f = __fixture(); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); var revision = s.getState().proposal.revision; s.noteRevision(revision); s.noteRevision(revision - 1); var superseded = s.getState().superseded; __go(s.approve()); await __drain(); return { superseded: superseded, status: s.getState().status, submitted: f.submissions.length }; })()',
        expected: { superseded: false, status: 'approved', submitted: 1 },
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
