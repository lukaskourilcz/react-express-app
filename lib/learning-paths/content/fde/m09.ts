/** M09 — Production delivery.
 *
 * M07 produced a number that says whether the change helped. M08 produced a
 * handler that refuses to act on text it cannot trust. This module is the
 * week after both of them ship: the signal that shows the failure before a
 * customer does, the rollout that can be stopped, the trace that says which
 * dependency ate the request, and the rollback that leaves three things
 * behind.
 *
 * Two lessons, one four-question check, one graded retry-and-circuit helper.
 * The first lesson is about what logs, metrics and traces each answer, and
 * about working backwards from the failure you expect to the one signal that
 * would catch it. The second is about the incident: mitigate before you
 * diagnose, read the trace to the span holding the latency, and know what
 * redeploying the old build does not undo.
 *
 * One claim runs through both lessons and lands in the check: a health probe
 * that asserts a 200 proves the service answers, not that the answers are
 * right. The router failure this module keeps returning to is a 200 with a
 * shrug in it, and no latency or error-rate alert would ever have fired.
 *
 * Everything the exercise touches is an authored fixture. `__dependency` in
 * the task harness replays a scripted list of outcomes and `sleep` runs on
 * the sandbox's virtual clock, so a 2 000 ms cooldown resolves instantly and
 * the recorded gaps still read 100, 200, 300. Nothing here opens a socket,
 * needs a key or calls a provider. Marlbrook Systems, its endpoints, its
 * release numbers and its trace ids are invented for this path; no real
 * customer data, credential or company appears in any of them. A fixture
 * dependency that fails on cue is evidence about this code on these inputs,
 * never a measurement of how a live service degrades. */

import type { ModuleSource } from '../../types';

/** The scripted dependency, the circuit builder and the two probes the
 * assertions read. Appended after the learner's code so `sleep`, the plan
 * replayer and the option defaults cannot be shadowed by a same-named
 * declaration in the submission.
 *
 * A plan is one entry per call — `'o'` resolves, `'5'` rejects 503, `'t'`
 * rejects 429, `'4'` rejects 422, `'x'` rejects with no status at all, and a
 * number rejects with that status. When the plan runs out its last entry
 * repeats, so `'5'` alone means a dependency that never recovers and `'444o'`
 * means three refusals and then a working probe. `sleep` schedules through
 * `setTimeout`, which the sandbox runs on a virtual clock: the cooldown
 * finishes in microseconds and the recorded call times still show the gap, so
 * the same submission grades the same way on every run. */
const CIRCUIT_FIXTURES = `
var sleep = function (ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
};

var __dependency = function (plan) {
  var steps = typeof plan === 'string' ? plan.split('') : plan;
  var dep = { calls: [], startedAt: Date.now() };
  dep.call = function (request) {
    var step = steps[Math.min(dep.calls.length, steps.length - 1)];
    dep.calls.push({ request: request, at: Date.now() - dep.startedAt, step: step });
    if (step === 'o') return Promise.resolve({ echo: request });
    if (step === 'x') return Promise.reject({ message: 'socket hang up' });
    if (step === 't') return Promise.reject({ status: 429, message: 'slow down' });
    if (step === '4') return Promise.reject({ status: 422, message: 'unprocessable entity' });
    if (step === '5') return Promise.reject({ status: 503, message: 'upstream unavailable' });
    return Promise.reject({ status: Number(step), message: 'status ' + step });
  };
  return dep;
};

var __circuit = function (dep, overrides) {
  var options = {
    call: dep.call,
    failureThreshold: 3,
    windowMs: 10000,
    cooldownMs: 2000,
    retries: 2,
    baseDelayMs: 100,
    maxDelayMs: 400
  };
  var extra = overrides || {};
  for (var key in extra) options[key] = extra[key];
  return createCircuit(options);
};

var __gaps = function (dep) {
  return dep.calls.map(function (entry, index) {
    return index === 0 ? 0 : entry.at - dep.calls[index - 1].at;
  });
};

var __drive = function (circuit, count, request) {
  var out = [];
  var step = function (index) {
    if (index >= count) return Promise.resolve(out);
    return circuit.send(request === undefined ? { id: 'R-' + index } : request).then(function (result) {
      out.push(result);
      return step(index + 1);
    });
  };
  return step(0);
};
`.trim();

