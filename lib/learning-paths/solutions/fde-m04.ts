/** Server-only reference solution and hidden assertions for FDE M04.
 * Never imported from client code, and never from `../catalog`.
 *
 * The visible assertions cover the seven fixtures the prompt names. The
 * hidden ones reach what those leave open: inputs that are not strings at
 * all, an empty string, a confidence that is a string rather than a number,
 * a padded ticket id, both ends of the accepted confidence range, a
 * confidence below zero, a category that differs from an allowed one only by
 * case, a required field that is absent rather than null, and a response
 * whose extra field carries an instruction the validator has to drop like
 * any other extra field.
 *
 * `no-crash` and `range-checks` are critical criteria in the authored task,
 * so an input that throws and a value that parses but is out of range both
 * fail the activity outright rather than being averaged away. */

import type { PathCodeSolution } from '../types';

export const FDE_M04_SOLUTIONS: Record<string, PathCodeSolution> = {
  'fde-v1-m04-structured-output-validator': {
    solution: `const CATEGORIES = ['billing', 'bug', 'how-to', 'other'];

const validateTriage = raw => {
  if (typeof raw !== 'string') return { ok: false, reason: 'not-a-string' };

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end < start) return { ok: false, reason: 'no-json-object' };

  let parsed;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch (error) {
    return { ok: false, reason: 'unparsable-json' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'wrong-type' };
  }

  if (parsed.ticketId === undefined || parsed.ticketId === null) return { ok: false, reason: 'missing-field' };
  if (typeof parsed.ticketId !== 'string') return { ok: false, reason: 'wrong-type' };
  const ticketId = parsed.ticketId.trim();
  if (ticketId === '') return { ok: false, reason: 'missing-field' };

  if (parsed.category === undefined || parsed.category === null) return { ok: false, reason: 'missing-field' };
  if (typeof parsed.category !== 'string') return { ok: false, reason: 'wrong-type' };
  const category = parsed.category.trim();
  if (category === '') return { ok: false, reason: 'missing-field' };
  if (!CATEGORIES.includes(category)) return { ok: false, reason: 'unknown-category' };

  const confidence = parsed.confidence;
  if (confidence === undefined || confidence === null) return { ok: false, reason: 'missing-field' };
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) return { ok: false, reason: 'wrong-type' };
  if (confidence < 0 || confidence > 1) return { ok: false, reason: 'confidence-out-of-range' };

  return { ok: true, decision: { ticketId: ticketId, category: category, confidence: confidence } };
};`,
    hiddenTests: [
      {
        call:
          '[validateTriage(undefined), validateTriage(42), validateTriage({ ticketId: "TCK-1004", category: "bug", confidence: 0.82 })]',
        expected: [
          { ok: false, reason: 'not-a-string' },
          { ok: false, reason: 'not-a-string' },
          { ok: false, reason: 'not-a-string' },
        ],
        criterion: 'no-crash',
      },
      { call: "validateTriage('')", expected: { ok: false, reason: 'no-json-object' }, criterion: 'no-crash' },
      {
        call: '[validateTriage(__RAW.stringConfidence), validateTriage(__RAW.padded)]',
        expected: [
          { ok: false, reason: 'wrong-type' },
          { ok: true, decision: { ticketId: 'TCK-1004', category: 'bug', confidence: 0.5 } },
        ],
      },
      {
        call: '[validateTriage(__RAW.edgeLow), validateTriage(__RAW.edgeHigh)]',
        expected: [
          { ok: true, decision: { ticketId: 'TCK-1002', category: 'other', confidence: 0 } },
          { ok: true, decision: { ticketId: 'TCK-1002', category: 'other', confidence: 1 } },
        ],
        criterion: 'range-checks',
      },
      { call: 'validateTriage(__RAW.negative)', expected: { ok: false, reason: 'confidence-out-of-range' }, criterion: 'range-checks' },
      { call: 'validateTriage(__RAW.capitalCategory)', expected: { ok: false, reason: 'unknown-category' }, criterion: 'range-checks' },
      { call: 'validateTriage(__RAW.noCategory)', expected: { ok: false, reason: 'missing-field' } },
      {
        call: 'validateTriage(__RAW.injected)',
        expected: { ok: true, decision: { ticketId: 'TCK-1004', category: 'billing', confidence: 0.61 } },
      },
    ],
  },
};
