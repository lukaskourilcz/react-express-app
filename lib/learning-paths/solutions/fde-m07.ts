/** Server-only reference solution and hidden assertions for FDE M07, the
 * module learners see as "Evaluation" (curriculum v2 numbers it M09).
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible tests show each rule working on a fixture built to exercise it.
 * The hidden ones aim at what those leave open: a comparison of a run against
 * itself, a candidate that improves every slice and must not raise the flag, a
 * tie that hides a regression and must, duplicate delivery of every
 * prediction, a whole run of prediction ids belonging to another set, a run of
 * malformed answers, a case with no slice label, a `compare` handed something
 * that is not a report, cost and latency figures that are not usable numbers,
 * and wrong answers whose traces point at retrieval, the tool, the generation
 * step or nothing at all. The slice and abstention criteria are critical, so a
 * working aggregate can never average away a buried slice or a hidden
 * abstention. */

import type { PathCodeSolution } from '../types';

const METRICS = `const round4 = value => Math.round(value * 10000) / 10000;
const rate = (part, whole) => (whole > 0 ? round4(part / whole) : 0);

const evaluate = (cases, predictions) => {
  const caseList = Array.isArray(cases) ? cases : [];
  const predictionList = Array.isArray(predictions) ? predictions : [];

  const answers = Object.create(null);
  for (const prediction of predictionList) {
    if (!prediction || typeof prediction !== 'object') continue;
    const caseId = prediction.caseId;
    if (typeof caseId !== 'string') continue;
    if (Object.prototype.hasOwnProperty.call(answers, caseId)) continue;
    answers[caseId] = prediction;
  }

  const usable = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const classify = (item, entry) => {
    const retrieved = Array.isArray(entry.retrieved) ? entry.retrieved : null;
    const tool = typeof entry.tool === 'string' ? entry.tool : null;
    if (retrieved === null && tool === null) return 'unclassified';
    if (retrieved !== null && typeof item.sourceId === 'string' && retrieved.indexOf(item.sourceId) === -1) return 'retrievalMiss';
    if (tool !== null && typeof item.tool === 'string' && tool !== item.tool) return 'toolMisuse';
    return 'hallucination';
  };

  const tally = () => ({ total: 0, answered: 0, abstained: 0, correct: 0 });
  const overall = tally();
  const slices = Object.create(null);
  const failures = { retrievalMiss: 0, toolMisuse: 0, hallucination: 0, unclassified: 0 };
  const latencies = [];
  let cost = 0;

  for (const item of caseList) {
    if (!item || typeof item !== 'object') continue;
    const name = typeof item.slice === 'string' && item.slice !== '' ? item.slice : 'unlabelled';
    if (!Object.prototype.hasOwnProperty.call(slices, name)) slices[name] = tally();
    const slice = slices[name];
    overall.total += 1;
    slice.total += 1;
    const entry = typeof item.id === 'string' && Object.prototype.hasOwnProperty.call(answers, item.id)
      ? answers[item.id]
      : null;
    if (entry) {
      if (usable(entry.costCents)) cost += entry.costCents;
      if (usable(entry.latencyMs)) latencies.push(entry.latencyMs);
    }
    const answer = entry ? entry.answer : null;
    if (typeof answer !== 'string' || answer.trim() === '') {
      overall.abstained += 1;
      slice.abstained += 1;
      continue;
    }
    overall.answered += 1;
    slice.answered += 1;
    if (answer === item.expected) {
      overall.correct += 1;
      slice.correct += 1;
    } else {
      failures[classify(item, entry)] += 1;
    }
  }

  const shape = counts => ({
    total: counts.total,
    answered: counts.answered,
    abstained: counts.abstained,
    correct: counts.correct,
    accuracy: rate(counts.correct, counts.total),
    coverage: rate(counts.answered, counts.total),
    accuracyWhenAnswered: rate(counts.correct, counts.answered),
  });

  latencies.sort((a, b) => a - b);
  const p95LatencyMs = latencies.length > 0 ? latencies[Math.ceil(0.95 * latencies.length) - 1] : 0;

  const bySlice = Object.create(null);
  for (const name of Object.keys(slices).sort()) bySlice[name] = shape(slices[name]);
  return {
    ...shape(overall),
    costPerRequestCents: rate(cost, overall.total),
    p95LatencyMs,
    failures,
    bySlice,
  };
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
  const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const validRate = value => Number.isFinite(value) && value >= 0 && value <= 1;
  const usable = report => object(report) && object(report.bySlice)
    && validRate(report.accuracy) && validRate(report.coverage)
    && Object.keys(report.bySlice).every(name => object(report.bySlice[name]) && validRate(report.bySlice[name].accuracy));
  if (!usable(baseline) || !usable(candidate)) return blank;

  const baseNames = Object.keys(baseline.bySlice);
  const candidateNames = Object.keys(candidate.bySlice);
  const baseSet = new Set(baseNames), candidateSet = new Set(candidateNames);
  const mismatch = baseNames.filter(name => !candidateSet.has(name))
    .concat(candidateNames.filter(name => !baseSet.has(name)))
    .sort();
  if (mismatch.length > 0) return { ...blank, sliceMismatch: mismatch };

  const accuracyDelta = round4(candidate.accuracy - baseline.accuracy);
  const coverageDelta = round4(candidate.coverage - baseline.coverage);

  const regressedSlices = baseNames.slice().sort()
    .map(name => ({
      slice: name,
      baselineAccuracy: baseline.bySlice[name].accuracy,
      candidateAccuracy: candidate.bySlice[name].accuracy,
      delta: round4(candidate.bySlice[name].accuracy - baseline.bySlice[name].accuracy),
    }))
    .filter(entry => entry.candidateAccuracy < entry.baselineAccuracy);

  let better;
  if (coverageDelta < -0.05) better = 'baseline';
  else if (accuracyDelta > 0.01) better = 'candidate';
  else if (accuracyDelta < -0.01) better = 'baseline';
  else better = 'tie';

  return {
    better,
    accuracyDelta,
    coverageDelta,
    regressedSlices,
    sliceMismatch: [],
    aggregateHidesRegression: (better === 'candidate' || better === 'tie') && regressedSlices.length > 0,
  };
};`;