export const FDE_M09: ModuleSource = {
  id: 'fde-v1-m09',
  title: 'Production delivery',
  outcomes: [
    'Say which of logs, metrics and traces answers a given question, and name what each one cannot tell you.',
    'Work backwards from the failure you expect to the one signal that would show it before a customer does, and say why a health probe asserting a 200 is not that signal.',
    'Write the abort condition for a staged rollout before the first stage opens, and give a stage enough traffic that it could fail.',
    'Read a trace down to the span holding the latency, and mitigate before you have the cause.',
    'Name what redeploying the old build leaves behind — a dropped column, a sent message, a consumed idempotency key — and run the review as a list of owned actions rather than a document.',
  ],
  competencies: ['operations'],
  dependsOn: ['fde-v1-m07', 'fde-v1-m08'],
  estimatedMinutes: 110,
  lessons: [
    {
      id: 'fde-v1-m09-l1',
      title: 'Observability and rollout',
      summary:
        'What logs, metrics and traces each answer, how to pick the one signal that would catch your own failure, and how to stage a release behind an abort condition you wrote down first.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'OpenTelemetry — Traces',
          url: 'https://opentelemetry.io/docs/concepts/signals/traces/',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'Google SRE Book — Service level objectives',
          url: 'https://sre.google/sre-book/service-level-objectives/',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'Marlbrook’s triage router went out on a Tuesday. It answered every request, returned a 200 every time, and kept its p95 under half a second. Nine days later an operations lead mentioned that returns tickets had stopped landing in the returns queue. Nobody on the team could say when that started, because nothing they collected would have shown it. Three kinds of signal were available to them, and each answers a different question; picking the wrong one is how a team ends up with four dashboards and no answer.',
        },
        {
          kind: 'table',
          caption: 'The three signals, and the question each one is bad at.',
          headers: ['Signal', 'The question it answers', 'What it cannot tell you'],
          rows: [
            [
              'Logs',
              'What happened inside this one request, in whatever words the handler chose',
              'Whether it is happening more often than yesterday, until somebody counts the lines',
            ],
            [
              'Metrics',
              'How often, how slow and how many, aggregated across everything',
              'Which request it was, or what was in it',
            ],
            [
              'Traces',
              'Where one request spent its time, span by span, across every service it touched',
              'Why the slow span was slow',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'A log line is worth what its fields are worth. Free text you can read is free text you cannot filter, so give every line the same shape: a request id, the tenant, the release, which flag branch produced it, the outcome, and how long it took. Then “how many returns tickets did we abstain on yesterday” is a query rather than an afternoon. The flag branch is the field teams leave out and regret: without it a rollout mixes two code paths into one set of numbers, and “abstention went up” never becomes “abstention went up on the new path and stayed flat on the old one”.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "// One line per request, emitted whatever the outcome was.\nlog.info({\n  event: 'triage.completed',\n  requestId: ctx.requestId,   // the same id the trace carries\n  tenantId: ctx.tenantId,\n  release: '2026-09-08.3',\n  variant: 'kb-lookup:on',    // which branch of the flag produced this row\n  outcome: 'abstained',       // routed | abstained | failed\n  slice: 'returns',\n  durationMs: 412,\n});",
          caption: 'What is missing matters as much as what is there: no ticket body, no retrieved article, no model output.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Logs are read by more people, and kept in more places, than the database they came from. Ticket text, retrieved article bodies and generated answers do not belong in them. Log the ids and the outcome, and let anyone who genuinely needs the content go and fetch it under the access rules that already govern it.',
        },
        {
          kind: 'prose',
          body:
            'Metrics are counters and distributions, and they cost cardinality. A counter tagged by tenant, slice and outcome is fine at three tenants and ruinous at three thousand, so choose the labels you will actually query on and leave the request id in the logs where it belongs. For latency, publish a percentile rather than a mean: an average of 400 ms is equally consistent with everyone waiting 400 ms and with one request in twenty waiting nine seconds, and the second one is the one your operators feel. The SRE Book’s chapter on service level objectives makes the same argument, and adds the part teams skip — pick the target before the incident, and accept that it implies an error budget you are allowed to spend.',
        },
        {
          kind: 'prose',
          body:
            'A trace follows one request across services. Each unit of work is a span, spans nest under the span that caused them, and the whole set shares a trace id — the model OpenTelemetry documents, and the reason you can ask where a request went rather than only how long it took. Add the ids you would want later as span attributes: the tenant, the release, the slice. A trace is the only one of the three that answers “which of the six things this request touched was the slow one”.',
        },
        {
          kind: 'prose',
          body:
            'Now the useful exercise, and the one most teams skip. Name the failure you actually expect, then ask which signal would show it. Marlbrook’s router did not crash. It stopped being sure, returned “no confident queue” on 40% of returns tickets, and dropped them into the manual pile. The response was a 200. The latency went down, because abstaining is cheaper than answering. Error rate, CPU and p95 were all flat for nine days.',
        },
        {
          kind: 'prose',
          body:
            'The signal that would have caught it in an hour is an abstention rate per slice, compared against the baseline from the fortnight before the release. It is a counter and a division. No model, no vendor, no new system — the boring deterministic answer is the right one here, and the cost of not having it was nine days of operators doing the work by hand.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'A health probe that posts a fixture ticket every minute and asserts a 200 proves the service is answering. It says nothing about whether the answers are right, and this failure returned 200 every single time. Liveness and correctness are two claims, and only one of them is cheap to check.',
        },
        {
          kind: 'prose',
          body:
            'Rollout is the other half. Send the change to 1% of traffic, then 5%, then 25%, then everything, and read the signal between stages. The value is not the caution; it is that each stage is a decision point where somebody can say no while the blast radius is still small.',
        },
        {
          kind: 'prose',
          body:
            'Write the abort condition down before the first stage opens, in numbers, with the baseline next to it. “Roll back if returns abstention passes 12%” is a sentence anybody on call can act on at two in the morning. “Roll back if it looks bad” is an argument you will have while the queue backs up, with the person who shipped the change in the room.',
        },
        {
          kind: 'trace',
          caption: 'Four stages, one abort condition written down in advance, and the stage that trips it.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['baseline · 2 weeks', 'error rate 0.3%', 'returns abstention 6%', 'abort above 12%'],
                marks: [{ index: 3, role: 'settled' }],
                note: 'Before anything ships, the team records the fortnight’s numbers and writes the abort condition beside them: roll back if returns abstention passes 12%. Nobody has to interpret that later.',
                counter: { label: 'Tickets on the new path', value: 0 },
              },
              {
                cells: ['stage 1% · 31 tickets', 'error rate 0.0%', 'returns abstention 3%', 'abort above 12%'],
                marks: [{ index: 0, role: 'active' }, { index: 2, role: 'excluded' }],
                note: 'The first stage handles 31 tickets in a day. One abstention moves that rate by three points, so 3% is not evidence of anything: this stage proves the release starts and serves traffic, not that it is safe.',
                counter: { label: 'Tickets on the new path', value: 31 },
              },
              {
                cells: ['stage 5% · 156 tickets', 'error rate 0.4%', 'returns abstention 7%', 'abort above 12%'],
                marks: [{ index: 0, role: 'active' }, { index: 2, role: 'compare' }],
                note: '156 tickets is enough for the rate to mean something. 7% against a 6% baseline is inside the noise the team agreed to tolerate, so the rollout continues.',
                counter: { label: 'Tickets on the new path', value: 156 },
              },
              {
                cells: ['stage 25% · 790 tickets', 'error rate 0.5%', 'returns abstention 14%', 'abort above 12%'],
                marks: [{ index: 2, role: 'active' }, { index: 3, role: 'compare' }],
                note: 'At 25% the returns slice reaches 14% and crosses the line. The error rate is still flat and the latency is still fine, which is exactly why the abort condition was written against abstention instead.',
                counter: { label: 'Tickets on the new path', value: 790 },
              },
              {
                cells: ['flag off · 0 tickets', 'error rate 0.3%', 'returns abstention 6%', 'aborted at 14:52'],
                marks: [{ index: 3, role: 'settled' }],
                note: 'The flag goes off twelve minutes after the stage opened, the rates return to the baseline, and the investigation starts with 790 tickets of evidence and no customer waiting on it.',
                counter: { label: 'Tickets on the new path', value: 0 },
              },
            ],
          },
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'A stage needs enough traffic to be able to fail. 1% of 200 requests a day is two requests, and two requests cannot move a 12% line, so a green first stage there means nothing except that the process started. Either size the stage against the rate you are watching, or say plainly that the early stages are smoke tests and the real gate is the 25%.',
        },
      ],
    },
    {
      id: 'fde-v1-m09-l2',
      title: 'Incidents and rollback',
      summary:
        'Mitigating before you have the cause, reading a trace down to the dependency holding the latency, what a rollback cannot undo, and running the review as a mechanism instead of a document.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'Google SRE Book — Postmortem culture: learning from failure',
          url: 'https://sre.google/sre-book/postmortem-culture/',
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
            'Twenty minutes after release 2026-09-08.3, p95 on `POST /tickets/triage` goes from 400 ms to 8.9 seconds. Operators are watching a spinner, the queue is growing, and somebody has already asked in the channel whether it might be the database. You have two jobs and they compete: get the service working, and find out what broke it.',
        },
        {
          kind: 'prose',
          body:
            'Do the first one first. Turn the flag off, or redeploy the previous build, and let the numbers come back before you open a single trace. Diagnosis feels more responsible and it costs the customer every minute it takes. The evidence does not evaporate when you mitigate: the traces, the logs and the metrics from the bad twenty minutes are already recorded, and you can read them in daylight with nobody waiting.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Two mitigations feel helpful and make things worse. Raising the client timeout from 2 s to 15 s stops the errors by holding connections open longer, so the queue and the connection pool both fill up. Restarting the service without a hypothesis destroys whatever in-process state you could have inspected, and the symptom returns within minutes because nothing about the release changed.',
        },
        {
          kind: 'prose',
          body:
            'With the service back, open one slow request. The root span carries the total; every child says where a piece of it went. Walk down, subtracting as you go, until one leaf holds the time.',
        },
        {
          kind: 'trace',
          caption: 'One triage request, seven spans, and the arithmetic that names the dependency.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: [
                  'POST /tickets/triage · 8 940 ms',
                  'auth.verify · 12 ms',
                  'tickets.load · 31 ms',
                  'kb.search · 8 610 ms',
                  'kb.vector-query · 8 540 ms · 3 attempts',
                  'router.classify · 180 ms',
                  'tickets.write · 88 ms',
                ],
                note: 'One request, trace 7f21. The root took 8 940 ms and its children account for almost all of it. Read them, do not guess between them.',
              },
              {
                cells: [
                  'POST /tickets/triage · 8 940 ms',
                  'auth.verify · 12 ms',
                  'tickets.load · 31 ms',
                  'kb.search · 8 610 ms',
                  'kb.vector-query · 8 540 ms · 3 attempts',
                  'router.classify · 180 ms',
                  'tickets.write · 88 ms',
                ],
                marks: [{ index: 1, role: 'excluded' }, { index: 2, role: 'excluded' }],
                note: 'Auth and the ticket read cost 12 ms and 31 ms. Being first in the request does not make a span the cause; 43 ms cannot produce a nine-second page.',
              },
              {
                cells: [
                  'POST /tickets/triage · 8 940 ms',
                  'auth.verify · 12 ms',
                  'tickets.load · 31 ms',
                  'kb.search · 8 610 ms',
                  'kb.vector-query · 8 540 ms · 3 attempts',
                  'router.classify · 180 ms',
                  'tickets.write · 88 ms',
                ],
                marks: [{ index: 1, role: 'excluded' }, { index: 2, role: 'excluded' }, { index: 5, role: 'excluded' }, { index: 6, role: 'excluded' }],
                note: 'The model call is 180 ms and the write is 88 ms. Both are ruled out by arithmetic rather than by intuition, which matters because the model call is where everyone looks first.',
              },
              {
                cells: [
                  'POST /tickets/triage · 8 940 ms',
                  'auth.verify · 12 ms',
                  'tickets.load · 31 ms',
                  'kb.search · 8 610 ms',
                  'kb.vector-query · 8 540 ms · 3 attempts',
                  'router.classify · 180 ms',
                  'tickets.write · 88 ms',
                ],
                marks: [{ index: 3, role: 'active' }],
                note: 'That leaves kb.search at 8 610 ms, which is 96% of the request. It is not a leaf, so it is a location and not yet an answer.',
              },
              {
                cells: [
                  'POST /tickets/triage · 8 940 ms',
                  'auth.verify · 12 ms',
                  'tickets.load · 31 ms',
                  'kb.search · 8 610 ms',
                  'kb.vector-query · 8 540 ms · 3 attempts',
                  'router.classify · 180 ms',
                  'tickets.write · 88 ms',
                ],
                marks: [{ index: 3, role: 'compare' }, { index: 4, role: 'active' }],
                note: 'Its child kb.vector-query holds 8 540 of those 8 610 ms, so kb.search spends 70 ms of its own. The vector store is the dependency, and the search wrapper is only waiting on it.',
              },
              {
                cells: [
                  'POST /tickets/triage · 8 940 ms',
                  'auth.verify · 12 ms',
                  'tickets.load · 31 ms',
                  'kb.search · 8 610 ms',
                  'kb.vector-query · 8 540 ms · 3 attempts',
                  'router.classify · 180 ms',
                  'tickets.write · 88 ms',
                ],
                marks: [{ index: 4, role: 'settled' }],
                note: 'The attempt count finishes the story: three calls to a store answering in about 2.8 s each, plus the waits between them. The handler turned one slow dependency into three times the load on it.',
              },
              {
                cells: [
                  'POST /tickets/triage · 8 940 ms',
                  'auth.verify · 12 ms',
                  'tickets.load · 31 ms',
                  'kb.search · 8 610 ms',
                  'kb.vector-query · 8 540 ms · 3 attempts',
                  'router.classify · 180 ms',
                  'tickets.write · 88 ms',
                ],
                marks: [{ index: 4, role: 'settled' }],
                note: 'The trace names where the time went. It does not say why the vector store slowed down, and the mitigation did not wait for that answer.',
              },
            ],
          },
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "// The vector store slowed from 280 ms to 2 800 ms. The handler did not change.\nconst attemptMs = 2800;              // every attempt now takes 2.8 s\nconst backoffMs = [0, 400, 800];     // the waits before attempts 1, 2 and 3\n\nconst spent = backoffMs.reduce((total, wait) => total + wait, 0) + attemptMs * 3;\n// 1 200 + 8 400 = 9 600 ms, from a dependency that is merely slow\n\n// And that store now receives three times its usual traffic, from every\n// caller at once, while it is already the thing that is struggling.",
          caption: 'Retry amplification: an uncapped retry turns one slow dependency into three calls per request and multiplies the load on it.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'This is why the exercise below asks for a circuit as well as a backoff. Backoff alone still sends every caller at the failing dependency, just later. A circuit that opens after a few consecutive failures stops calling it entirely, gives it room to recover, and lets exactly one probe through afterwards to find out whether it did.',
        },
        {
          kind: 'prose',
          body:
            'Retrying at all is a decision about the request, not about the error. RFC 9110 draws the line you need: a 4xx says the client seems to have erred, so sending the same request again gets the same answer and only costs the server another parse. 429 is the exception the whole industry agreed on, because it means “not now” rather than “not this”. And repeating a non-idempotent request after a timeout can apply the same change twice, which is why the retry and the idempotency key from M02 belong together.',
        },
        {
          kind: 'prose',
          body:
            'Rolling back the deployment restores the code. It restores nothing else, and the gap between those two sentences is where incidents get worse after the mitigation.',
        },
        {
          kind: 'table',
          caption: 'Release 2026-09-08.3, and what redeploying the previous build does to each part of it.',
          headers: ['What the release did', 'What the rollback restores', 'What is still there afterwards'],
          rows: [
            [
              'Deployed new handler code',
              'The previous code path, from the next request onwards',
              'Nothing. This is the part a rollback is for',
            ],
            [
              'Ran a migration that dropped `tickets.legacy_queue`',
              'Nothing about the schema',
              'The column is gone, and the old build queries a table that no longer has it',
            ],
            [
              'Wrote 6 200 rows in the new shape',
              'The old writer',
              'Every row already written, which the old reader may not parse',
            ],
            [
              'Sent 4 100 “your ticket has moved” emails',
              'Nothing',
              'The emails are in inboxes, and the correction is a second email somebody has to write',
            ],
            [
              'Consumed idempotency keys at the billing partner',
              'Nothing',
              'The partner treats the next identical request as a duplicate and replays the first result',
            ],
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Schema changes are the one you can design around in advance. Add the new column, write to both for a release, migrate readers, and only drop the old column once no deployed build reads it. Each step is separately reversible, which is the whole point: at no moment does going back require the data to travel backwards with you.',
        },
        {
          kind: 'prose',
          body:
            'Then the review. The SRE Book’s postmortem chapter makes two demands that are easy to quote and hard to keep: write it without blaming a person, and give it a life beyond the document. The first is not politeness. An engineer who expects to be named as the cause will describe what happened less precisely, and you lose the detail you called the meeting for.',
        },
        {
          kind: 'prose',
          body:
            'The second demand is the one that decides whether any of this was worth the afternoon. A review is a mechanism when it produces a short list of changes, each with a named owner and a date, tracked where your team tracks everything else. Three of those get done. A twelve-item list with no owners gets read once. The most valuable line on the list is usually the same one: the signal that would have caught this in an hour instead of nine days, and who is adding it this week.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'The check and the exercise in this module grade decisions and code against fixtures written for them. A passing circuit here says your implementation handles these scripted failures; it is not a statement about your service, and no exercise on this path can make one. What it does give you is a helper whose behaviour you can describe precisely when somebody asks what happens when the dependency goes away.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'fde-v1-m09-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: observability and rollout',
      summary: 'Logs, metrics and traces, the signal that would catch your own failure, and a staged rollout with its abort condition fixed in advance.',
      competencies: ['operations'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m09-l1',
    },
    {
      id: 'fde-v1-m09-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: incidents and rollback',
      summary: 'Mitigate before you diagnose, read a trace to the failing dependency, and know what redeploying the old build leaves behind.',
      competencies: ['operations'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m09-l2',
    },
    {
      id: 'fde-v1-m09-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Incident and rollout checks',
      summary: 'Four decisions on one release: name the dependency from a trace, choose the first action, say what the rollback leaves behind, and pick the signal that would have caught it first.',
      competencies: ['operations'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-m09-q1',
          prompt:
            'Here is one trace from the slow window on Marlbrook’s triage endpoint. Durations are the total time of each span, and children are indented under their parent. Which dependency is holding the request?',
          context: {
            language: 'text',
            code:
              'POST /tickets/triage            trace 7f21        8 940 ms\n├─ auth.verify                                        12 ms\n├─ tickets.load                                       31 ms\n├─ kb.search                                       8 610 ms\n│  ├─ kb.embed                                        44 ms\n│  └─ kb.vector-query          3 attempts          8 540 ms\n├─ router.classify                                   180 ms\n└─ tickets.write                                      88 ms',
          },
          options: [
            '`kb.vector-query`: 8 540 of the 8 940 ms sit in that one leaf span, and its three attempts say the handler retried a call that was already slow.',
            '`router.classify`: the model call is the only span whose duration depends on an external system nobody controls.',
            '`auth.verify`: it runs first, so every span after it is queued behind whatever delayed it.',
            '`tickets.write`: the write is last, so it absorbs the delay that built up across the rest of the request.',
          ],
          correct: 0,
          explanation:
            'Subtract as you walk down. Auth and the ticket read cost 43 ms between them, `router.classify` costs 180 ms and `tickets.write` costs 88 ms, which leaves `kb.search` holding 8 610 ms of the 8 940. `kb.search` is not a leaf: its child `kb.vector-query` holds 8 540 of that, so the wrapper spends 70 ms of its own and the vector store is the dependency. The model-call answer is the one people reach for first, and 180 ms rules it out — an external system is not automatically the slow one. Order is not blame either: `auth.verify` finished in 12 ms and released the request, and `tickets.write` took 88 ms whenever it ran. A span’s duration is its own time, not the time that elapsed before it started.',
          competencies: ['operations'],
        },
        {
          id: 'fde-v1-m09-q2',
          prompt:
            'p95 on the triage endpoint is 8.9 s, twenty minutes after a release that put a knowledge-base lookup in front of the router. The lookup is behind a flag you can turn off. Operators are waiting and the manual queue is growing. What do you do first?',
          options: [
            'Read the traces first and find the root cause before you change anything, so the mitigation does not hide the evidence you need.',
            'Turn the flag off, confirm the latency comes back, and then diagnose from the traces and logs that the bad twenty minutes already produced.',
            'Raise the client timeout from 2 s to 15 s so requests stop failing while you investigate.',
            'Restart the service to clear whatever state has built up since the release, then watch whether it comes back.',
          ],
          correct: 1,
          explanation:
            'Restoring service and finding the cause are both your job, and only one of them has a customer waiting on it. The flag is the cheapest reversal available, and turning it off costs you nothing diagnostically: the traces, logs and metrics from those twenty minutes are already recorded and will read the same in an hour. Diagnosing first sounds disciplined and spends the outage on it. Raising the timeout removes the error without removing the wait, so connections and the operator queue both back up further behind the same slow dependency. Restarting is a guess with no hypothesis: it throws away the in-process state you might have inspected, and the release is still deployed, so the symptom returns within minutes.',
          competencies: ['operations'],
        },
        {
          id: 'fde-v1-m09-q3',
          prompt:
            'Release 2026-09-08.3 deployed new handler code, ran a migration that dropped `tickets.legacy_queue`, sent 4 100 “your ticket has moved” emails, and consumed idempotency keys at the billing partner. You redeploy the previous build. What is still in place afterwards?',
          options: [
            'The dropped column, the sent emails and the consumed idempotency keys. Redeploying changes which code runs and nothing else.',
            'Only the dropped column. The previous build re-sends the notifications correctly, and the partner releases an idempotency key once the request that claimed it is rolled back.',
            'Only the sent emails. A migration is reversed when you redeploy a build that predates it, and idempotency keys expire within the hour.',
            'Nothing, as long as the deployment tool offers one-click rollback. Reversing the release is exactly what that button is for.',
          ],
          correct: 0,
          explanation:
            'A rollback swaps the artifact that serves the next request. It has no reach into the database, into other people’s inboxes or into a partner’s records. The dropped column stays dropped, and the old build now queries a table that no longer has it, which is a second outage on top of the first. The 4 100 emails have been read; the only correction is another email somebody writes. And an idempotency key is consumed the moment the partner records the request, so the next identical call replays the first result rather than performing the work — nothing in that contract watches your deployments. The two answers that name a single survivor invent mechanisms that do not exist: no partner API releases a key because you redeployed, migrations do not reverse themselves when an older build starts, and key expiry is a property of the partner’s retention window rather than a rollback path. The one-click answer mistakes the interface for the scope — the button changes the artifact, and that is all it has ever changed.',
          competencies: ['operations'],
        },
        {
          id: 'fde-v1-m09-q4',
          prompt:
            'The failure you missed: after the release, the router returned “no confident queue” for 40% of returns tickets and dropped them into the manual pile. Every response was a 200, latency fell, and error rate and CPU stayed flat. It ran for nine days before an operations lead complained. Which signal would have caught it first?',
          options: [
            'An alert on the 5xx rate for `POST /tickets/triage`, which is where a router that has stopped answering correctly shows up.',
            'A p95 latency alert on the triage endpoint, since a router in trouble takes longer to reach a decision.',
            'An abstention rate per slice, compared each day against the baseline from the fortnight before the release, alerting when a slice moves several points.',
            'A synthetic probe that posts a fixture ticket every minute and alerts when the endpoint does not return 200.',
          ],
          correct: 2,
          explanation:
            'Work backwards from the failure. This one produced correct-looking, fast, successful responses that happened to be useless, so every signal that watches for failure was flat by construction. Abstention per slice is the one number that moved, and it is a counter and a division — no model and no new system, which is worth saying because the cheap deterministic signal is often the right one. The 5xx alert never fires, because abstaining is a 200. The latency alert fires in the wrong direction if at all: abstaining is cheaper than answering, so p95 improved. And the synthetic probe asserts exactly the property that never broke — it proves the service answers, not that the answers are right, and those are two separate claims.',
          competencies: ['operations'],
        },
      ],
    },
    {
      id: 'fde-v1-m09-retry-circuit',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Bounded retries and a circuit that opens',
      summary:
        'Wrap a scripted dependency in capped exponential backoff and a circuit that opens after consecutive failures, refuses without calling through, and admits exactly one probe after the cooldown.',
      competencies: ['operations'],
      estimatedMinutes: 45,
      code: {
        language: 'javascript',
        prompt:
          'The vector store behind Marlbrook’s triage endpoint gets slow, the handler retries every call three times, and the store now receives three times its usual traffic while it is already struggling. Write the wrapper that stops that.\n\n`createCircuit(options)` returns `{ send, state }`. `options` carries `call`, `failureThreshold`, `windowMs`, `cooldownMs`, `retries`, `baseDelayMs` and `maxDelayMs`. `call(request)` returns a promise; it rejects with an object that may carry a numeric `status`.\n\n**`send(request)`** returns a promise that always resolves, never rejects, with one of three shapes:\n\n- `{ ok: true, value, attempts }` — `value` is what `call` resolved with.\n- `{ ok: false, reason: \'failed\', status, attempts }` — `status` is the numeric `status` of the last rejection, or `null` when it carried none.\n- `{ ok: false, reason: \'circuit-open\', attempts: 0 }` — refused without calling through.\n\n`attempts` counts the calls this `send` made to `call`.\n\n**Retrying, while the circuit is closed.** A rejection is retryable when its `status` is 429, when its `status` is 500 or above, or when it carries no numeric `status` at all. Every other 4xx is the caller’s own mistake and must not be retried: one call, then give up. A retryable failure waits `Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)` milliseconds with `await sleep(...)` and tries again, for at most `retries` retries — so `retries: 2` means three calls at most, with waits of `baseDelayMs` and `2 × baseDelayMs`, each capped at `maxDelayMs`.\n\n**Opening.** A whole `send` that ends `ok: false, reason: \'failed\'` counts as one failure, however many attempts it made. Count consecutive failures: when a failure arrives more than `windowMs` after the previous one, the streak restarts at 1 instead of continuing. A successful `send` clears the count. Reaching `failureThreshold` opens the circuit and starts the cooldown. A refused `send` is not a failure and never touches the count.\n\n**Open, and the probe.** While the circuit is open, `send` returns `circuit-open` immediately and `call` is not invoked at all. Once `cooldownMs` has passed since it opened, the circuit is half-open: the next `send` is the probe, and it is exactly one call with no retries. Any other `send` arriving while that probe is in flight is refused. A probe that resolves closes the circuit and clears the failure count; a probe that rejects re-opens it and restarts the cooldown from that moment.\n\n**`state()`** returns `\'closed\'`, `\'open\'` or `\'half-open\'` — `\'half-open\'` meaning the cooldown has passed and the next `send` will be the probe.\n\nThe dependency is a fixture written for this exercise, not a live service. `sleep` runs on the sandbox’s virtual clock, so a 2 000 ms cooldown finishes instantly and the recorded gaps between calls still read 100, 200 and 300. Nothing here opens a network connection, and a fixture that fails on cue tells you about this code on these inputs rather than about how a real store degrades.',
        contract: [
          '`options.call` is the only way to reach the dependency, and it must not be called at all while the circuit is open.',
          'The half-open probe is exactly one call. It does not retry, whatever the rejection says.',
          'Retry only a rejection with `status` 429, `status` 500 or above, or no numeric `status`. Every other 4xx gets one call.',
          'Wait with `await sleep(ms)` from the task harness. Do not define your own and do not use real timers.',
          'Keep every counter, timestamp and flag inside `createCircuit`, so two circuits over the same dependency stay independent.',
          '`send` always resolves. Report a failure in the returned object rather than rejecting.',
        ],
        starter: `const createCircuit = options => {

};

// Scratch pad — change this and press Run.
const demo = createCircuit({
  call: () => Promise.resolve('routed'),
  failureThreshold: 3,
  windowMs: 10000,
  cooldownMs: 2000,
  retries: 2,
  baseDelayMs: 100,
  maxDelayMs: 400,
});
console.log(demo ? 'built' : 'createCircuit has not returned anything yet');
`,
        skeleton: `const createCircuit = options => {
  let phase = 'closed';
  let failures = 0;
  let lastFailureAt = null;
  let openedAt = 0;
  let probeInFlight = false;

  const statusOf = error => /* the numeric status, or null */;
  const retryable = error => /* 429, 5xx, or no status at all */;

  const state = () => {
    // 'half-open' once the cooldown has passed, otherwise whatever phase holds
  };

  const recordFailure = () => {
    // restart the streak when the previous failure is older than windowMs
    // open, and stamp openedAt, once the streak reaches failureThreshold
  };

  const send = async request => {
    const current = state();
    if (current === 'open') return { ok: false, reason: 'circuit-open', attempts: 0 };

    if (current === 'half-open') {
      // refuse when a probe is already in flight, otherwise claim the slot
      // exactly one call: resolve closes the circuit, reject re-opens it
    }

    let attempts = 0;
    for (;;) {
      attempts += 1;
      try {
        /* call through, clear the failure count, return the value */
      } catch (error) {
        // stop on a non-retryable error or a spent budget
        // otherwise await sleep(the capped backoff) and go round again
      }
    }
  };

  return { send, state };
};`,
        hints: [
          'Keep the phase in one variable and let `state()` do the cooldown arithmetic: if the phase is `open` and `Date.now() - openedAt >= cooldownMs`, report `half-open`. Then `send` reads `state()` once at the top and never has to check the clock again.',
          'Claim the probe slot synchronously. Set `probeInFlight = true` before the `await`, so a second `send` that starts while the probe is still running sees the flag and is refused. If the first thing your half-open branch does is await, both sends get through.',
          'Backoff for attempt `n` is `Math.min(baseDelayMs * 2 ** (n - 1), maxDelayMs)`: 100, 200, 400, 400 with a base of 100 and a cap of 400. Compute it after the failure, using the attempt that just failed.',
        ],
        approach: [
          'Write `statusOf(error)` returning `error.status` when it is a number and `null` otherwise, then `retryable(error)` on top of it: true for `null`, true for 429, true for 500 and above, false for everything else.',
          'Write `state()` so it reports `half-open` when the phase is `open` and the cooldown has elapsed, and write a small `open()` that sets the phase, stamps `openedAt` and clears the failure count.',
          'Give `send` the three branches in order: refuse when `state()` is `open`; run the single probe when it is `half-open` and no probe is in flight; otherwise fall through to the retry loop.',
          'In the retry loop, count the attempt, call through, and on a rejection stop when the error is not retryable or the attempt has used the budget. Otherwise `await sleep(...)` with the capped delay.',
          'On the way out, clear the failure count after a success and call `recordFailure()` after a failure, comparing `Date.now() - lastFailureAt` against `windowMs` to decide whether the streak continues or restarts.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct outcomes, attempt counts and capped backoff',
            critical: true,
            weight: 3,
            detail:
              'The result shape, the retry budget or the delay is off. Check that `send` always resolves, that `attempts` counts the calls this send made, that `retries: 2` means three calls at most, that the delay is `Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)` and stops growing at the cap, and that a rejection carrying no numeric status reports `status: null`.',
          },
          {
            id: 'open-refuses-fast',
            label: 'An open circuit refuses without calling the dependency',
            critical: true,
            weight: 2,
            detail:
              'A call reached the dependency while the circuit was open. The whole point of opening is to take load off something that is already failing, so the refusal has to happen before `options.call` is invoked: check the state at the top of `send`, return `{ ok: false, reason: \'circuit-open\', attempts: 0 }`, and leave the failure count untouched.',
          },
          {
            id: 'single-probe',
            label: 'Half-open admits exactly one probe',
            critical: true,
            weight: 2,
            detail:
              'More than one call went through after the cooldown, or the probe retried. A half-open circuit is asking one question of a dependency that just failed, so it is one call with no retries: claim the slot synchronously before the first `await`, refuse anything that arrives while it is in flight, close on a resolve, and re-open with a fresh `openedAt` on a reject.',
          },
          {
            id: 'no-retry-on-4xx',
            label: 'A non-retryable 4xx is called once',
            critical: true,
            weight: 2,
            detail:
              'A 4xx that is not 429 was retried, or a retryable rejection was not. Repeating a request the server already rejected as malformed gets the same answer and spends the dependency’s capacity for nothing. Retry only 429, 500 and above, and rejections with no numeric status; give every other 4xx exactly one call.',
          },
        ],
        tests: [
          {
            call:
              "(function () { var d = __dependency('o'); var c = __circuit(d); return c.send({ id: 'R-1' }).then(function (out) { return { ok: out.ok, value: out.value, attempts: out.attempts, calls: d.calls.length, state: c.state() }; }); })()",
            expected: { ok: true, value: { echo: { id: 'R-1' } }, attempts: 1, calls: 1, state: 'closed' },
            label: 'a healthy call passes straight through',
            async: true,
          },
          {
            call:
              "(function () { var d = __dependency('5o'); var c = __circuit(d); return c.send({ id: 'R-2' }).then(function (out) { return { ok: out.ok, attempts: out.attempts, calls: d.calls.length }; }); })()",
            expected: { ok: true, attempts: 2, calls: 2 },
            label: 'a 503 recovers on the second attempt',
            async: true,
          },
          {
            call:
              "(function () { var d = __dependency('5'); var c = __circuit(d); return c.send({ id: 'R-3' }).then(function (out) { return { ok: out.ok, reason: out.reason, status: out.status, attempts: out.attempts, calls: d.calls.length }; }); })()",
            expected: { ok: false, reason: 'failed', status: 503, attempts: 3, calls: 3 },
            label: 'two retries and no more: three calls, then it gives up',
            async: true,
          },
          {
            call:
              "(function () { var d = __dependency('5'); var c = __circuit(d, { retries: 4, baseDelayMs: 100, maxDelayMs: 300 }); return c.send({ id: 'R-4' }).then(function () { return __gaps(d); }); })()",
            expected: [0, 100, 200, 300, 300],
            label: 'the backoff doubles and then stops at the cap',
            async: true,
          },
          {
            call:
              "(function () { var d = __dependency('4'); var c = __circuit(d); return c.send({ id: 'R-5' }).then(function (out) { return { ok: out.ok, status: out.status, attempts: out.attempts, calls: d.calls.length }; }); })()",
            expected: { ok: false, status: 422, attempts: 1, calls: 1 },
            label: 'a 422 is the caller’s mistake, so it is called once',
            edge: true,
            async: true,
            criterion: 'no-retry-on-4xx',
          },
          {
            call:
              "(function () { var d = __dependency('tto'); var c = __circuit(d); return c.send({ id: 'R-6' }).then(function (out) { return { ok: out.ok, attempts: out.attempts, calls: d.calls.length }; }); })()",
            expected: { ok: true, attempts: 3, calls: 3 },
            label: '429 is the 4xx that is retried',
            edge: true,
            async: true,
            criterion: 'no-retry-on-4xx',
          },
          {
            call:
              "(function () { var d = __dependency('4'); var c = __circuit(d); return __drive(c, 4).then(function (out) { return { state: c.state(), reason: out[3].reason, attempts: out[3].attempts, calls: d.calls.length }; }); })()",
            expected: { state: 'open', reason: 'circuit-open', attempts: 0, calls: 3 },
            label: 'three failed sends open the circuit, and the fourth never reaches the dependency',
            async: true,
            criterion: 'open-refuses-fast',
          },
          {
            call:
              "(function () { var d = __dependency('444o'); var c = __circuit(d); return __drive(c, 3).then(function () { return sleep(2000); }).then(function () { return Promise.all([c.send({ id: 'P' }), c.send({ id: 'Q' })]); }).then(function (out) { return { probe: out[0].ok, beside: out[1].reason, calls: d.calls.length, state: c.state() }; }); })()",
            expected: { probe: true, beside: 'circuit-open', calls: 4, state: 'closed' },
            label: 'half-open admits the probe and refuses the send beside it',
            async: true,
            criterion: 'single-probe',
          },
          {
            call:
              "(function () { var d = __dependency('4445'); var c = __circuit(d); return __drive(c, 3).then(function () { return sleep(2000); }).then(function () { return c.send({ id: 'P' }); }).then(function (probe) { return c.send({ id: 'Q' }).then(function (after) { return { probeAttempts: probe.attempts, state: c.state(), afterReason: after.reason, calls: d.calls.length }; }); }); })()",
            expected: { probeAttempts: 1, state: 'open', afterReason: 'circuit-open', calls: 4 },
            label: 'a failed probe is one call, re-opens the circuit and restarts the cooldown',
            edge: true,
            async: true,
            criterion: 'single-probe',
          },
        ],
        harness: CIRCUIT_FIXTURES,
      },
    },
  ],
  requires: [
    { activityId: 'fde-v1-m09-checks', state: 'verified_pass' },
    { activityId: 'fde-v1-m09-retry-circuit', state: 'verified_pass' },
  ],
};
