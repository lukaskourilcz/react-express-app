/** Server-only reference solution and hidden assertions for FDE M07.
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible tests show each rule working on a fixture built to exercise it.
 * The hidden ones aim at what those leave open: a comparison of a run against
 * itself, a candidate that improves every slice and must not raise the flag, a
 * tie that hides a regression and must, duplicate delivery of every
 * prediction, a whole run of prediction ids belonging to another set, a run of
 * malformed answers, a case with no slice label, and a `compare` handed
 * something that is not a report. The three declared criteria are all
 * critical, so a working aggregate can never average away a buried slice or a
 * hidden abstention. */

import type { PathCodeSolution } from '../types';

const METRICS = `const round4 = value => Math.round(value * 10000) / 10000;
const rate = (part, whole) => (whole > 0 ? round4(part / whole) : 0);

const evaluate = (cases, predictions) => {
  const caseList = Array.isArray(cases) ? cases : [];
  const predictionList = Array.isArray(predictions) ? predictions : [];

  const answers = {};
  for (const prediction of predictionList) {
    if (!prediction || typeof prediction !== 'object') continue;
    const caseId = prediction.caseId;
    if (typeof caseId !== 'string') continue;
    if (Object.prototype.hasOwnProperty.call(answers, caseId)) continue;
    answers[caseId] = prediction.answer;
  }

  const tally = () => ({ total: 0, answered: 0, abstained: 0, correct: 0 });
  const overall = tally();
  const slices = {};

  for (const item of caseList) {
    if (!item || typeof item !== 'object') continue;
    const name = typeof item.slice === 'string' && item.slice.trim() !== '' ? item.slice : 'unlabelled';
    if (!Object.prototype.hasOwnProperty.call(slices, name)) slices[name] = tally();
    const slice = slices[name];
    overall.total += 1;
    slice.total += 1;
    const answer = typeof item.id === 'string' && Object.prototype.hasOwnProperty.call(answers, item.id)
      ? answers[item.id]
      : null;
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

  const bySlice = {};
  for (const name of Object.keys(slices).sort()) bySlice[name] = shape(slices[name]);
  return { ...shape(overall), bySlice };
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
  const usable = report => Boolean(report) && typeof report === 'object'
    && Boolean(report.bySlice) && typeof report.bySlice === 'object'
    && typeof report.accuracy === 'number' && typeof report.coverage === 'number';
  if (!usable(baseline) || !usable(candidate)) return blank;

  const baseNames = Object.keys(baseline.bySlice);
  const candidateNames = Object.keys(candidate.bySlice);
  const mismatch = baseNames.filter(name => candidateNames.indexOf(name) === -1)
    .concat(candidateNames.filter(name => baseNames.indexOf(name) === -1))
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
