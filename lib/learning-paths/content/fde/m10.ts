/** M10 — Adoption and handoff.
 *
 * M09 got the thing running and gave you a way back when it broke. This
 * module is about the two people who inherit it: the operator who has to
 * press Approve on something a model proposed, and the on-call engineer who
 * opens your runbook at three in the morning having never seen the service.
 *
 * Two lessons, one four-question check, one graded exercise. The first lesson
 * is the operator's screen — the four questions an approval has to answer,
 * and the states a happy-path demo never shows. The second is acceptance,
 * the demo, the runbook and the one recurring need worth taking back to a
 * product team.
 *
 * Two claims are repeated on purpose. A cancel stops the screen from acting
 * on an answer; it does not un-send a request that already left the browser,
 * and pretending otherwise is where the reconciliation bugs come from. And a
 * length check on a status message proves the message exists, which is not
 * the same as proving an operator can act on it — the exercise says so in the
 * criterion detail rather than letting the pass imply more than it earned.
 *
 * Everything the exercise touches is an authored fixture. `__fixture` in the
 * task harness builds a ticket proposal, two citations, a recording approval
 * endpoint and a recording live region; nothing calls a provider, needs a key
 * or opens a socket. Marlbrook Systems, ticket MB-3312, Northgate Dairy and
 * the `marlbrook.example` hostnames are invented for this path. No real
 * customer data, credential, company or person appears in any of it. */

import type { ModuleSource } from '../../types';

/** The proposal, the citations and the two recording dependencies the
 * operator-session exercise is graded against. Appended after the learner's
 * code so the fixtures cannot be shadowed by a same-named declaration in the
 * submission.
 *
 * Delays run on the sandbox's virtual clock, so a 300 ms answer that arrives
 * after a 50 ms one finishes instantly and orders the same way on every run.
 * `__drain` waits past every fixture delay, which is how an assertion can ask
 * what the screen looked like once a late answer had its chance to land.
 * `__view` reads only the fields the grade covers, so a learner may keep
 * extra state without failing; `__voice` grades the live-region messages on
 * their own, because that criterion is not critical and must not be able to
 * drag the rest of the state down with it. */
const OPERATOR_FIXTURE = `
var __CITATIONS = [
  { id: 'KB-118', title: 'Refunds for duplicated invoices', url: 'https://kb.marlbrook.example/KB-118' },
  { id: 'TCK-3312-note-2', title: 'Operator note, 4 March', url: 'https://desk.marlbrook.example/TCK-3312#note-2' }
];
var __fixture = function (options) {
  var opts = options || {};
  var announcements = [];
  var submissions = [];
  var loads = [];
  var delayFor = function (index) {
    if (opts.loadDelays && opts.loadDelays.length > index) return opts.loadDelays[index];
    return opts.loadDelay === undefined ? 50 : opts.loadDelay;
  };
  var deps = {
    loadProposal: function (ticketId) {
      var index = loads.length;
      loads.push(ticketId);
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (opts.loadFails) { reject(new Error(opts.loadFails)); return; }
          resolve({
            proposal: {
              ticketId: ticketId,
              revision: opts.revision === undefined ? 7 : opts.revision,
              action: 'refund',
              amountCents: 4200,
              summary: 'Refund the duplicated March invoice for Northgate Dairy.'
            },
            citations: __CITATIONS.map(function (one) { return { id: one.id, title: one.title, url: one.url }; }),
            warnings: (opts.warnings || []).slice()
          });
        }, delayFor(index));
      });
    },
    submitApproval: function (request) {
      submissions.push(request);
      var receipt = 'RCP-' + submissions.length;
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (opts.approveFails) { reject(new Error(opts.approveFails)); return; }
          resolve({ receiptId: receipt });
        }, opts.approveDelay === undefined ? 50 : opts.approveDelay);
      });
    },
    announce: function (message) { announcements.push(message); }
  };
  return { deps: deps, announcements: announcements, submissions: submissions, loads: loads };
};
var __drain = function () { return new Promise(function (resolve) { setTimeout(resolve, 1000); }); };
var __go = function (value) {
  if (value && typeof value.then === 'function') value.then(function () {}, function () {});
  return value;
};
var __view = function (state) {
  var current = state || {};
  var proposal = current.proposal || null;
  return {
    status: current.status === undefined ? null : current.status,
    ticketId: current.ticketId === undefined ? null : current.ticketId,
    proposalTicket: proposal ? proposal.ticketId : null,
    revision: proposal ? proposal.revision : null,
    citations: (current.citations || []).map(function (one) { return one.id; }),
    warnings: (current.warnings || []).slice(),
    superseded: current.superseded === true,
    receiptId: current.receiptId === undefined ? null : current.receiptId,
    error: current.error === undefined ? null : current.error
  };
};
var __voice = function (fixture, session) {
  var spoken = fixture.announcements;
  var message = session.getState().statusMessage;
  return {
    count: spoken.length,
    allText: spoken.every(function (one) { return typeof one === 'string' && one.trim().length > 0; }),
    matchesState: typeof message === 'string' && message.trim().length > 0 && message === spoken[spoken.length - 1]
  };
};
`.trim();

