/** M07 — Evaluation.
 *
 * M05 produced grounded answers and refusals; M06 produced tool calls a
 * dispatcher was willing to run. This module is the number that says whether
 * either of them got better, and the ways that number lies.
 *
 * Two lessons, one four-question check, one graded metrics function. The
 * first lesson is about the set: where labelled cases come from, why the
 * held-out half is split off before any tuning, and the three quiet ways an
 * answer from that half leaks back into the system it was meant to measure.
 * The second is about the report: accuracy, coverage, cost and p95 latency as
 * four separate numbers, the slice an aggregate hides, and the honest
 * comparison against a deterministic baseline.
 *
 * Every case, prediction, score and latency figure in this module is an
 * authored fixture. `__cases` and `__predictions` in the task harness build a
 * 36-case held-out set and six named prediction sets from a compact pattern
 * table; nothing calls a provider, needs a key or opens a socket. Marlbrook
 * Systems, its queues and its ticket ids are invented for this path, and no
 * real customer data appears in them. A fixture accuracy is identical on
 * every run, which is what makes it gradeable and exactly what a live model
 * is not. */

import type { ModuleSource } from '../../types';

/** The held-out set, the prediction sets and the two accessors the metrics
 * function is graded against. Appended after the learner's code so the
 * fixtures cannot be shadowed.
 *
 * 36 cases in three slices of twelve. The prediction sets are written as one
 * character per case — `c` correct, `w` wrong, `a` abstained, `n`/`e`/`o` a
 * malformed answer, `x` no prediction at all — so the shape of each candidate
 * is readable in one line. `candidate` is the important one: it wins on the
 * aggregate, 27 correct against 30, while the returns slice falls from 10 to
 * 7. `cautious` is the other trap: it is right on 22 of the 24 cases it
 * answers and on 22 of all 36. */
const EVALUATION_FIXTURES = `
var __LABELS = ['tier-1', 'tier-2', 'finance', 'ops'];
var __CASE_ROWS = [
  ['C-01', 'billing', 'finance'], ['C-02', 'billing', 'finance'], ['C-03', 'billing', 'tier-1'],
  ['C-04', 'billing', 'finance'], ['C-05', 'billing', 'finance'], ['C-06', 'billing', 'tier-2'],
  ['C-07', 'billing', 'finance'], ['C-08', 'billing', 'finance'], ['C-09', 'billing', 'tier-1'],
  ['C-10', 'billing', 'finance'], ['C-11', 'billing', 'finance'], ['C-12', 'billing', 'tier-2'],
  ['C-13', 'delivery', 'ops'], ['C-14', 'delivery', 'ops'], ['C-15', 'delivery', 'tier-1'],
  ['C-16', 'delivery', 'ops'], ['C-17', 'delivery', 'ops'], ['C-18', 'delivery', 'tier-1'],
  ['C-19', 'delivery', 'ops'], ['C-20', 'delivery', 'ops'], ['C-21', 'delivery', 'tier-2'],
  ['C-22', 'delivery', 'ops'], ['C-23', 'delivery', 'ops'], ['C-24', 'delivery', 'tier-1'],
  ['C-25', 'returns', 'tier-2'], ['C-26', 'returns', 'ops'], ['C-27', 'returns', 'tier-2'],
  ['C-28', 'returns', 'tier-2'], ['C-29', 'returns', 'ops'], ['C-30', 'returns', 'tier-2'],
  ['C-31', 'returns', 'tier-1'], ['C-32', 'returns', 'tier-2'], ['C-33', 'returns', 'ops'],
  ['C-34', 'returns', 'tier-2'], ['C-35', 'returns', 'tier-2'], ['C-36', 'returns', 'ops']
];
var __cases = function (which) {
  var rows = which === 'twoSlices'
    ? __CASE_ROWS.filter(function (row) { return row[1] !== 'returns'; })
    : __CASE_ROWS;
  return rows.map(function (row) { return { id: row[0], slice: row[1], expected: row[2] }; });
};
var __wrong = function (expected) {
  return __LABELS[(__LABELS.indexOf(expected) + 1) % __LABELS.length];
};
var __PATTERNS = {
  baseline:   'ccccccccwwww' + 'cccccccccwww' + 'ccccccccccww',
  candidate:  'cccccccccccw' + 'cccccccccccc' + 'cccccccwwwww',
  cautious:   'cccccccwaaaa' + 'ccccccccaaaa' + 'cccccccwaaaa',
  uniform:    'ccccccccccww' + 'ccccccccccww' + 'cccccccccccw',
  reshuffle:  'cccccccccwww' + 'ccccccccwwww' + 'ccccccccccww',
  allAbstain: 'aaaaaaaaaaaa' + 'aaaaaaaaaaaa' + 'aaaaaaaaaaaa',
  malformed:  'nnnnnnnnnnnn' + 'eeeeeeeeeeee' + 'oooooooooooo',
  messy:      'ccccccccwwxx' + 'ccccccccaane' + 'cccccccwwxxx'
};
var __EXTRAS = {
  messy: [
    { caseId: 'C-01', answer: 'tier-1' },
    { caseId: 'C-21', answer: 'tier-2' },
    { caseId: 'X-99', answer: 'finance' },
    { caseId: 'X-98', answer: 'ops' }
  ]
};
var __predictions = function (name) {
  if (name === 'duplicate') {
    var once = __predictions('baseline');
    return once.concat(once.map(function (entry) {
      return { caseId: entry.caseId, answer: __wrong(entry.answer) };
    }));
  }
  if (name === 'foreign') {
    return __CASE_ROWS.map(function (row) { return { caseId: 'Z-' + row[0].slice(2), answer: row[2] }; });
  }
  var pattern = __PATTERNS[name] || '';
  var out = [];
  __CASE_ROWS.forEach(function (row, index) {
    var mark = pattern.charAt(index);
    if (mark === 'c') out.push({ caseId: row[0], answer: row[2] });
    else if (mark === 'w') out.push({ caseId: row[0], answer: __wrong(row[2]) });
    else if (mark === 'a') out.push({ caseId: row[0], answer: null });
    else if (mark === 'n') out.push({ caseId: row[0], answer: 42 });
    else if (mark === 'e') out.push({ caseId: row[0], answer: '   ' });
    else if (mark === 'o') out.push({ caseId: row[0], answer: { label: row[2] } });
  });
  return out.concat(__EXTRAS[name] || []);
};
`.trim();

