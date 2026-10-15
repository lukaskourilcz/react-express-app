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
        'Label policy, sampled versus regression cases, recorded partitions and what makes evaluation information contaminate selection.',
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
            'Escaped defects and operator corrections are useful regression cases, but they form a selected sample of problems rather than a representative traffic baseline. Verify labels and combine appropriate traffic sampling with deliberate difficult/safety cases. Use authorized, minimized or redacted data; do not put sensitive customer content into an unrestricted repository.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const evaluationCase = {\n  id: 'C-27',\n  slice: 'returns',            // the labelled group this case belongs to\n  input: 'Sent back two chilled trays on Tuesday, still no credit.',\n  expected: 'tier-2',          // the queue an operator agreed it belongs in\n  sourceTicket: 'TKT-88104',   // where the case came from\n  labelledBy: 'ops-lead',\n  labelledOn: '2026-08-14',\n};",
          caption: 'A hypothetical case with one expected queue for this exercise. Id supports joining predictions and slice supports grouped metrics; provenance helps review a disputed label.',
        },
        {
          kind: 'prose',
          body:
            'Define the task and labelling policy, including ambiguous cases, acceptable alternatives and adjudication. This exercise uses one expected string per case, but real tasks need not have exactly one universally agreed answer. Preserve relevant input behavior while following data-minimization/access rules, and document any preprocessing. Record provenance, labels and relevant slices so disagreements and changes can be investigated.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'All cases, predictions and reported figures here are authored fixtures, not measured model performance. Real systems can be deterministic or variable depending on their implementation and configuration. Use actual repeat-run evidence when variability matters; fixture repeatability alone does not establish production realism.',
        },
        {
          kind: 'prose',
          body:
            'Choose development and held-out partitions before fitting or selecting the system. Split related cases together and respect time/tenant boundaries appropriate to the intended evaluation. A seeded draw can help reproduce a split for fixed input ordering and runtime/algorithm; it is not a guarantee across arbitrary data or library changes. Persist the actual split ids and versioned sampling method. A 50/50 split is not required; this example uses 24 development and 12 held-out cases.',
        },
        {
          kind: 'trace',
          caption: 'Development prompt variants and held-out feedback, with explicit correct/total counts.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ["dev · 24 cases", "held-out · 12 cases", "prompt v1", "dev 17/24 ≈ 0.71", "held-out —"],
                note: 'The fixed partition has 24 development and 12 held-out cases. All cases are answered in this trace; prompt v1 gets 17 of 24 development labels right. No held-out result has been used.',
                counter: { label: 'Held-out runs', value: 0 },
              },
              {
                cells: ["dev · 24 cases", "held-out · 12 cases", "prompt v2", "dev 18/24 = 0.75", "held-out —"],
                marks: [{ index: 2, role: 'active' }, { index: 3, role: 'compare' }],
                note: 'Prompt v2 gets 18 of 24 development labels right. The held-out partition stays untouched.',
                counter: { label: 'Held-out runs', value: 0 },
              },
              {
                cells: ["dev · 24 cases", "held-out · 12 cases", "prompt v3", "dev 20/24 ≈ 0.83", "held-out —"],
                marks: [{ index: 2, role: 'active' }, { index: 3, role: 'compare' }],
                note: 'Prompt v3 gets 20 of 24 development labels right. This is selection using the same development cases, not fresh external evidence.',
                counter: { label: 'Held-out runs', value: 0 },
              },
              {
                cells: ["dev · 24 cases", "held-out · 12 cases", "prompt v4", "dev 21/24 = 0.875", "held-out —"],
                marks: [{ index: 2, role: 'active' }, { index: 3, role: 'compare' }],
                note: 'Prompt v4 gets 21 of 24 development labels right and is selected before the held-out run.',
                counter: { label: 'Held-out runs', value: 0 },
              },
              {
                cells: ["dev · 24 cases", "held-out · 12 cases", "prompt v4", "dev 21/24 = 0.875", "held-out 8/12 ≈ 0.67"],
                marks: [{ index: 4, role: 'settled' }],
                note: 'The selected v4 gets 8 of 12 held-out labels right. Report the actual counts and sampling limits. The difference from development performance does not isolate tuning bias or establish statistical significance.',
                counter: { label: 'Held-out runs', value: 1 },
              },
              {
                cells: ["dev · 24 cases", "held-out · 12 cases", "prompt v5", "dev 20/24 ≈ 0.83", "held-out 9/12 = 0.75"],
                marks: [{ index: 4, role: 'excluded' }],
                note: 'Prompt v5 is then selected because its held-out score rises to 9 of 12. Those cases have now influenced model/prompt selection and are development evidence for that decision. A fresh unexposed evaluation is needed for an independent estimate; the old observations remain reportable with their role disclosed.',
                counter: { label: 'Held-out runs', value: 2 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Evaluation contamination occurs when evaluation information influences the system or selection it was intended to assess independently. Re-running an unchanged frozen system to measure variability is not automatically leakage; using the feedback to choose prompts, thresholds or candidates is. Document what was exposed and used, and preserve a genuinely independent evaluation for the claim you need.',
        },
        {
          kind: 'table',
          caption: 'Three contamination or coverage risks, with repairs appropriate to the evidence claim.',
          headers: ['How it happens', 'What it inflates', 'What to do about it'],
          rows: [
            [
              'You run the held-out set after each change and keep the variant that scored best',
              'Selecting from test feedback can bias the reported estimate; the amount is not guaranteed to grow on every added trial',
              'Tune on development data, record assessment exposure and obtain independent evidence when earlier assessment feedback has guided later development',
            ],
            [
              'Few-shot examples in the prompt were copied out of the evaluation set',
              'Exposure to the same labelled examples undermines an independent generalization claim, whether or not the observed score rises',
              'Remove exposed cases/related examples from claims of independent evaluation and obtain fresh unexposed evidence; deleting only known copied cases may not undo broader selection effects',
            ],
            [
              'The same generator produced both the fixtures the system was built against and the cases it is measured on',
              'Shared templates can narrow coverage or introduce related-case overlap; a common generator alone does not prove label leakage',
              'Use independently constructed, appropriately sampled cases for the intended population. Authorized real traffic or carefully separated synthetic cases can be valid; record provenance and limits',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'A shared template may miss useful variation: a keyword rule fitted to “still no credit” might fail on “nobody has refunded me.” That is a coverage risk to test, not proof it must fail or that all synthetic evaluation is invalid. Separate related/template-derived examples and evaluate the intended task population.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'On 12 cases, one changed correctness result is 1/12≈8.33 percentage points. That observed change is real for the sample but may be imprecise evidence about wider performance. Report counts, paired errors, relevant uncertainty and sampling limits; do not call a one-case difference statistically established or meaningless without analysis.',
        },
        {
          kind: 'prose',
          body:
            'Once a defect case has guided a fix, keep it as development/regression evidence. Shipping the fix does not make that known case unseen again. New independent cases may join a future held-out evaluation under a documented separation policy; use an additional untouched set when known test feedback has steered development.',
        },
        {
          kind: 'prose',
          body:
            'Version evaluation definitions, split ids and permitted provenance with the code or an appropriately protected data registry. Keep sensitive source content/access references under the applicable retention and access policy. Labels can change; record who adjudicated them, when and under which policy rather than treating a versioned answer as unquestionable truth.',
        },
      ],
    },
    {
      id: 'fde-v1-m07-l2',
      title: 'Quality against cost and latency',
      summary:
        'Explicit denominators, coverage and conditional quality, observed slice changes, cost/latency distributions and a predeclared comparison policy.',
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
            'Report the metrics needed to assess the agreed quality, coverage, latency and cost objectives. Improvements can trade off, but not every improvement necessarily worsens another metric. Name each denominator, sample and measurement method before comparing candidates.',
        },
        {
          kind: 'table',
          caption: 'The four numbers a candidate is reported on, and what each one leaves out.',
          headers: ['Number', 'What it answers', 'What it cannot tell you'],
          rows: [
            [
              'Correct-answer yield over all cases',
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
              'Total agreed processing cost divided by all input cases; state which costs are included',
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
            'Coverage is the one that hides in plain sight. A system that answers 24 of 36 cases and is right on 22 of them can be reported two ways: 22 of 36, which is 0.61, or 22 of 24, which is 0.92. Both are arithmetic. They measure different quantities; label the denominator and coverage so conditional accuracy is not confused with all-case correct yield.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: 'const report = {\n  total: 36, answered: 24, abstained: 12, correct: 22,\n  accuracy: 0.6111, // this exercise: correct / total, a correct-answer yield\n  coverage: 0.6667, // answered / total\n  accuracyWhenAnswered: 0.9167, // correct / answered, explicitly conditional accuracy\n  costPerCaseUsd: 0.004, // hypothetical included processing cost / total\n  p95LatencyMs: 1840, // hypothetical, with quantile method to be specified\n};',
          caption: 'One authored run with explicit denominators. Conditional accuracy and correct-answer yield differ by about 30.56 percentage points.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Answered-case accuracy is a legitimate metric when labelled and accompanied by coverage. Removing a wrong answer raises it; removing a correct answer can lower it. Abstaining more is not inherently monotonic improvement. With no answers, the conditional ratio has no observations; this exercise returns 0 as an explicit API convention, not evidence of zero quality or calibration. Whether abstention counts as an error is the scoring policy, not a universal definition.',
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
            'Inspect latency distributions as well as any useful mean. For 95 requests at 400 ms and 5 at 30 s, the mean is 1880 ms; nearest-rank p95 is 400 ms and p99 is 30 s. Other quantile conventions can interpolate differently, so name the method and sample size. Include relevant failures/timeouts. Per-request spans can help explain waits/critical paths, but component p95 values do not generally add to endpoint p95 and traces do not automatically contain every measurement.',
        },
        {
          kind: 'prose',
          body:
            'If included total cost is fixed, dividing by fewer answered cases makes cost per answered case higher than cost per input case, not lower. Compare actual totals and denominators; abstention may change processing cost and operator work. A handoff may still save part of the work, so measure operator time rather than assuming every abstention yields zero benefit.',
        },
        {
          kind: 'table',
          caption: 'An authored candidate comparison on the same fixed cases.',
          headers: ['Candidate', 'Accuracy · coverage', 'Cost and p95', 'What it argues'],
          rows: [
            [
              'Keyword router, 40 rules',
              '0.75 · 1.00',
              '0.0000 USD displayed · 12 ms',
              'The authored baseline for the stated evaluation; compare all agreed objectives, not only speed and per-call cost',
            ],
            [
              'Single model call, no retrieval',
              '0.83 · 1.00',
              '0.0035 USD · 900 ms',
              'About 8.33 percentage points on this sample for a hypothetical 0.35 US cents and 900 ms per ticket',
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
            'The rule baseline is a serious candidate, but displayed 0.0000 USD is a rounded hypothetical included cost, not proof of zero compute/maintenance cost. The 12 ms figure is authored here, not a universal deterministic latency. Decide whether a candidate meets the actual quality, coverage, auditability and latency objectives; a 200 ms constraint alone does not establish every part of a release decision.',
        },
        {
          kind: 'prose',
          body:
            'Choose the comparison rule before seeing results. This exercise first rejects a coverage loss greater than 0.05, then prefers a correct-yield gain greater than 0.01 or the baseline for a loss below -0.01; otherwise it ties. A 0.05 rate difference is five percentage points and 0.01 is one percentage point. These are percentage-point differences in rates, not significance tests or universal release rules. Matching slice names is necessary for this summary comparison but cannot prove matching case ids, labels or sampling windows; verify those upstream. Report regressions and uncertainty even when the toy rule selects a candidate.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Costs/latencies here are authored figures, not measured provider prices or realistic-performance guarantees. Measure the full candidates, state included costs and operator effort, and re-evaluate when inputs, provider, model, prompt, policy or retrieval change.',
        },
        {
          kind: 'prose',
          body:
            'State the limits below the report: these 36 authored cases are not a measured representative production sample. Even a real fixed evaluation cannot guarantee performance on unseen ticket types, different source/index conditions or future model versions. Its evidence has a scope, uncertainty and date; document those before generalizing.',
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
      summary: 'Label policy, representative versus regression cases, recorded independent partitions and contamination limits.',
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
      summary: 'Explicit metric denominators, abstention behavior, slice changes, quantile methods and a bounded comparison policy.',
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
        'Four evaluation decisions: explicit leakage, correctly labelled yield/error/abstention counts, aggregate-versus-slice observations and conditional quality alongside coverage.',
      competencies: ['evaluation'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-m07-q1',
          prompt: "Each team compares a candidate router with its deterministic baseline. Assume the stated pre-tuning splits keep related ticket groups separate. Which report explicitly uses evaluation labels/examples to tune the candidate before reporting that same set?",
          options: ["Team A split 30 rerouted-ticket cases into 20 development and 10 untouched test cases before tuning, then reported the 10.", "Team B reported a two-case win on 12 held-out cases, without further uncertainty analysis.", "Team C copied eight hard evaluation cases and their answers into the prompt, then reported performance on that evaluation set.", "Team D compared with a keyword router despite saying a non-model baseline is unfair."],
          correct: 2,
          explanation: "Team C directly supplies evaluated examples/answers to the candidate, so the reported set is no longer untouched evidence of generalization. Move those examples to development and obtain fresh unexposed evaluation data; removing only the eight does not automatically erase feedback or selection influence on the rest. Team A has a disjoint pre-tuning split under the stated assumption, though rerouted-ticket selection and a 10-case test limit its representativeness and precision. Team B raises sample-size/uncertainty questions, but a two-case difference alone does not prove leakage or establish its significance. Team D is a legitimate task baseline; compare agreed quality, critical errors, cost and latency rather than assuming a model must win because it uses language.",
          competencies: ['evaluation'],
        },
        {
          id: 'fde-v1-m07-q2',
          prompt: "Coverage is 60% and accuracy among answered cases is 95%. For a hypothetical 400-ticket batch at those rates, which report gives the expected correct automatic decisions, wrong automatic decisions and abstentions? This arithmetic alone does not approve unattended closure.",
          options: ["95% alone, because it is the fraction correct among the answers.", "40% abstention alone, because it is the work not answered automatically.", "57% correct-answer yield: 228 correct automatic decisions, 12 wrong decisions and 160 abstentions.", "p95 latency alone, because faster responses are automatically correct."],
          correct: 2,
          explanation: "Of 400 tickets, 0.60×400=240 are answered. Of those, 0.95×240=228 are correct and 12 are wrong; 160 are not answered. Thus coverage×conditional accuracy gives 0.57 correct-answer yield over all tickets, not a guarantee that 228 unattended closures are safe. Error tolerance, failure impact and latency remain separate acceptance decisions. Conditional accuracy alone omits how often the system answers, while abstention alone omits the quality of those answers. These counts follow the hypothetical rates; measured finite samples do not guarantee identical daily production counts.",
          competencies: ['evaluation'],
        },
        {
          id: 'fde-v1-m07-q3',
          prompt: "The same held-out set has 12 cases each for billing, delivery and returns. Baseline→candidate correct counts are 8→11, 9→12 and 10→7. Overall that is 27/36→30/36 (75%→83.3%). How should these observations be read together?",
          options: ["The aggregate must be wrong because one slice regressed.", "Report the observed aggregate gain and returns regression, then assess slice criteria and uncertainty before release.", "Ignore returns because a three-case change on 12 cases is necessarily noise.", "Omit returns because it did not improve the headline number."],
          correct: 1,
          explanation: "Billing gains 3 correct and delivery gains 3, while returns loses 3: net +3, from 27 to 30. Equivalently there are 6 fewer billing/delivery errors and 3 more returns errors on this sample. The aggregate can improve while a slice worsens. Report both, including counts and uncertainty, rather than declaring a guaranteed production tradeoff or dismissing the slice as noise. Twelve cases can motivate investigation without by themselves establishing a population regression or its absence. Apply the agreed critical-slice and overall criteria and collect suitable additional evidence where needed.",
          competencies: ['evaluation'],
        },
        {
          id: 'fde-v1-m07-q4',
          prompt: "On 36 held-out cases, A answers 36 with 27 correct. B answers 24 with 22 correct. Why must coverage/abstention accompany their answered-case accuracy?",
          options: ["B’s 22/24≈91.7% describes its answered subset; also report 24/36 coverage and 22/36 correct-answer yield.", "Because an abstention always costs more than an answer.", "Because more abstention proves better confidence calibration.", "Because abstentions must always be errors and 22/36 is the only honest metric."],
          correct: 0,
          explanation: "A has 75% conditional accuracy, 100% coverage and 75% correct-answer yield. B has about 91.7% conditional accuracy, 66.7% coverage and 61.1% yield, with 12 abstentions. B is more accurate on its selected answers, while A gets more of all 36 cases correct. Rejecting additional cases can raise or lower conditional accuracy depending on which cases are rejected; it is not automatically monotonic. A refusal-all system has undefined answered-case accuracy, not proof of calibration. Whether abstention counts as an error or a handoff cost depends on the evaluation/workflow definition, so label the metrics and report both coverage and conditional quality.",
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
          'Marlbrook’s held-out set holds 36 support tickets, twelve in each of three slices — `billing`, `delivery` and `returns` — and each case records the queue an operator agreed it belongs in. You are writing the two functions the release check runs over it.\n\n**`evaluate(cases, predictions)`** returns one report:\n\n`{ total, answered, abstained, correct, accuracy, coverage, accuracyWhenAnswered, bySlice }`\n\n`cases` is an array of `{ id, slice, expected }`. `predictions` is an array of `{ caseId, answer }`. Count like this:\n\n1. **Every case counts once**, whether or not a prediction exists for it. A case with no prediction is an abstention, not a missing row.\n2. **First prediction wins.** A second prediction for the same `caseId` is ignored, whatever it says. The pipeline delivers duplicates.\n3. **A prediction whose `caseId` matches no case is ignored.** It came from another run.\n4. **An answer counts as answered only when it is a string that is non-empty after trimming.** `null`, `undefined`, a number, an object and `\'   \'` are all abstentions.\n5. `accuracy` is `correct / total`, so an abstention counts against you. `coverage` is `answered / total`. `accuracyWhenAnswered` is `correct / answered`. Report `0` for any of them when the denominator is `0`.\n6. **Round every rate** with `Math.round(value * 10000) / 10000`. Counts stay integers.\n7. `bySlice` maps each slice name to an object with the same seven fields, over that slice’s cases only. A case whose `slice` is not a non-empty string joins the slice named `unlabelled`.\n8. A `cases` that is not an array gives a report of zeros with an empty `bySlice`. A `predictions` that is not an array means everything abstained.\n\n**`compare(baseline, candidate)`** takes two of those reports and returns:\n\n`{ better, accuracyDelta, coverageDelta, regressedSlices, sliceMismatch, aggregateHidesRegression }`\n\n- If either argument is not a usable report — not an object, or missing `bySlice`, `accuracy` or `coverage` — return `better: \'not-comparable\'` with both deltas `0` and both arrays empty and aggregateHidesRegression:false. A usable report is a non-array ordinary object with finite accuracy/coverage rates in [0,1] and an ordinary non-array bySlice map whose own entries are non-array objects with finite accuracy in [0,1].\n- `sliceMismatch` lists, sorted ascending, every slice name present in one report and not the other. If it is non-empty the summary partitions differ under this comparison policy, so return `better: \'not-comparable\'`, both deltas `0` and `regressedSlices: []`, keeping the mismatch list.\n- Otherwise `accuracyDelta` is `candidate.accuracy - baseline.accuracy` and `coverageDelta` is `candidate.coverage - baseline.coverage`, each computed from the already-rounded rates and rounded again the same way.\n- `regressedSlices` holds one `{ slice, baselineAccuracy, candidateAccuracy, delta }` for every slice whose accuracy fell, sorted by slice name ascending. `delta` is candidate minus baseline, rounded.\n- **The rule for `better`, applied in this order:** `coverageDelta < -0.05` gives `\'baseline\'`, because a candidate that answers far less has bought its accuracy by handing work back. Then `accuracyDelta > 0.01` gives `\'candidate\'`, `accuracyDelta < -0.01` gives `\'baseline\'`, and anything left is `\'tie\'`.\n- `aggregateHidesRegression` is `true` when `better` is `\'candidate\'` or `\'tie\'` and `regressedSlices` is not empty. That is the flag: the aggregate did not lose, and at least one slice did.\n\nOne fixture matters more than the others. `__predictions(\'candidate\')` beats `__predictions(\'baseline\')` 30 correct to 27 while its returns slice falls from 10 of 12 to 7 of 12, so a comparison that only reads the aggregate reports a clean win while the observed returns count regresses. Slice-name equality alone does not establish identical case ids/labels or a valid statistical comparison; callers must verify dataset identity upstream.\n\nDomain: at most 1,000 ordinary case objects with unique non-empty string ids and string expected labels; unusable slice values join unlabelled. Predictions contain at most 2,000 ordinary values, with malformed entries ignored as described. Strings have at most 100 UTF-16 code units; no getters/proxies. Correctness compares the original answer string exactly to expected; trimming decides only whether an answer is non-empty. Preserve arbitrary valid ids and slice names, including __proto__. Comparison inputs follow the usable-report shape or are rejected and never mutated.\n\nTarget: O(n log n) time, where n is the combined input entry/slice count for each operation, using bounded-length fields and the usual dictionary/set model.\n\n`__cases`, `__predictions`, `__CASE_ROWS` and `__PATTERNS` come from the task harness. Every case, label and prediction in them is authored for this exercise and identical on every run. Nothing here calls a model or opens a network connection, and a fixture accuracy is not evidence about how a live router would score these tickets.',
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

// Scratch pad — change this before submitting.
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