export const FDE_M10: ModuleSource = {
  id: 'fde-v1-m10',
  title: 'Adoption and handoff',
  outcomes: [
    'Build an approval screen around the four questions an operator has to answer before pressing the button: what will happen, what it rests on, whether that basis is still current, and how to stop it.',
    'Handle loading, partial failure, retry, an openable citation and a cancel that abandons the in-flight request, so a late answer cannot overwrite a newer state.',
    'Announce every change of state where a screen reader will read it, and say what a check on those messages proves and what it leaves to your own review.',
    'Run a UAT that can end in a rejection, against acceptance conditions written before anybody sat down, and record accept, accept-with-conditions or reject with the numbers behind it.',
    'Write the runbook an on-call engineer can follow at three in the morning, and turn one recurring customer need into product input you can state without naming the customer.',
  ],
  competencies: ['handoff'],
  dependsOn: ['fde-v1-m09'],
  estimatedMinutes: 110,
  lessons: [
    {
      id: 'fde-v1-m10-l1',
      title: 'The operator’s screen',
      summary:
        'What an operator needs before an approval means anything, the states a happy-path demo never shows, and why the status message is part of the build rather than a later accessibility pass.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'MDN — aria-live',
          url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'MDN — AbortController',
          url: 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'RFC 9110 — HTTP Semantics',
          url: 'https://www.rfc-editor.org/rfc/rfc9110',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'An operator presses Approve and a refund leaves Marlbrook’s account. For that press to mean anything, four questions have to be answered on the screen in front of them: what is about to happen, what it was drawn from, whether that basis is still true, and how to stop it. Miss any one and you have a button that transfers responsibility without transferring the information that responsibility needs.',
        },
        {
          kind: 'table',
          caption: 'The four questions, what answers each on the screen, and the shortcut a demo usually takes instead.',
          headers: ['Question', 'What answers it', 'The demo shortcut'],
          rows: [
            [
              'What will happen?',
              'The action and its parameters in the operator’s own words: refund, 42.00, invoice INV-2291, Northgate Dairy',
              'A paragraph of generated prose that describes the action without committing to the numbers',
            ],
            [
              'What is it based on?',
              'Citations they can open: the article id, its title, and a link that lands on the passage',
              'A list of document ids with nothing behind them',
            ],
            [
              'Is that still true?',
              'The revision the proposal was built from, and a visible mark when the ticket has moved since',
              'Nothing, because the demo takes four minutes and nothing moves in four minutes',
            ],
            [
              'How do I stop it?',
              'A cancel that abandons the in-flight request, and an honest statement of what it cannot undo',
              'A disabled button and a spinner',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'The screen has more states than a demo shows. Idle before anything is asked for. Loading while the proposal is being built. Ready when it is there. Approving while the approval is in flight. Approved, rejected, and error. Each one is a different sentence for the operator, and each one is a different set of controls: you cannot approve what has not loaded, and you cannot cancel what was never started.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code:
            "// The shape the screen renders from. Every field answers something the\n// operator asked, and statusMessage is what the live region reads out.\nconst state = {\n  status: 'ready', // idle | loading | ready | approving | approved | rejected | error\n  ticketId: 'MB-3312',\n  proposal: { action: 'refund', amountCents: 4200, revision: 7 },\n  citations: [{ id: 'KB-118', title: 'Refunds for duplicated invoices', url: '/kb/KB-118' }],\n  warnings: ['The customer record could not be read; the address is from a cached copy.'],\n  superseded: false, // the ticket moved after this proposal was built\n  receiptId: null,\n  error: null,\n  statusMessage: 'Proposal ready for MB-3312, with 1 warning to read before you approve.',\n};",
          caption: 'One object, and every field in it is something the operator asked or something they have to be told.',
        },
        {
          kind: 'prose',
          body:
            'Warnings are where a screen most often lies. The proposal came back, the customer record behind it did not, and the address on screen is from a cached copy. Two wrong answers are available: throw the whole load into `error`, which hides a proposal the operator could still have used, or drop the warning and render a clean success. Keep the status at `ready`, carry the warnings through, and let the operator decide with the same information you have.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'A partial failure rendered as a success is worse than an outright failure. The operator approves on the assumption that everything on screen was read from the system of record, and nothing on the screen tells them otherwise. When you drop a warning you are not simplifying the interface, you are moving the risk onto somebody who cannot see it.',
        },
        {
          kind: 'prose',
          body:
            'Cancel is the control most often faked. `AbortController` gives you a signal you can pass to `fetch`, and aborting rejects the request promise with an `AbortError`, so your handler stops waiting. That is what cancel buys you: the screen stops caring about the answer. It does not reach into the ticket service and unmake a request that already arrived there.',
        },
        {
          kind: 'trace',
          caption: 'An approval cancelled mid-flight, and the receipt that turns up afterwards.',
          trace: {
            shape: 'array',
            legend: ['status', 'in flight', 'proposal', 'abandoned', 'announced'],
            frames: [
              {
                cells: ['ready', 'none', 'MB-3312 rev 7', 'none', 'Proposal ready, 2 citations'],
                marks: [{ index: 2, role: 'settled' }],
                note: 'The proposal is on screen with its two citations, and nothing is in flight. The operator is reading.',
              },
              {
                cells: ['approving', 'req 2', 'MB-3312 rev 7', 'none', 'Sending your approval for MB-3312'],
                marks: [{ index: 0, role: 'active' }, { index: 1, role: 'active' }],
                note: 'The operator presses Approve. Request 2 leaves the browser and the proposal stays on screen, because they should still be able to read what they just approved.',
              },
              {
                cells: ['idle', 'none', 'none', 'req 2', 'Cancelled. The answer to request 2 will be ignored'],
                marks: [{ index: 3, role: 'excluded' }],
                note: 'They press Cancel a second later. The screen goes back to idle, clears the proposal, and records request 2 as abandoned.',
              },
              {
                cells: ['idle', 'none', 'none', 'req 2', 'Cancelled. The answer to request 2 will be ignored'],
                marks: [{ index: 3, role: 'excluded' }],
                note: 'The ticket service answers request 2 with receipt RCP-1. The session sees that request 2 is abandoned and changes nothing: no status, no receipt, no announcement.',
              },
              {
                cells: ['idle', 'none', 'none', 'req 2', 'Cancelled. The answer to request 2 will be ignored'],
                marks: [{ index: 1, role: 'compare' }, { index: 3, role: 'excluded' }],
                note: 'The approval still left the browser, so the ticket service may hold it. The screen does not claim to know. Reconciliation happens on the server under the idempotency key, and the operator is told what to check.',
              },
            ],
          },
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Never let a cancelled request write into the state. The bug looks like this: the operator cancels, starts a different ticket, and the first answer lands two seconds later over the top of the second. Keep the id of the request whose answer you will still accept, and have every handler return early when the id it carries is not that one. RFC 9110 has the matching server-side rule: a safe retry needs an idempotency key, or the second delivery becomes a second refund.',
        },
        {
          kind: 'prose',
          body:
            'Retry belongs to the operator, not to a loop. A failed load leaves the screen in `error` with the message the service gave, and the operator retries when they choose. A silent retry loop behind the spinner turns one slow load into three, and it hides the outage that a support engineer needs to see.',
        },
        {
          kind: 'prose',
          body:
            'Now the part that is not a later pass. Every one of those transitions changes something a sighted operator sees at a glance and a screen-reader user finds out about only if you say so. MDN’s page on `aria-live` describes the two values worth knowing: `polite` waits for a pause in what the user is doing, `assertive` interrupts. A status line for loading, ready and approved is `polite`. An error the operator has to act on is the case for `assertive`, and using it for anything routine trains people to ignore it.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code:
            "// The live region exists from the first render, empty. Adding the element\n// and the text at the same moment is the classic reason nothing is read out:\n// the assistive technology never saw the region appear.\n// <p id=\"workbench-status\" aria-live=\"polite\" />\n\nconst announce = message => {\n  state.statusMessage = message;\n  document.getElementById('workbench-status').textContent = message;\n};\n\n// One call per transition, from the state logic, not from the click handler.\n// A refused click announces too: an operator who pressed a button and heard\n// nothing does not know whether it worked.",
          caption: 'The live region is a render target the state logic writes to, which is why the message belongs in the state.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'An automated check on those messages can count them and confirm each one is a non-empty string tied to a transition. That is all it establishes. Whether "Proposal ready, 2 citations, 1 warning" is a sentence an operator can act on at speed is a judgement, and it stays a judgement you make and record separately from the passing check.',
        },
        {
          kind: 'prose',
          body:
            'The rest of the accessibility work is the same shape: it is cheaper as part of the build than as a pass afterwards. The approve and cancel controls are real buttons, so they take focus and fire on Enter and Space. Nothing is signalled by colour alone, so a warning carries an icon and a word. The cancel target is at least 44 pixels, because an operator clearing a queue is fast rather than careful. None of that is expensive while you are writing the component, and all of it is expensive once the screen is in a customer’s hands.',
        },
      ],
    },
    {
      id: 'fde-v1-m10-l2',
      title: 'Acceptance, communication and what you leave behind',
      summary:
        'A UAT with three possible endings, a demo that shows the failure mode, the runbook somebody reads at three in the morning, and the difference between one customer’s request and product input.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'Google SRE Book — Postmortem culture',
          url: 'https://sre.google/sre-book/postmortem-culture/',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'Google SRE Book — Service level objectives',
          url: 'https://sre.google/sre-book/service-level-objectives/',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'OpenTelemetry — Traces',
          url: 'https://opentelemetry.io/docs/concepts/signals/traces/',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'A user acceptance test that cannot end in a rejection is a demo with a signature page. You know you are in one when the acceptance conditions get written the same week you run the session, from the behaviour you already know the system has. Write them earlier, with the customer, from the baseline you measured in M01, and then live with what they say.',
        },
        {
          kind: 'prose',
          body:
            'Three endings, and the middle one carries most real projects. Accept: every condition met, go live. Reject: something the project exists to do does not work, and the date moves. Accept with conditions: the parts that passed go live, the miss is recorded with the number rather than as a feeling, and both sides sign up to what happens if it has not closed by a named date. The condition is worthless without that date and that owner.',
        },
        {
          kind: 'table',
          caption: 'The three UAT outcomes, what each one has to record, and who owns the next move.',
          headers: ['Outcome', 'What gets written down', 'Who owns the next step'],
          rows: [
            [
              'Accept',
              'Each condition, the measured result against it, and the fixture or dataset it was measured on',
              'The customer, from the go-live date onward',
            ],
            [
              'Accept with conditions',
              'The conditions met, the miss stated as a number against its target, the remedy, a date and a named owner',
              'You, until the miss closes or the named date arrives',
            ],
            [
              'Reject',
              'Which condition failed, by how much, what you now believe the cause is, and what changes before the next session',
              'You, and the schedule moves rather than the condition',
            ],
          ],
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Watch for the condition that gets quietly rewritten after the result is known. A median of six minutes twenty against a four-minute target is not a pass because the sponsor is pleased; it is a miss with a happy sponsor, and recording it that way is what lets you find out in October whether the number ever came down.',
        },
        {
          kind: 'prose',
          body:
            'The demo has the same failure mode as the UAT. A run that only shows the happy path teaches the room that the system does not have a failure mode, and the first time it has one in front of a customer, it is a surprise instead of a known behaviour. Show one: a ticket the retriever has no evidence for, and the workbench declining to propose anything rather than guessing. That is thirty seconds, and it moves the abstention from an apology to a feature.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Say which parts of a demo are fixtures. If the model responses in the recording are canned, the room needs to know that before somebody quotes the accuracy in a steering meeting. A demo shows that a code path works on the inputs you chose; it is not a measurement, and the evaluation from M07 is where the measurement lives.',
        },
        {
          kind: 'prose',
          body:
            'Then the runbook, and the reader you are writing for is specific: on call, woken at three in the morning, has never opened this service, and is holding a phone. They need to find the page from the alert name, match a symptom, run one action, and know within minutes whether it worked. Prose about the architecture does not help them. A sequence does.',
        },
        {
          kind: 'code',
          language: 'text',
          code:
            "# Runbook: proposals stop appearing\n\nAlert: workbench_proposal_latency_high\nOwner: integrations rota. Escalation: platform rota after 15 minutes.\n\n## Symptom\nWhat the operator sees, in their words, and the alert that fires with it.\n\n## Check\nThe two signals that tell the likely causes apart, and the dashboard they live on.\n\n## Action\nThe smallest change that addresses the likely cause, written as a command\nsomebody can paste.\n\n## Verify\nThe number that has to move, which direction, and how long to wait for it.\n\n## If it does not work\nThe next action, and the rota to wake.\n\n## Afterwards\nWhat to put back, what to record, and where the postmortem goes.",
          caption: 'Six headings. The last three are the ones that get left out, and they are the ones the reader at 03:00 needs most.',
        },
        {
          kind: 'trace',
          caption: '03:12, one on-call engineer walking that runbook.',
          trace: {
            shape: 'array',
            legend: ['symptom', 'check', 'action', 'verify', 'escalate'],
            frames: [
              {
                cells: ['queue stuck on loading', 'not yet', 'not yet', 'not yet', 'not yet'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The alert names the runbook page. The engineer matches what the operator reported to the symptom at the top: proposals stop appearing.',
              },
              {
                cells: ['queue stuck on loading', 'ticket API 429 rate at 31%', 'not yet', 'not yet', 'not yet'],
                marks: [{ index: 1, role: 'active' }],
                note: 'Two signals on one dashboard. Latency is high and the ticket API is returning 429 for nearly a third of calls, so this is throttling rather than a workbench fault.',
              },
              {
                cells: ['queue stuck on loading', 'ticket API 429 rate at 31%', 'concurrency 6 to 2', 'not yet', 'not yet'],
                marks: [{ index: 2, role: 'active' }],
                note: 'The runbook gives one command: drop TICKET_API_CONCURRENCY to 2 and redeploy. The engineer runs it without needing to understand the retry design first.',
              },
              {
                cells: ['queue stuck on loading', 'ticket API 429 rate at 31%', 'concurrency 6 to 2', 'still rising after 10 min', 'not yet'],
                marks: [{ index: 3, role: 'excluded' }],
                note: 'The verify step names the number and the wait: queue depth, falling, within ten minutes. It is still rising, so the action did not work and the engineer stops guessing.',
              },
              {
                cells: ['queue stuck on loading', 'ticket API 429 rate at 31%', 'concurrency 6 to 2', 'still rising after 10 min', 'integrations rota paged 03:24'],
                marks: [{ index: 4, role: 'active' }],
                note: 'The escalation is a rota, not a person, so it works when that person is on holiday. Twelve minutes from alert to the right team, and none of it required prior knowledge of the service.',
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Two things the runbook must not pretend. It cannot promise that the action fixes the cause, only that it is the first thing to try and here is how you will know. And it cannot undo effects that have already left: a rollback restores your code, not the refunds that were approved while the bad version was live, and the reconciliation for those belongs in the runbook as its own step with its own owner.',
        },
        {
          kind: 'prose',
          body:
            'The last thing you leave behind goes to a product team who has never met this customer, and it is the piece forward deployed engineers are placed to write and most often skip. You watched the workflow from inside it, which is a position a product team cannot buy. The filter is two questions: can you state the need without naming the customer, and have you seen the same workaround invented somewhere else without anyone comparing notes?',
        },
        {
          kind: 'table',
          caption: 'The same rollout, four pieces of feedback, and which one generalises.',
          headers: ['What came back', 'One customer or a pattern', 'Why'],
          rows: [
            [
              'Move the approve button left of the citation panel',
              'One customer',
              'It encodes the layout of the tool Marlbrook is replacing, and nobody else is replacing that tool',
            ],
            [
              'Read our warehouse schema so proposals can include stock levels',
              'One customer',
              'A real integration request for one system nobody else runs; it belongs in the backlog, not in the product',
            ],
            [
              'Operators at three sites reload before approving to see whether the ticket moved',
              'A pattern',
              'Three sites invented the same workaround for a need any approval workflow has: knowing whether what you are approving is still current',
            ],
            [
              'Give us the audit export in our own CSV column order',
              'One customer',
              'It fits their spreadsheet. A configurable column order is a product feature; this specific order is not',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'Write the pattern up so a product team can act on it without you in the room: the need in one sentence, where you saw it and how often, what the operators do instead today, what that workaround costs them, and what you would remove from the product if the need were served properly. The last item is the one that gets read, because it is the only part that says what this would replace.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Finishing this path records what you passed in these exercises. It is not a certification, not evidence of production experience, and not a claim about employment. Your runbook, your UAT record and your product memo are your own work, self-reviewed, and they are worth more to the next reader than any completion label attached to them.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'fde-v1-m10-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: the operator’s screen',
      summary: 'The four questions an approval answers, the seven states, partial failure, a cancel that abandons, and the live region.',
      competencies: ['handoff'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m10-l1',
    },
    {
      id: 'fde-v1-m10-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: acceptance, communication and what you leave behind',
      summary: 'A UAT that can fail, a demo that shows the failure mode, the runbook for 03:00, and the feedback that generalises.',
      competencies: ['handoff'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m10-l2',
    },
    {
      id: 'fde-v1-m10-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Acceptance, runbooks and feedback',
      summary: 'Four questions on the handoff: a UAT result you have to decide on, a runbook missing a step, what an approval screen owes the operator, and which piece of feedback generalises.',
      competencies: ['handoff'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-m10-q1',
          prompt:
            'Marlbrook’s UAT ran against three conditions agreed a week earlier: an operator completes ten cases unaided, no proposal reaches an operator without its citations, and the median time to a decision falls below four minutes from the measured eight-minute baseline. In the session the operator completed all ten, every proposal carried citations, and the median came out at six minutes twenty. The sponsor says it is clearly better and wants to go live on Monday. What do you record?',
          options: [
            'Accept with conditions: record the two conditions met, record the median as six minutes twenty against a four-minute target, and agree in writing what happens if it has not reached four minutes by a named date.',
            'Accept: the operator finished every case, the citations were there, and six minutes twenty is a real improvement on the eight-minute baseline the customer agreed was the problem.',
            'Reject: a condition agreed in advance was missed, so the UAT failed and the rollout waits until a rerun shows the median below four minutes.',
            'Record the session as inconclusive and rerun it with more cases, because ten cases is too small a sample to say anything about a median.',
          ],
          correct: 0,
          explanation:
            'Two conditions passed and one missed, and the outcome that says both is accept with conditions, provided the miss carries a number, a date and an owner. Accepting outright rewrites the target after seeing the result: the four minutes was what the customer signed up to, and dropping it silently means the next miss has nothing to be measured against. Rejecting is defensible but discards two conditions that passed and value the operator can have on Monday; reject belongs where the thing does not work, or where the missed condition is the reason the project exists. The sample-size point is genuinely true and it argues for reporting the median with its uncertainty, not for declining to decide. Used as the default it turns UAT into a process with no possible outcome.',
          competencies: ['handoff'],
        },
        {
          id: 'fde-v1-m10-q2',
          prompt: 'This is the whole runbook page the alert links to. What is missing before you can hand it to somebody who has never seen the service?',
          context: {
            language: 'text',
            code:
              '# Runbook: proposals stop appearing\n\nAlert: workbench_proposal_latency_high\nOwner: integrations rota\n\n## Symptom\nCase proposals stop appearing. The operator queue shows "loading" for more\nthan 30 seconds.\n\n## Check\n1. Open the workbench dashboard and read proposal_latency_p95 for the last\n   15 minutes.\n2. Read the ticket-api error rate on the same dashboard. A 429 rate above 5%\n   means the ticket API is throttling us.\n\n## Action\n3. Set TICKET_API_CONCURRENCY to 2 in the workbench environment and redeploy.\n\n## Afterwards\n4. Post the incident in the ops channel with the timestamps and the dashboard\n   link.',
          },
          options: [
            'How to tell whether the action worked, how long to wait before deciding it did not, and which rota to wake in that case.',
            'A diagram of the workbench and the ticket API, so the on-call engineer understands the system before changing anything in it.',
            'The root-cause analysis for the throttling, so the on-call engineer addresses the cause rather than the symptom.',
            'A note that TICKET_API_CONCURRENCY has to be returned to its previous value once the incident is over.',
          ],
          correct: 0,
          explanation:
            'The page ends at the action, which leaves the reader with no way to know they are finished and no next move when the queue keeps growing. A verify step names the number and the direction, a wait time makes "it did not work" decidable, and a rota makes escalation possible at 03:00 when the individual you had in mind is asleep. The diagram is worth reading in daylight and is the wrong thing to open mid-incident. The root cause belongs in the postmortem: a runbook that expects understanding before action stops exactly the person it exists to help. Restoring the concurrency value is a genuine omission and belongs under Afterwards, but it is cleanup — without a verify step and an escalation the engineer never gets far enough to need it.',
          competencies: ['handoff'],
        },
        {
          id: 'fde-v1-m10-q3',
          prompt:
            'The workbench proposes a refund and an operator approves it. What does the screen have to show for that approval to mean more than a click?',
          options: [
            'The action and its parameters in the operator’s own terms, the evidence as citations they can open, whether that evidence is still current, and a way to stop the request they just started.',
            'A confidence score for the proposal so the operator knows how much to trust it, and a link to the model’s reasoning for the cases where the score is low.',
            'The full text of every document the retriever returned, so the operator reads the same material the proposal was built from and can judge it themselves.',
            'An undo on the confirmation screen, so an approval sent by mistake can be taken back within thirty seconds.',
          ],
          correct: 0,
          explanation:
            'An approval is a person taking responsibility, and that needs four things on screen: what will happen, what it rests on, whether that basis still holds, and how to stop. A confidence score with no calibration study behind it is a number nobody can act on, and generated reasoning is more model output rather than evidence — it explains the proposal using the same source that produced it. Dumping the entire retrieved set moves the work back to the operator and buries the two passages that matter; openable citations give the same access with a way in. The undo is worth building and answers a different question: it covers the approval somebody regrets, not the one they should never have been asked to make on stale evidence, and it cannot reach an effect that already left.',
          competencies: ['handoff'],
        },
        {
          id: 'fde-v1-m10-q4',
          prompt: 'Four things came back from the Marlbrook rollout. Which one is product input rather than one customer’s request?',
          options: [
            'Operators at three of the four sites reload the proposal before approving because they cannot tell whether the ticket moved while they were reading, and each site invented the same second-tab workaround on its own.',
            'Marlbrook wants the approve button to the left of the citation panel, because their operators are used to the layout of the tool the workbench replaces.',
            'Marlbrook asks the workbench to read their internal warehouse schema directly, so proposals can include stock levels.',
            'Marlbrook’s security team wants the audit export in their own CSV column order so it loads into the spreadsheet they already run.',
          ],
          correct: 0,
          explanation:
            'The first names a need that survives losing the customer’s name — knowing whether what you are approving is still current — with evidence that it recurs and a measurable cost in reload time. The other three are real requests worth serving, and each is specific to one customer: the button position encodes the tool Marlbrook is leaving, the warehouse schema is a system nobody else runs, and the column order fits one spreadsheet. Any of them could become product input later, and the test is the same one: state the need without naming the customer, and show it appearing somewhere else. A configurable column order would pass that test; this particular order does not.',
          competencies: ['handoff'],
        },
      ],
    },
    {
      id: 'fde-v1-m10-operator-state',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'The operator session',
      summary:
        'The state behind an approval screen: the proposal with its citations, an approve that refuses stale and in-flight cases, a cancel a late answer cannot undo, and a status message on every transition.',
      competencies: ['handoff'],
      estimatedMinutes: 45,
      code: {
        language: 'javascript',
        prompt:
          'Marlbrook’s triage workbench proposes a refund and an operator approves it. This exercise is the state logic behind that screen. The grade drives it directly rather than through a rendered component: the transitions are what breaks in production, they are testable on their own, and every dependency here is an authored fixture on a virtual clock, not a live service.\n\nWrite `createOperatorSession(deps)`. It returns an object with `getState()`, `load(ticketId)`, `approve()`, `reject()`, `cancel()` and `noteRevision(revision)`.\n\n`deps` comes from the screen and holds three things. `deps.loadProposal(ticketId)` returns a promise for `{ proposal, citations, warnings }`, where `proposal` carries a `ticketId` and a `revision`. `deps.submitApproval(request)` returns a promise for `{ receiptId }`. `deps.announce(message)` writes one sentence into the live region a screen reader is watching. Either promise can reject with an `Error`.\n\n`getState()` returns the screen as it is now: `status`, `ticketId`, `proposal`, `citations`, `warnings`, `superseded`, `receiptId`, `error`, `statusMessage` and `abandoned`. It starts at `{ status: \'idle\', ticketId: null, proposal: null, citations: [], warnings: [], superseded: false, receiptId: null, error: null, statusMessage: \'\', abandoned: [] }`. Build a fresh object each call or hand back a copy; the grade reads fields, never identity.\n\nThe transitions:\n\n- `load(ticketId)` from any status except `loading` and `approving` clears the proposal, citations, warnings, `superseded`, `receiptId` and `error`, sets `ticketId`, goes to `loading` and calls `deps.loadProposal(ticketId)`. While a request is in flight it is refused, and `deps.loadProposal` is not called at all.\n- A load that resolves goes to `ready` with the proposal, its citations and its warnings. Warnings are a partial failure, not a failure: the status is still `ready`, the array is carried through unchanged, and approving stays possible. Dropping the warnings renders a clean success that is not true.\n- A load that rejects goes to `error`, keeps `ticketId`, clears the proposal and citations, and stores the rejection’s `message` in `error`.\n- `approve()` runs only from `ready` and only while `superseded` is false. It goes to `approving`, keeps the proposal and citations on screen, and calls `deps.submitApproval({ ticketId, revision })` with the loaded ticket id and the loaded proposal’s revision, and nothing else in the object. Resolving goes to `approved` with `receiptId`. Rejecting goes to `error` with the message, and the proposal stays on screen.\n- `reject()` runs only from `ready`. It goes to `rejected`, keeps the proposal and citations, and calls nothing.\n- `cancel()` runs only from `loading` or `approving`. It goes back to `idle`, clears everything, and pushes the in-flight request’s id onto `abandoned`.\n- `noteRevision(revision)` is the ticket service telling the screen the ticket has moved. From `ready`, when the number is greater than the loaded proposal’s revision, set `superseded` to true. Otherwise it changes nothing.\n\nThe part that matters most: after a cancel, or after the screen has moved on to another request, the answer to the abandoned request can still arrive. It has to change nothing at all — no status, no proposal, no receipt, no announcement. Give every request an id, remember which id you are still willing to accept an answer from, and have both handlers return early when the id they carry is not that one.\n\nAnnounce on every state change and on every refused operator action, by setting `statusMessage` and calling `deps.announce(message)` with the same string. A `noteRevision` that changes nothing announces nothing. The grade counts the announcements and checks `statusMessage` holds the last one; it proves a message exists on every transition and says nothing about whether the wording helps an operator, which stays your own review.\n\nCancelling stops the screen from acting on the answer. It does not un-send a request that already left, and one of the assertions holds you to that: the approval still reaches `deps.submitApproval`, and the screen simply refuses to claim it knows the outcome.',
        contract: [
          'Keep the name `createOperatorSession`; the grade builds sessions by name and drives them through the object you return.',
          'Use only what arrives in `deps`: `loadProposal`, `submitApproval` and `announce`. No timers of your own, no network, no globals.',
          'An answer belonging to an abandoned or superseded request leaves every field exactly as it is, `statusMessage` included.',
          '`approve` sends `{ ticketId, revision }` and nothing else, only from a `ready` proposal that has not been superseded.',
          'Announce on every state change and on every refused operator action. A `noteRevision` that changes nothing announces nothing.',
        ],
        starter: `const createOperatorSession = (deps) => {

};

// Scratch pad — change this and press Run.
const demoDeps = {
  loadProposal: ticketId => Promise.resolve({
    proposal: { ticketId, revision: 7, action: 'refund', amountCents: 4200 },
    citations: [{ id: 'KB-118', title: 'Refunds for duplicated invoices' }],
    warnings: [],
  }),
  submitApproval: request => Promise.resolve({ receiptId: 'RCP-1' }),
  announce: message => console.log('live region:', message),
};
console.log(createOperatorSession(demoDeps));
`,
        skeleton: `const createOperatorSession = (deps) => {
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

  const announce = message => {
    /* set state.statusMessage and hand the same string to deps.announce */
  };

  const load = ticketId => {
    /* refused while loading or approving: announce and return without calling deps */
    /* otherwise clear, take the next request id, go to loading, call deps.loadProposal */
    /* both answers start with: is this still the request in flight? */
  };

  const approve = () => {
    /* only from ready, only while superseded is false */
    /* send { ticketId, revision } and nothing else */
  };

  const reject = () => {
    /* only from ready; the proposal stays on screen */
  };

  const cancel = () => {
    /* only from loading or approving: push the in-flight id onto abandoned, clear, go idle */
  };

  const noteRevision = revision => {
    /* from ready, when the number is past the loaded revision, mark superseded */
  };

  return { getState: () => ({ ...state }), load, approve, reject, cancel, noteRevision };
};`,
        hints: [
          'One counter and one variable carry the whole stale-answer problem. `nextRequest` hands out ids; `inFlight` holds the id whose answer you are still willing to accept. Cancel sets it to null, a finished request sets it to null, and every handler starts with a comparison against it.',
          'Write `approve` as two guards and then a transition: refuse when the status is not `ready`, refuse when `superseded` is true, and only then move to `approving` and call `deps.submitApproval`. Announce the refusal too — an operator who pressed a button and heard nothing has no idea whether it worked.',
          '`warnings` is the difference between a load that half worked and one that worked. Carry the array through to the state, leave the status at `ready`, and let the operator decide with what you know.',
        ],
        approach: [
          'Build the state object and the two request variables, then write `announce` so every call sets `state.statusMessage` and passes the same string to `deps.announce`.',
          'Write `load`: refuse while `loading` or `approving`, otherwise clear the previous proposal, take the next request id, go to `loading` and call `deps.loadProposal`.',
          'Handle both answers to a load in one place, each starting with an early return when the request is no longer the one in flight, then either `ready` with proposal, citations and warnings, or `error` with the rejection’s message.',
          'Write `approve` the same shape, guarded by `ready` and by `superseded`, sending `{ ticketId, revision }` and landing on `approved` with the receipt or `error` with the message.',
          'Write `cancel`, `reject` and `noteRevision`, and check that cancel pushes the in-flight id onto `abandoned` and clears it so the late answer finds nothing to match.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'The seven states, and what the operator sees in each',
            critical: true,
            weight: 3,
            detail:
              'Check idle, loading, ready with the proposal and its citations, ready with warnings carried through, approving, approved with the receipt, rejected, and the message from a failed load or a failed approval.',
          },
          {
            id: 'no-stale-overwrite',
            label: 'A late answer from an abandoned request changes nothing',
            critical: true,
            weight: 2,
            detail:
              'An answer arriving after a cancel, or belonging to a request the screen has moved on from, has to leave every field as it was, including `abandoned` and `statusMessage`.',
          },
          {
            id: 'approval-guarded',
            label: 'Approval is refused while loading and on a superseded proposal',
            critical: true,
            weight: 2,
            detail:
              'Nothing reaches `deps.submitApproval` from `idle`, from `loading`, from a proposal `noteRevision` has marked out of date, or from a second press after the approval already went through.',
          },
          {
            id: 'status-announced',
            label: 'Every transition sets a status message',
            critical: false,
            weight: 2,
            detail:
              'The check counts announcements and confirms `statusMessage` holds the last one. It establishes that a message exists on every transition. Whether the wording helps an operator working at speed is your own review, not this check.',
          },
        ],
        tests: [
          {
            call: '(function () { var f = __fixture(); var s = createOperatorSession(f.deps); return __view(s.getState()); })()',
            expected: {
              status: 'idle',
              ticketId: null,
              proposalTicket: null,
              revision: null,
              citations: [],
              warnings: [],
              superseded: false,
              receiptId: null,
              error: null,
            },
            label: 'the screen starts idle with nothing loaded',
          },
          {
            call: '(async function () { var f = __fixture(); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); return __view(s.getState()); })()',
            expected: {
              status: 'ready',
              ticketId: 'MB-3312',
              proposalTicket: 'MB-3312',
              revision: 7,
              citations: ['KB-118', 'TCK-3312-note-2'],
              warnings: [],
              superseded: false,
              receiptId: null,
              error: null,
            },
            label: 'a loaded proposal arrives with its citations',
            async: true,
          },
          {
            call: '(async function () { var f = __fixture(); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); __go(s.approve()); await __drain(); return __view(s.getState()); })()',
            expected: {
              status: 'approved',
              ticketId: 'MB-3312',
              proposalTicket: 'MB-3312',
              revision: 7,
              citations: ['KB-118', 'TCK-3312-note-2'],
              warnings: [],
              superseded: false,
              receiptId: 'RCP-1',
              error: null,
            },
            label: 'approving keeps the proposal on screen and records the receipt',
            async: true,
          },
          {
            call: '(async function () { var f = __fixture({ warnings: ["The customer record could not be read.", "The invoice total came from a cached copy."] }); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); return __view(s.getState()); })()',
            expected: {
              status: 'ready',
              ticketId: 'MB-3312',
              proposalTicket: 'MB-3312',
              revision: 7,
              citations: ['KB-118', 'TCK-3312-note-2'],
              warnings: ['The customer record could not be read.', 'The invoice total came from a cached copy.'],
              superseded: false,
              receiptId: null,
              error: null,
            },
            label: 'a partial failure is ready with warnings, not a clean success',
            edge: true,
            async: true,
          },
          {
            call: '(async function () { var f = __fixture({ loadDelay: 100 }); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); s.cancel(); await __drain(); var st = s.getState(); return { view: __view(st), abandoned: st.abandoned }; })()',
            expected: {
              view: {
                status: 'idle',
                ticketId: null,
                proposalTicket: null,
                revision: null,
                citations: [],
                warnings: [],
                superseded: false,
                receiptId: null,
                error: null,
              },
              abandoned: [1],
            },
            label: 'cancel during a load abandons the request and the late answer changes nothing',
            edge: true,
            async: true,
            criterion: 'no-stale-overwrite',
          },
          {
            call: '(async function () { var f = __fixture({ approveDelay: 100 }); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); __go(s.approve()); s.cancel(); await __drain(); var st = s.getState(); return { view: __view(st), abandoned: st.abandoned, submitted: f.submissions.length }; })()',
            expected: {
              view: {
                status: 'idle',
                ticketId: null,
                proposalTicket: null,
                revision: null,
                citations: [],
                warnings: [],
                superseded: false,
                receiptId: null,
                error: null,
              },
              abandoned: [2],
              submitted: 1,
            },
            label: 'a cancelled approval never comes back as approved, though the request did leave',
            edge: true,
            async: true,
            criterion: 'no-stale-overwrite',
          },
          {
            call: '(async function () { var f = __fixture({ loadDelay: 100 }); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); __go(s.approve()); var during = s.getState().status; await __drain(); return { during: during, after: s.getState().status, submitted: f.submissions.length }; })()',
            expected: { during: 'loading', after: 'ready', submitted: 0 },
            label: 'approving while the proposal is still loading is refused',
            edge: true,
            async: true,
            criterion: 'approval-guarded',
          },
          {
            call: '(async function () { var f = __fixture(); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); s.noteRevision(9); var flagged = __view(s.getState()); __go(s.approve()); await __drain(); return { flagged: flagged.superseded, status: s.getState().status, submitted: f.submissions.length }; })()',
            expected: { flagged: true, status: 'ready', submitted: 0 },
            label: 'a proposal the ticket has moved past cannot be approved',
            edge: true,
            async: true,
            criterion: 'approval-guarded',
          },
          {
            call: '(async function () { var f = __fixture(); var s = createOperatorSession(f.deps); __go(s.load("MB-3312")); await __drain(); __go(s.approve()); await __drain(); return __voice(f, s); })()',
            expected: { count: 4, allText: true, matchesState: true },
            label: 'four transitions, four announcements, and statusMessage holds the last',
            async: true,
            criterion: 'status-announced',
          },
        ],
        harness: OPERATOR_FIXTURE,
      },
    },
  ],
  requires: [
    { activityId: 'fde-v1-m10-checks', state: 'verified_pass' },
    { activityId: 'fde-v1-m10-operator-state', state: 'verified_pass' },
  ],
};