export const FDE_M07: ModuleSource = {
  id: 'fde-v1-m07',
  title: 'Evaluation',
  outcomes: [
    'Build a labelled set out of real failures, give every case a slice label, and split the held-out half off once, before any tuning starts.',
    'Name the three ways a held-out answer leaks back into the system measuring it, and say what each one inflates.',
    'Report accuracy, coverage, cost and p95 latency as four numbers, and say which of them answers the question the customer actually asked.',
    'Read a per-slice table and spot the slice a rising aggregate is hiding.',
    'State the rule that decides which candidate wins before you run the comparison, and hold a deterministic baseline to the same measurement.',
  ],
  competencies: ['evaluation'],
  dependsOn: ['fde-v1-m05', 'fde-v1-m06'],
  estimatedMinutes: 110,
  lessons: [
    {
      id: 'fde-v1-m07-l1',
      title: 'Reference cases and leakage',
      summary:
        'Where labelled cases come from, what one case record has to carry, why the held-out half is split off before you tune anything, and the three quiet ways an answer from it gets back into the system.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'NIST AI Risk Management Framework',
          url: 'https://www.nist.gov/itl/ai-risk-management-framework',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'Python docs — random',
          url: 'https://docs.python.org/3/library/random.html',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'Marlbrook’s support workbench reads an incoming ticket and proposes a queue for it. It gets that right most of the time, and “most of the time” is the whole problem: nobody in the room can say whether last week’s change helped, hurt, or moved the failures somewhere quieter. What settles it is a set of tickets with the right queue written down before the system sees them.',
        },
        {
          kind: 'prose',
          body:
            'The cheapest source of good cases is your own defect list. Every ticket an operator re-routed by hand is a case where somebody already decided what the right answer was. Pull thirty of those, keep the original text, and you have a set that fails for the reasons your system actually fails, rather than for the reasons you imagined at the whiteboard.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const evaluationCase = {\n  id: 'C-27',\n  slice: 'returns',            // the labelled group this case belongs to\n  input: 'Sent back two chilled trays on Tuesday, still no credit.',\n  expected: 'tier-2',          // the queue an operator agreed it belongs in\n  sourceTicket: 'TKT-88104',   // where the case came from\n  labelledBy: 'ops-lead',\n  labelledOn: '2026-08-14',\n};",
          caption: 'One case. `expected` is the only field the grader compares; the rest exists so somebody can argue with the label later.',
        },
        {
          kind: 'prose',
          body:
            'Four properties make a case usable. It has exactly one right answer that two operators would agree on. It carries a slice label, so you can ask how the system does on returns tickets rather than only how it does overall. It records who labelled it and when, because a label is a judgement and judgements get revised. And it keeps the input as it arrived, misspellings included, because cleaning the input turns the case into a test of a system nobody is running.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Every case, prediction, accuracy and latency figure in this module is an authored fixture, fixed at the value you see. Nothing here calls a model. A live model asked the same question twice can give two different answers, and the whole point of a fixture is that it does not, which is what makes an exercise gradeable and what makes it a poor imitation of production.',
        },
        {
          kind: 'prose',
          body:
            'Split the set in two before you touch anything. One half is where you experiment: change the prompt, move the confidence threshold, swap the router, watch the number. The other half stays closed. Seed the draw so the same tickets land in the same half every time you rebuild the file, and write the split into the repository rather than regenerating it — Python’s `random` module documents both halves of that habit, `random.sample` for a draw without replacement and a seeded `Random` for a draw you can reproduce.',
        },
        {
          kind: 'trace',
          caption: 'Four tuning rounds on the dev half, one run against the held-out half, and the run that destroys it.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['dev · 24 cases', 'held-out · 12 cases', 'threshold 0.50', 'dev accuracy 0.71', 'held-out accuracy —'],
                note: 'The 36 cases are split once, 24 for experimenting and 12 held back, and the split is recorded. The first threshold is a guess and the dev half scores 0.71. The held-out half has not run.',
                counter: { label: 'Held-out runs', value: 0 },
              },
              {
                cells: ['dev · 24 cases', 'held-out · 12 cases', 'threshold 0.60', 'dev accuracy 0.78', 'held-out accuracy —'],
                marks: [{ index: 2, role: 'active' }, { index: 3, role: 'compare' }],
                note: 'Raising the threshold to 0.60 takes the dev half to 0.78. That is what the dev half is for, and the held-out half still has not run.',
                counter: { label: 'Held-out runs', value: 0 },
              },
              {
                cells: ['dev · 24 cases', 'held-out · 12 cases', 'threshold 0.68', 'dev accuracy 0.83', 'held-out accuracy —'],
                marks: [{ index: 2, role: 'active' }, { index: 3, role: 'compare' }],
                note: '0.68 reaches 0.83 on the dev half. Each round picks the value that suits these particular 24 tickets a little better than the last one did.',
                counter: { label: 'Held-out runs', value: 0 },
              },
              {
                cells: ['dev · 24 cases', 'held-out · 12 cases', 'threshold 0.71', 'dev accuracy 0.85', 'held-out accuracy —'],
                marks: [{ index: 2, role: 'active' }, { index: 3, role: 'compare' }],
                note: 'The fourth round settles on 0.71 and 0.85. Four rounds of fitting have gone into that number, and every one of them saw the same 24 tickets.',
                counter: { label: 'Held-out runs', value: 0 },
              },
              {
                cells: ['dev · 24 cases', 'held-out · 12 cases', 'threshold 0.71', 'dev accuracy 0.85', 'held-out accuracy 0.74'],
                marks: [{ index: 4, role: 'settled' }],
                note: 'The held-out half runs once, at the threshold the dev half chose, and scores 0.74. That is the number you report. The gap to 0.85 is what four rounds of tuning bought themselves on cases they had already seen.',
                counter: { label: 'Held-out runs', value: 1 },
              },
              {
                cells: ['dev · 24 cases', 'held-out · 12 cases', 'threshold 0.76', 'dev accuracy 0.84', 'held-out accuracy 0.79'],
                marks: [{ index: 4, role: 'excluded' }],
                note: 'Somebody nudges the threshold to 0.76 because it lifts the held-out score to 0.79. The held-out half has now steered a decision, so it is a second dev half, 0.79 measures nothing that was held back, and no clean number is left to report.',
                counter: { label: 'Held-out runs', value: 2 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'That last frame is leakage, and it has one definition worth memorising: the held-out answers influenced the thing they were meant to measure. It never announces itself. Nobody copies the answer key into the code. Somebody runs the held-out set a second time, or reuses a case they once pasted into a prompt, and the number goes up while the system stays the same.',
        },
        {
          kind: 'table',
          caption: 'Three quiet leaks, what each inflates, and the repair.',
          headers: ['How it happens', 'What it inflates', 'What to do about it'],
          rows: [
            [
              'You run the held-out set after each change and keep the variant that scored best',
              'The held-out number, by the amount your choices fitted those particular cases. The more variants you tried, the larger the lift',
              'Tune on the dev half only. Run the held-out set once per decision, and record how many times it has been run',
            ],
            [
              'Few-shot examples in the prompt were copied out of the evaluation set',
              'Accuracy on exactly those cases, because the system is being shown its own answer key',
              'Move every case used as an example into the dev half, permanently. An example is training material, not a test',
            ],
            [
              'The same generator produced both the fixtures the system was built against and the cases it is measured on',
              'Everything, invisibly. The set shares the generator’s vocabulary, its edge cases and its blind spots',
              'Take held-out cases from real traffic. Keep generated cases for the dev half, and label them as generated in the file',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'The third leak is the one people argue about, so it is worth being concrete. If your fixture generator writes returns tickets in the shape “Sent back N items on DAY, still no credit”, and your held-out cases came out of the same generator, then a router that keys on “still no credit” scores well on both. It will score badly on the customer who writes “nobody has refunded me”. The set never contained that sentence, so the evaluation never had a chance to tell you.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'A held-out set of twelve cases moves by eight points every time one case flips. A candidate that beats the baseline by one case has told you almost nothing, and reporting that as an improvement is a claim the set cannot support. Say how many cases the number came from, next to the number.',
        },
        {
          kind: 'prose',
          body:
            'The set is not finished when you first build it. Every escaped defect is a case you did not have, so the habit is: reproduce the failure, write it down as a case with the answer an operator agrees to, and put it in the dev half if you are about to fix it. It joins the held-out half only after the fix has shipped, or you have quietly gone back to tuning against your test set.',
        },
        {
          kind: 'prose',
          body:
            'Keep the file under version control with the code, and note in each case where it came from and who labelled it. NIST’s AI Risk Management Framework puts documentation and traceability among the practices that make a system’s behaviour reviewable, and in an evaluation set that is not paperwork. Six months from now the argument will be about whether case C-27 was ever really a tier-2 ticket, and the answer to that lives in the record or nowhere.',
        },
      ],
    },
    {
      id: 'fde-v1-m07-l2',
      title: 'Quality against cost and latency',
      summary:
        'Four numbers instead of one, why an accuracy computed over answered cases climbs as a system answers less, the slice a rising aggregate hides, and the comparison rule you have to write down before you run it.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'Google SRE Book — Service Level Objectives',
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
            'Somebody will ask you for the accuracy number. Give them four numbers instead, because a change that improves any one of them usually pays for it out of another, and a single figure lets that trade happen without anybody noticing it happened.',
        },
        {
          kind: 'table',
          caption: 'The four numbers a candidate is reported on, and what each one leaves out.',
          headers: ['Number', 'What it answers', 'What it cannot tell you'],
          rows: [
            [
              'Accuracy over all cases',
              'Of everything that arrived, how much did the system get right',
              'Whether it got there by answering everything badly or answering a little very well',
            ],
            [
              'Coverage, and the abstention rate beside it',
              'How much of the work the system took on at all',
              'Whether the cases it declined were the hard ones or a random third',
            ],
            [
              'Cost per case',
              'What one ticket costs to process, in tokens or in calls',
              'What an abstention costs, because that bill arrives as an operator’s time',
            ],
            [
              'p95 latency',
              'What the slow end of the distribution looks like',
              'What the slowest 5% did. A p95 of 2s is compatible with a p99 of 40s',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'Coverage is the one that hides in plain sight. A system that answers 24 of 36 cases and is right on 22 of them can be reported two ways: 22 of 36, which is 0.61, or 22 of 24, which is 0.92. Both are arithmetic. The second is what most reporting code computes by accident, because dividing by the number of rows you produced is easier than dividing by the number of rows you were asked about.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const report = {\n  total: 36,\n  answered: 24,\n  abstained: 12,\n  correct: 22,\n  accuracy: 0.6111,             // correct / total — abstentions count against you\n  coverage: 0.6667,             // answered / total\n  accuracyWhenAnswered: 0.9167, // correct / answered — never call this 'accuracy'\n  costPerCaseUsd: 0.004,\n  p95LatencyMs: 1840,\n};",
          caption: 'The same run, reported honestly. The two accuracy fields differ by thirty points and only their names keep them apart.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Publishing `accuracyWhenAnswered` under the label “accuracy” is the most common quiet lie in an evaluation report, and it has a gradient: the number rises every time the system declines a case it would have got wrong. A system tuned to abstain more will look like a system getting better, right up until somebody counts what the operators are now reading.',
        },
        {
          kind: 'prose',
          body:
            'Slices are how you find out where the accuracy came from. Split by whatever the customer would split by: ticket topic, tenant, language, channel, the accounts on the enterprise contract. Marlbrook’s set slices by topic — billing, delivery, returns — and twelve cases each is small, but a slice that is too small to prove a regression is also too small to prove there is not one.',
        },
        {
          kind: 'trace',
          caption: 'A candidate against the baseline, one slice at a time, ending with the aggregate that hides the third one.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['billing 0.67', 'delivery 0.75', 'returns 0.83', 'overall 0.75'],
                note: 'The baseline on the held-out set: 8 of 12 billing tickets, 9 of 12 delivery, 10 of 12 returns, 27 of 36 overall.',
              },
              {
                cells: ['billing 0.92', 'delivery 0.75', 'returns 0.83', 'overall —'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The candidate’s billing slice goes from 8 of 12 to 11 of 12. Three tickets that used to reach the wrong queue now reach the right one.',
              },
              {
                cells: ['billing 0.92', 'delivery 1.00', 'returns 0.83', 'overall —'],
                marks: [{ index: 1, role: 'active' }],
                note: 'Delivery goes from 9 of 12 to 12 of 12. Two slices out of three are better, and so far the change looks unambiguous.',
              },
              {
                cells: ['billing 0.92', 'delivery 1.00', 'returns 0.58', 'overall —'],
                marks: [{ index: 2, role: 'compare' }],
                note: 'Returns falls from 10 of 12 to 7 of 12. Three returns tickets that used to be routed correctly now are not, and nothing in the aggregate has been computed yet.',
              },
              {
                cells: ['billing 0.92', 'delivery 1.00', 'returns 0.58', 'overall 0.83'],
                marks: [{ index: 2, role: 'excluded' }, { index: 3, role: 'settled' }],
                note: 'The aggregate rises from 0.75 to 0.83. A report saying “accuracy improved by eight points” is true and omits the only slice anybody would have objected to, which is why the comparison has to name the regressed slice next to the win.',
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Report latency as a percentile, not a mean. The mean of a run where 95 cases take 400 ms and 5 cases take 30 s is under two seconds, and every one of those five was somebody staring at a spinner. The SRE book makes the same argument for service level objectives: the distribution is the thing users experience, and a percentile describes it where an average smooths it away. Your traces already hold the raw numbers — OpenTelemetry models a request as a tree of spans with start and end times, so the retrieval step and the model call each have their own duration and you can say which half of the p95 belongs to which.',
        },
        {
          kind: 'prose',
          body:
            'Cost has the same two-denominators problem as accuracy. Cost per case and cost per answered case diverge as abstention rises, and the second one flatters a cautious system. The bill also has a part that never reaches your invoice: an abstained ticket is read by an operator, and if operator minutes are the baseline you are trying to beat, an abstention is a case where you did not beat it.',
        },
        {
          kind: 'table',
          caption: 'The deterministic baseline, measured on the same set as everything else.',
          headers: ['Candidate', 'Accuracy · coverage', 'Cost and p95', 'What it argues'],
          rows: [
            [
              'Keyword router, 40 rules',
              '0.75 · 1.00',
              '0.0000 USD · 12 ms',
              'The floor. Anything slower and dearer has to beat this by enough to be worth the difference',
            ],
            [
              'Single model call, no retrieval',
              '0.83 · 1.00',
              '0.0035 USD · 900 ms',
              'Eight points for a third of a cent and most of a second per ticket',
            ],
            [
              'Model call with an abstention threshold',
              '0.61 · 0.67',
              '0.0040 USD · 1840 ms',
              'Right on 22 of the 24 it answers, and it hands 12 of 36 tickets back to a person',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'The keyword router in that first row is a real answer, not a straw man. It costs nothing, it returns in twelve milliseconds, it can be read by the operations lead, and it fails in ways somebody can fix on a Tuesday afternoon. If the constraint is a 200 ms budget or a rule the customer’s auditor has to read, the deterministic router wins on the merits, and “use a model” is the answer to a question nobody asked.',
        },
        {
          kind: 'prose',
          body:
            'Write the rule that decides the winner before you run the comparison. Ours for the exercise: a candidate that answers a lot less than the baseline loses whatever its accuracy says, and otherwise the higher overall accuracy wins if the gap is bigger than a point. Fixing the rule first is what stops the comparison from becoming a search for the framing under which your candidate wins, and it is the same discipline as splitting the set before you tune.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'The costs and latencies in the table above are authored figures for this lesson. They are the right shape for a routing workload and they are not measurements of any provider. Price your own candidates from your own runs, and re-measure after any change to the model, the prompt length or the retrieval step.',
        },
        {
          kind: 'prose',
          body:
            'What the report still cannot tell you is worth saying out loud when you hand it over. It measures 36 tickets from last quarter. It says nothing about a ticket type that started arriving in March, nothing about the days your retrieval index was six weeks stale, and nothing about how a live model would answer the same tickets tomorrow. Those are the sentences that belong under the table, and leaving them out is how a number that was honest on Monday becomes a claim by Friday.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'fde-v1-m07-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: reference cases and leakage',
      summary: 'Building a labelled set from real failures, the four properties of a usable case, the split made once, and the three quiet leaks.',
      competencies: ['evaluation'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m07-l1',
    },
    {
      id: 'fde-v1-m07-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: quality against cost and latency',
      summary: 'Four numbers instead of one, the abstention lever on accuracy, the slice an aggregate hides, and the deterministic baseline measured the same way.',
      competencies: ['evaluation'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m07-l2',
    },
    {
      id: 'fde-v1-m07-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Reading an evaluation report',
      summary:
        'Four bounded decisions: which of four comparisons is leaked, which number answers the question the support lead asked, what a rising aggregate and a falling slice mean together, and why the abstention rate sits beside the accuracy.',
      competencies: ['evaluation'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-m07-q1',
          prompt:
            'Four Marlbrook teams each report a candidate router beating the deterministic baseline. Which comparison is leaked?',
          options: [
            'Team A drew 30 cases from last quarter’s re-routed tickets, split them 20/10 before touching the router, tuned the confidence threshold against the 20, and reported the 10.',
            'Team B’s held-out set has 12 cases, and the candidate beat the baseline by two of them.',
            'Team C wrote eight few-shot examples into the prompt by copying the eight hardest cases out of the evaluation set, then reported accuracy on that set.',
            'Team D compared against a keyword router with no model in it, which the team calls an unfair comparison because the baseline has no language understanding.',
          ],
          correct: 2,
          explanation:
            'Team C has handed the system the answers to eight of the cases it is being scored on. Those eight are now training material, and the set is measuring how well the router reproduces examples it was given rather than how it handles a ticket it has never seen. The repair is to move all eight into the dev half permanently and report the rest. Team A is the shape you want: the split happened before any tuning and the reported number came from cases no tuning round saw. Team B has a real weakness and it is not leakage — with 12 cases each one moves the score eight points, so a two-case win sits inside the noise, and the fix is more cases rather than a different split. Team D is describing the comparison working as intended: the keyword router is the floor, and a candidate that cannot clear it does not earn its cost or its latency.',
          competencies: ['evaluation'],
        },
        {
          id: 'fde-v1-m07-q2',
          prompt:
            'Marlbrook’s support lead asks one question: of the 400 tickets that arrive daily, how many can be closed without an operator reading them, at the error rate we already accept? The candidate answers 60% of cases and is right on 95% of the ones it answers. Which number answers that question?',
          options: [
            '`accuracyWhenAnswered`, 0.95, because the lead is asking how often the assistant is right.',
            'The abstention rate, 0.40, because that is the share an operator still has to read.',
            'Coverage times accuracy-when-answered, 0.57: the share of all tickets both answered and answered correctly, so about 228 closed a day with about 12 of them closed into the wrong queue.',
            'p95 latency, because a ticket that misses the response window is not closed either way.',
          ],
          correct: 2,
          explanation:
            'The lead asked for a count of tickets, so the answer has to be a share of all 400 rather than a share of some subset. 0.60 × 0.95 gives 228 closed correctly, and 0.60 × 0.05 gives the 12 a day closed into the wrong queue, which is the figure the lead has to accept or refuse. `accuracyWhenAnswered` on its own says how often the assistant is right when it speaks and nothing about how often it speaks — a system answering three tickets a day would report the same 0.95. The abstention rate counts what the operator still reads and stops one step short: the remaining 60% is not all safely closable, and the 12 wrong closures are exactly what the question was about. p95 latency is a real constraint and a different question; it belongs beside this number in the report, not instead of it.',
          competencies: ['evaluation'],
        },
        {
          id: 'fde-v1-m07-q3',
          prompt:
            'A candidate lifts overall accuracy on the held-out set from 0.75 to 0.83. Per slice: billing 0.67 → 0.92, delivery 0.75 → 1.00, returns 0.83 → 0.58. What do those readings mean together?',
          options: [
            'The aggregate must be recomputed. An average that disagrees with one of its slices has been weighted wrong.',
            'Both readings are real: the candidate is better on two slices and worse on one, so shipping it moves the failures onto returns tickets, and somebody has to decide whether that trade is acceptable.',
            'The returns slice holds 12 cases, so a drop of three sits inside the noise and the aggregate is the number to act on.',
            'The returns slice can be left out of the report, because the candidate improves the number the support lead asked about.',
          ],
          correct: 1,
          explanation:
            'The aggregate and the slices are both straight counts over the same 36 cases, and they agree: 30 correct against 27, with three of the gains coming out of returns. That is what an average does, and the decision it hides is whether Marlbrook will accept three more mis-routed returns tickets in exchange for five fewer mis-routed billing and delivery ones. Recomputing the aggregate finds nothing, because nothing was weighted: a mean over slices of equal size is the same number either way. Calling the drop noise is a fair worry and the wrong conclusion — 12 cases are too few to establish a three-case regression, and equally too few to establish there is not one, so the answer is more returns cases rather than a decision to look away. Dropping the slice from the report is the failure the per-slice table exists to prevent, and it shows up in the operator’s week as returns tickets landing in the wrong queue while the dashboard says the change worked.',
          competencies: ['evaluation'],
        },
        {
          id: 'fde-v1-m07-q4',
          prompt:
            'Two candidates run on the same 36 held-out cases. A answers all 36 and is right on 27. B answers 24 and is right on 22. Reported as one accuracy figure each, A shows 0.75 and B shows 0.92. Why does the abstention rate have to sit beside the accuracy?',
          options: [
            'Because B’s 0.92 is computed over the cases it chose to answer, and that figure climbs as a system answers less: over all 36 cases B is right on 22, which is 0.61. Neither number means anything without the other.',
            'Because abstentions cost more than answers, so the abstention rate is really a cost measure and belongs in the cost column.',
            'Because a high abstention rate shows the model is well calibrated, and calibration is the property the report is testing.',
            'Because abstentions have to be scored as wrong answers, and 22 of 36 is therefore the only honest figure to publish.',
          ],
          correct: 0,
          explanation:
            'B declined 12 cases, and every case it declines that it would have got wrong pushes the answered-cases figure up. Reported alone, 0.92 makes a system that took on two thirds of the work look better than one that took on all of it and got more cases right in absolute terms. An abstention does have a cost, and it lands as operator time rather than tokens, but that belongs in its own column and it is not why coverage sits next to accuracy. Abstaining often is not evidence of calibration either: a system that refuses everything abstains 100% of the time and has learned nothing, and calibration is a separate claim about whether stated confidence matches observed outcomes. The last option is half right stated as the whole: 0.61 is the correct overall accuracy, and publishing only that hides that B is right on 22 of the 24 it answers, which is precisely what you would act on when deciding to route the other 12 to a person. Report both.',
          competencies: ['evaluation'],
        },
      ],
    },
    {
      id: 'fde-v1-m07-evaluation-metrics',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Metrics that do not hide the slice',
      summary:
        'Score a held-out set into accuracy, coverage and per-slice numbers that keep abstentions visible, then compare two candidates under a rule fixed in advance and flag the slice the aggregate buried.',
      competencies: ['evaluation'],
      estimatedMinutes: 45,
      code: {
        language: 'javascript',
        prompt:
          'Marlbrook’s held-out set holds 36 support tickets, twelve in each of three slices — `billing`, `delivery` and `returns` — and each case records the queue an operator agreed it belongs in. You are writing the two functions the release check runs over it.\n\n**`evaluate(cases, predictions)`** returns one report:\n\n`{ total, answered, abstained, correct, accuracy, coverage, accuracyWhenAnswered, bySlice }`\n\n`cases` is an array of `{ id, slice, expected }`. `predictions` is an array of `{ caseId, answer }`. Count like this:\n\n1. **Every case counts once**, whether or not a prediction exists for it. A case with no prediction is an abstention, not a missing row.\n2. **First prediction wins.** A second prediction for the same `caseId` is ignored, whatever it says. The pipeline delivers duplicates.\n3. **A prediction whose `caseId` matches no case is ignored.** It came from another run.\n4. **An answer counts as answered only when it is a string that is non-empty after trimming.** `null`, `undefined`, a number, an object and `\'   \'` are all abstentions.\n5. `accuracy` is `correct / total`, so an abstention counts against you. `coverage` is `answered / total`. `accuracyWhenAnswered` is `correct / answered`. Report `0` for any of them when the denominator is `0`.\n6. **Round every rate** with `Math.round(value * 10000) / 10000`. Counts stay integers.\n7. `bySlice` maps each slice name to an object with the same seven fields, over that slice’s cases only. A case whose `slice` is not a non-empty string joins the slice named `unlabelled`.\n8. A `cases` that is not an array gives a report of zeros with an empty `bySlice`. A `predictions` that is not an array means everything abstained.\n\n**`compare(baseline, candidate)`** takes two of those reports and returns:\n\n`{ better, accuracyDelta, coverageDelta, regressedSlices, sliceMismatch, aggregateHidesRegression }`\n\n- If either argument is not a usable report — not an object, or missing `bySlice`, `accuracy` or `coverage` — return `better: \'not-comparable\'` with both deltas `0` and both arrays empty.\n- `sliceMismatch` lists, sorted ascending, every slice name present in one report and not the other. If it is non-empty the two runs were not the same set, so return `better: \'not-comparable\'`, both deltas `0` and `regressedSlices: []`, keeping the mismatch list.\n- Otherwise `accuracyDelta` is `candidate.accuracy - baseline.accuracy` and `coverageDelta` is `candidate.coverage - baseline.coverage`, each computed from the already-rounded rates and rounded again the same way.\n- `regressedSlices` holds one `{ slice, baselineAccuracy, candidateAccuracy, delta }` for every slice whose accuracy fell, sorted by slice name ascending. `delta` is candidate minus baseline, rounded.\n- **The rule for `better`, applied in this order:** `coverageDelta < -0.05` gives `\'baseline\'`, because a candidate that answers far less has bought its accuracy by handing work back. Then `accuracyDelta > 0.01` gives `\'candidate\'`, `accuracyDelta < -0.01` gives `\'baseline\'`, and anything left is `\'tie\'`.\n- `aggregateHidesRegression` is `true` when `better` is `\'candidate\'` or `\'tie\'` and `regressedSlices` is not empty. That is the flag: the aggregate did not lose, and at least one slice did.\n\nOne fixture matters more than the others. `__predictions(\'candidate\')` beats `__predictions(\'baseline\')` 30 correct to 27 while its returns slice falls from 10 of 12 to 7 of 12, so a comparison that only reads the aggregate reports a clean win over three tickets that stopped reaching the right queue.\n\n`__cases`, `__predictions`, `__CASE_ROWS` and `__PATTERNS` come from the task harness. Every case, label and prediction in them is authored for this exercise and identical on every run. Nothing here calls a model or opens a network connection, and a fixture accuracy is not evidence about how a live router would score these tickets.',
        contract: [
          'Count every case in `cases` exactly once, including cases no prediction mentions.',
          'The first prediction for a `caseId` wins; later ones are ignored. A `caseId` that matches no case is ignored.',
          'An answer counts as answered only when it is a string that is non-empty after trimming.',
          'Round every rate with `Math.round(value * 10000) / 10000`, and report 0 wherever the denominator is 0. Never divide by zero.',
          'Never report `correct / answered` as `accuracy`. The two fields are separate and both are required.',
          'Do not mutate `cases` or `predictions`. `compare` reads the two reports only and never re-reads the cases.',
          '`__cases`, `__predictions`, `__CASE_ROWS` and `__PATTERNS` come from the task harness. Read from them, do not redefine them.',
        ],
        starter: `const round4 = value => Math.round(value * 10000) / 10000;

const evaluate = (cases, predictions) => {

};

const compare = (baseline, candidate) => {

};

// Scratch pad — change this and press Run.
console.log(JSON.stringify(evaluate(__cases(), __predictions('baseline'))));
`,
        skeleton: `const round4 = value => Math.round(value * 10000) / 10000;
const rate = (part, whole) => (whole > 0 ? round4(part / whole) : 0);

const evaluate = (cases, predictions) => {
  const caseList = Array.isArray(cases) ? cases : [];
  const predictionList = Array.isArray(predictions) ? predictions : [];

  const answers = {};
  for (const prediction of predictionList) {
    // skip a non-object, a non-string caseId, and a caseId already recorded
  }

  const counts = { total: 0, answered: 0, abstained: 0, correct: 0 };
  const slices = {};

  for (const item of caseList) {
    const name = /* item.slice when it is a non-empty string, otherwise 'unlabelled' */;
    // add this case to counts and to slices[name]
    // an answer that is not a non-empty string is an abstention
    // an answer equal to item.expected is correct
  }

  const shape = tally => ({
    total: tally.total,
    answered: tally.answered,
    abstained: tally.abstained,
    correct: tally.correct,
    accuracy: /* correct over total */,
    coverage: /* answered over total */,
    accuracyWhenAnswered: /* correct over answered */,
  });

  const bySlice = {};
  // one shaped entry per slice name

  return { ...shape(counts), bySlice };
};

const compare = (baseline, candidate) => {
  const blank = {
    better: 'not-comparable',
    accuracyDelta: 0,
    coverageDelta: 0,
    regressedSlices: [],
    sliceMismatch: [],
    aggregateHidesRegression: false,
  };
  if (/* either report is unusable */) return blank;

  const mismatch = /* slice names present in exactly one report, sorted */;
  if (mismatch.length > 0) return { ...blank, sliceMismatch: mismatch };

  const accuracyDelta = round4(candidate.accuracy - baseline.accuracy);
  const coverageDelta = round4(candidate.coverage - baseline.coverage);
  const regressedSlices = /* every slice whose accuracy fell, sorted by name */;

  const better = /* coverage rule first, then the accuracy gap, then 'tie' */;

  return {
    better,
    accuracyDelta,
    coverageDelta,
    regressedSlices,
    sliceMismatch: [],
    aggregateHidesRegression: /* better is not 'baseline' and a slice regressed */,
  };
};`,
        hints: [
          'Build the answer lookup in its own pass before you count anything. Record a `caseId` only when the map does not already hold it, and you get “first prediction wins” and “duplicates ignored” from one `hasOwnProperty` check.',
          'Keep one tally per slice and one for the whole set, and update both inside the same loop over `cases`. Then shape all of them with the same helper, so a slice can never be computed by a different rule than the total.',
          'Write the abstention test as “this is not a non-empty string”, not as “this is null”. A number, an object and three spaces all have to land on the same side of it, and the fixture sets contain all three.',
        ],
        approach: [
          'Walk `predictions` once into a `caseId → answer` map, keeping the first entry for each id and skipping entries that are not objects or whose `caseId` is not a string.',
          'Walk `cases` once, adding each case to the overall tally and to its slice tally: answered when its answer is a non-empty string, correct when that answer equals `expected`, abstained otherwise.',
          'Turn every tally into the seven-field shape with one helper, dividing only when the denominator is above zero and rounding to four places.',
          'In `compare`, reject an unusable report and then a slice-name mismatch before computing anything, so a comparison across two different sets never produces a delta.',
          'Compute both deltas and the regressed-slice list, apply the coverage rule before the accuracy rule, and set the flag when the aggregate did not lose while a slice did.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct counts, rates and comparison rule',
            critical: true,
            weight: 3,
            detail:
              'Check the four counting rules — every case once, first prediction wins, a foreign `caseId` ignored, a malformed answer treated as an abstention — plus the four-place rounding, the zero-denominator cases, and the order the `better` rule is applied in.',
          },
          {
            id: 'slice-aware',
            label: 'The regressed slice is reported and flagged',
            critical: true,
            weight: 3,
            detail:
              'A slice whose accuracy fell has to appear in `regressedSlices`, sorted by name, with both accuracies and the delta, and `aggregateHidesRegression` has to fire when the aggregate did not lose. A comparison that only reads the two overall numbers passes the candidate silently and fails here.',
          },
          {
            id: 'abstention-separate',
            label: 'Abstentions stay visible in the numbers',
            critical: true,
            weight: 3,
            detail:
              '`accuracy` is over every case and `accuracyWhenAnswered` is over the answered ones; reporting the second as the first is the failure this criterion catches. `coverage` and `abstained` have to move with them, and a run that answered nothing must not divide by zero.',
          },
        ],
        tests: [
          {
            call:
              "(function () { var r = evaluate(__cases(), __predictions('baseline')); return { total: r.total, answered: r.answered, abstained: r.abstained, correct: r.correct, accuracy: r.accuracy, coverage: r.coverage, accuracyWhenAnswered: r.accuracyWhenAnswered }; })()",
            expected: { total: 36, answered: 36, abstained: 0, correct: 27, accuracy: 0.75, coverage: 1, accuracyWhenAnswered: 0.75 },
            label: 'the baseline answers every case and scores 27 of 36',
          },
          {
            call: "evaluate(__cases(), __predictions('baseline')).bySlice.returns",
            expected: { total: 12, answered: 12, abstained: 0, correct: 10, accuracy: 0.8333, coverage: 1, accuracyWhenAnswered: 0.8333 },
            label: 'the returns slice carries the same seven fields as the whole set',
          },
          {
            call:
              "(function () { var r = evaluate(__cases(), __predictions('cautious')); return { answered: r.answered, abstained: r.abstained, correct: r.correct, accuracy: r.accuracy, coverage: r.coverage, accuracyWhenAnswered: r.accuracyWhenAnswered }; })()",
            expected: { answered: 24, abstained: 12, correct: 22, accuracy: 0.6111, coverage: 0.6667, accuracyWhenAnswered: 0.9167 },
            label: 'a cautious run is 0.9167 on what it answered and 0.6111 over the set',
            edge: true,
            criterion: 'abstention-separate',
          },
          {
            call:
              "(function () { var r = evaluate(__cases(), __predictions('allAbstain')); return { total: r.total, answered: r.answered, abstained: r.abstained, correct: r.correct, accuracy: r.accuracy, coverage: r.coverage, accuracyWhenAnswered: r.accuracyWhenAnswered }; })()",
            expected: { total: 36, answered: 0, abstained: 36, correct: 0, accuracy: 0, coverage: 0, accuracyWhenAnswered: 0 },
            label: 'a run that answered nothing reports zeros instead of dividing by zero',
            edge: true,
            criterion: 'abstention-separate',
          },
          {
            call:
              "(function () { var r = evaluate(__cases(), __predictions('messy')); return { total: r.total, answered: r.answered, abstained: r.abstained, correct: r.correct, accuracy: r.accuracy, coverage: r.coverage, accuracyWhenAnswered: r.accuracyWhenAnswered, delivery: r.bySlice.delivery }; })()",
            expected: {
              total: 36,
              answered: 27,
              abstained: 9,
              correct: 23,
              accuracy: 0.6389,
              coverage: 0.75,
              accuracyWhenAnswered: 0.8519,
              delivery: { total: 12, answered: 8, abstained: 4, correct: 8, accuracy: 0.6667, coverage: 0.6667, accuracyWhenAnswered: 1 },
            },
            label: 'missing rows, duplicates, a foreign case id and three malformed answers all count as the rules say',
            edge: true,
          },
          {
            call:
              "(function () { var b = evaluate(__cases(), __predictions('baseline')); var c = evaluate(__cases(), __predictions('candidate')); var r = compare(b, c); return { better: r.better, accuracyDelta: r.accuracyDelta, coverageDelta: r.coverageDelta, regressedSlices: r.regressedSlices, aggregateHidesRegression: r.aggregateHidesRegression }; })()",
            expected: {
              better: 'candidate',
              accuracyDelta: 0.0833,
              coverageDelta: 0,
              regressedSlices: [{ slice: 'returns', baselineAccuracy: 0.8333, candidateAccuracy: 0.5833, delta: -0.25 }],
              aggregateHidesRegression: true,
            },
            label: 'the candidate wins the aggregate and the returns regression is named beside it',
            edge: true,
            criterion: 'slice-aware',
          },
          {
            call:
              "(function () { var b = evaluate(__cases(), __predictions('baseline')); var c = evaluate(__cases(), __predictions('cautious')); var r = compare(b, c); return { better: r.better, accuracyDelta: r.accuracyDelta, coverageDelta: r.coverageDelta, candidateAccuracyWhenAnswered: c.accuracyWhenAnswered, aggregateHidesRegression: r.aggregateHidesRegression }; })()",
            expected: {
              better: 'baseline',
              accuracyDelta: -0.1389,
              coverageDelta: -0.3333,
              candidateAccuracyWhenAnswered: 0.9167,
              aggregateHidesRegression: false,
            },
            label: 'a candidate right on 0.9167 of what it answered still loses on coverage',
            edge: true,
            criterion: 'abstention-separate',
          },
          {
            call:
              "(function () { var b = evaluate(__cases(), __predictions('baseline')); var s = evaluate(__cases('twoSlices'), __predictions('baseline')); var r = compare(b, s); return { better: r.better, sliceMismatch: r.sliceMismatch, regressedSlices: r.regressedSlices, accuracyDelta: r.accuracyDelta, aggregateHidesRegression: r.aggregateHidesRegression }; })()",
            expected: {
              better: 'not-comparable',
              sliceMismatch: ['returns'],
              regressedSlices: [],
              accuracyDelta: 0,
              aggregateHidesRegression: false,
            },
            label: 'two runs over different sets produce a mismatch instead of a delta',
            edge: true,
          },
        ],
        harness: EVALUATION_FIXTURES,
      },
    },
  ],
  requires: [
    { activityId: 'fde-v1-m07-checks', state: 'verified_pass' },
    { activityId: 'fde-v1-m07-evaluation-metrics', state: 'verified_pass' },
  ],
};