export const FDE_M07_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m07-evaluation-metrics': {
    solution: METRICS,
    hiddenTests: [
      {"call": "(function(){var r=evaluate([{id:'__proto__',slice:'__proto__',expected:'yes'},{id:'constructor',slice:'constructor',expected:'yes'}],[{caseId:'__proto__',answer:'yes'},{caseId:'constructor',answer:'yes'}]);return {total:r.total,correct:r.correct,keys:Object.keys(r.bySlice).sort(),proto:Object.prototype.hasOwnProperty.call(r.bySlice,'__proto__')&&r.bySlice.__proto__.correct};})()", "expected": {"total": 2, "correct": 2, "keys": ["__proto__", "constructor"], "proto": 1}},
      {"call": "[compare({accuracy:NaN,coverage:1,bySlice:{}},{accuracy:0.5,coverage:1,bySlice:{}}),compare({accuracy:0.5,coverage:1,bySlice:{x:null}},{accuracy:0.5,coverage:1,bySlice:{x:{accuracy:0.5}}}),compare({accuracy:0.5,coverage:1,bySlice:{x:{accuracy:Infinity}}},{accuracy:0.5,coverage:1,bySlice:{x:{accuracy:0.5}}})]", "expected": [{"better": "not-comparable", "accuracyDelta": 0, "coverageDelta": 0, "regressedSlices": [], "sliceMismatch": [], "aggregateHidesRegression": false}, {"better": "not-comparable", "accuracyDelta": 0, "coverageDelta": 0, "regressedSlices": [], "sliceMismatch": [], "aggregateHidesRegression": false}, {"better": "not-comparable", "accuracyDelta": 0, "coverageDelta": 0, "regressedSlices": [], "sliceMismatch": [], "aggregateHidesRegression": false}]},
      {"call": "(function(){var cases=Object.freeze([Object.freeze({id:'A',slice:'s',expected:'yes'}),Object.freeze({id:'B',slice:'s',expected:'yes'})]);var predictions=Object.freeze([Object.freeze({caseId:'A',answer:null}),Object.freeze({caseId:'A',answer:'yes'}),Object.freeze({caseId:'B',answer:' yes '})]);var r=evaluate(cases,predictions);return {total:r.total,answered:r.answered,correct:r.correct,abstained:r.abstained,accuracy:r.accuracy,coverage:r.coverage};})()", "expected": {"total": 2, "answered": 1, "correct": 0, "abstained": 1, "accuracy": 0, "coverage": 0.5}},
      {"call": "(function(){var cases=[],predictions=[];for(var i=0;i<1000;i++){cases.push({id:'C'+i,slice:'s'+i,expected:'y'});predictions.push({caseId:'C'+i,answer:'y'});}for(var j=0;j<1000;j++)predictions.push({caseId:'C'+j,answer:'wrong'});var r=evaluate(cases,predictions);var c=compare(r,r);return {total:r.total,correct:r.correct,slices:Object.keys(r.bySlice).length,better:c.better,regressions:c.regressedSlices.length};})()", "expected": {"total": 1000, "correct": 1000, "slices": 1000, "better": "tie", "regressions": 0}},
      {"call": "(function(){var b=Object.freeze({accuracy:0.5,coverage:1,bySlice:Object.freeze({x:Object.freeze({accuracy:0.5})})});var c=Object.freeze({accuracy:0.51,coverage:0.95,bySlice:Object.freeze({x:Object.freeze({accuracy:0.51})})});return compare(b,c);})()", "expected": {"better": "tie", "accuracyDelta": 0.01, "coverageDelta": -0.05, "regressedSlices": [], "sliceMismatch": [], "aggregateHidesRegression": false}},

      {
        call:
          "(function () { var b = evaluate(__cases(), __predictions('baseline')); var r = compare(b, evaluate(__cases(), __predictions('baseline'))); return { better: r.better, accuracyDelta: r.accuracyDelta, coverageDelta: r.coverageDelta, regressedSlices: r.regressedSlices, aggregateHidesRegression: r.aggregateHidesRegression }; })()",
        expected: {
          better: 'tie',
          accuracyDelta: 0,
          coverageDelta: 0,
          regressedSlices: [],
          aggregateHidesRegression: false,
        },
      },
      {
        call:
          "(function () { var b = evaluate(__cases(), __predictions('baseline')); var c = evaluate(__cases(), __predictions('uniform')); var r = compare(b, c); return { better: r.better, accuracyDelta: r.accuracyDelta, regressedSlices: r.regressedSlices, aggregateHidesRegression: r.aggregateHidesRegression }; })()",
        expected: {
          better: 'candidate',
          accuracyDelta: 0.1111,
          regressedSlices: [],
          aggregateHidesRegression: false,
        },
        criterion: 'slice-aware',
      },
      {
        call:
          "(function () { var b = evaluate(__cases(), __predictions('baseline')); var c = evaluate(__cases(), __predictions('reshuffle')); var r = compare(b, c); return { better: r.better, accuracyDelta: r.accuracyDelta, regressedSlices: r.regressedSlices, aggregateHidesRegression: r.aggregateHidesRegression }; })()",
        expected: {
          better: 'tie',
          accuracyDelta: 0,
          regressedSlices: [{ slice: 'delivery', baselineAccuracy: 0.75, candidateAccuracy: 0.6667, delta: -0.0833 }],
          aggregateHidesRegression: true,
        },
        criterion: 'slice-aware',
      },
      {
        call:
          "JSON.stringify(evaluate(__cases(), __predictions('duplicate'))) === JSON.stringify(evaluate(__cases(), __predictions('baseline')))",
        expected: true,
      },
      {
        call:
          "(function () { var r = evaluate(__cases(), __predictions('foreign')); return { total: r.total, answered: r.answered, abstained: r.abstained, correct: r.correct, accuracy: r.accuracy, accuracyWhenAnswered: r.accuracyWhenAnswered }; })()",
        expected: { total: 36, answered: 0, abstained: 36, correct: 0, accuracy: 0, accuracyWhenAnswered: 0 },
      },
      {
        call:
          "(function () { var r = evaluate(__cases(), __predictions('malformed')); return { answered: r.answered, abstained: r.abstained, accuracy: r.accuracy, coverage: r.coverage, accuracyWhenAnswered: r.accuracyWhenAnswered }; })()",
        expected: { answered: 0, abstained: 36, accuracy: 0, coverage: 0, accuracyWhenAnswered: 0 },
        criterion: 'abstention-separate',
      },
      {
        call:
          "(function () { var cases = __cases().map(function (item, index) { return index < 3 ? { id: item.id, expected: item.expected } : item; }); var r = evaluate(cases, __predictions('baseline')); return { keys: Object.keys(r.bySlice).sort(), unlabelled: r.bySlice.unlabelled }; })()",
        expected: {
          keys: ['billing', 'delivery', 'returns', 'unlabelled'],
          unlabelled: { total: 3, answered: 3, abstained: 0, correct: 3, accuracy: 1, coverage: 1, accuracyWhenAnswered: 1 },
        },
        criterion: 'slice-aware',
      },
      /* ── cost per request and p95 latency beside quality ──────────────── */
      {
        call: "(function () { var cases = [{ id: 'A', slice: 's', expected: 'x' }, { id: 'B', slice: 's', expected: 'x' }, { id: 'C', slice: 's', expected: 'x' }, { id: 'D', slice: 's', expected: 'x' }]; var predictions = [{ caseId: 'A', answer: 'x', costCents: 1, latencyMs: 100 }, { caseId: 'A', answer: 'x', costCents: 50, latencyMs: 9000 }, { caseId: 'B', answer: null, costCents: 3, latencyMs: 300 }, { caseId: 'C', answer: 'x', costCents: NaN, latencyMs: -5 }, { caseId: 'D', answer: 'x', costCents: '5', latencyMs: '7000' }, { caseId: 'Z', answer: 'x', costCents: 80, latencyMs: 7000 }]; var r = evaluate(cases, predictions); return { cost: r.costPerRequestCents, p95: r.p95LatencyMs }; })()",
        expected: { cost: 1, p95: 300 },
        criterion: 'cost-latency',
      },
      {
        call: "(function () { var cases = [], predictions = []; for (var i = 1; i <= 20; i++) { cases.push({ id: 'C' + i, slice: 's', expected: 'x' }); predictions.push({ caseId: 'C' + i, answer: 'x', latencyMs: (21 - i) * 100, costCents: 0.1 }); } var r = evaluate(cases, predictions); var one = evaluate([{ id: 'A', slice: 's', expected: 'x' }], [{ caseId: 'A', answer: 'x', latencyMs: 42 }]); var none = evaluate(cases, 'not an array'); return { p95: r.p95LatencyMs, cost: r.costPerRequestCents, one: one.p95LatencyMs, none: [none.p95LatencyMs, none.costPerRequestCents] }; })()",
        expected: { p95: 1900, cost: 0.1, one: 42, none: [0, 0] },
        criterion: 'cost-latency',
      },

      /* ── the failure taxonomy reads the trace in a fixed order ─────────── */
      {
        call: "(function () { var row = function (id, sourceId) { var item = { id: id, slice: 's', expected: 'tier-1', tool: 'queue.assign' }; if (sourceId) item.sourceId = sourceId; return item; }; var cases = [row('A', 'KB-1'), row('B', 'KB-1'), row('C', 'KB-1'), row('D', 'KB-1'), row('E', null), row('F', 'KB-1'), row('G', 'KB-1'), row('H', 'KB-1')]; var predictions = [{ caseId: 'A', answer: 'ops', retrieved: ['KB-2'], tool: 'refunds.create' }, { caseId: 'B', answer: 'ops', retrieved: ['KB-1'], tool: 'refunds.create' }, { caseId: 'C', answer: 'ops', tool: 'refunds.create' }, { caseId: 'D', answer: 'ops', retrieved: ['KB-1'], tool: 'queue.assign' }, { caseId: 'E', answer: 'ops', retrieved: ['KB-9'], tool: 'queue.assign' }, { caseId: 'F', answer: 'ops', retrieved: 'KB-1' }, { caseId: 'G', answer: 'tier-1', retrieved: [] }, { caseId: 'H', answer: null, retrieved: [] }]; return evaluate(cases, predictions).failures; })()",
        expected: { retrievalMiss: 1, toolMisuse: 2, hallucination: 2, unclassified: 1 },
        criterion: 'failure-taxonomy',
      },
      {
        call: "(function () { var messy = evaluate(__cases(), __predictions('messy')).failures; var cautious = evaluate(__cases(), __predictions('cautious')).failures; var none = evaluate(__cases(), null).failures; return { messy: messy, cautious: cautious, none: none }; })()",
        expected: {
          messy: { retrievalMiss: 0, toolMisuse: 0, hallucination: 0, unclassified: 4 },
          cautious: { retrievalMiss: 0, toolMisuse: 1, hallucination: 1, unclassified: 0 },
          none: { retrievalMiss: 0, toolMisuse: 0, hallucination: 0, unclassified: 0 },
        },
        criterion: 'failure-taxonomy',
      },
      {
        call: "compare(null, evaluate(__cases(), __predictions('baseline')))",
        expected: {
          better: 'not-comparable',
          accuracyDelta: 0,
          coverageDelta: 0,
          regressedSlices: [],
          sliceMismatch: [],
          aggregateHidesRegression: false,
        },
      },
    ],
  },
};
