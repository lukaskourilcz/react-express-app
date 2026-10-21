import assert from 'node:assert/strict';
import * as webdevBank from '../lib/webdev-bank';

/* ── the webdev-bank contract BoardlessAI imports (#218) ──────────────────
 *
 * marketingShark in lukaskourilcz/quorum reads exactly one surface of this
 * repository: `lib/webdev-bank.ts`, through
 * `orchestrator/src/ventures/marketingshark/react-express-app-adapter.ts`,
 * into a pinned snapshot (`state/marketingshark/question-banks/devshark.json`).
 * The adapter imports the two loaders by name and reads the fields below.
 * Its schema drops or rejects anything else, so a renamed or retyped field
 * here would break devShark's only marketing channel without a compile error
 * on either side. These assertions mirror what the adapter reads. When one
 * fails, fix the bank, or change the adapter upstream and re-import with
 * `--check` before changing this test. */

/** The loaders the adapter imports by name. devShark ships English only
 * (#485), so `loadWebdevTranslations` resolves to an empty record; it stays
 * exported because the adapter still imports it by name. */
const EXPORTS = ['loadWebdevQuestions', 'loadWebdevTranslations'] as const;

/** The upstream `FENCED_CODE` in `marketingshark/bank.ts`. `hasFencedCode`
 * tests it against the English `question` and `introduction` and nothing
 * else, and the result becomes the snapshot's `hasCode`. */
const FENCED_CODE = /```/;

const isString = (value: unknown): value is string => typeof value === 'string';
const isNonEmptyString = (value: unknown): value is string => isString(value) && value.length > 0;
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);

export async function webdevBankContracts() {
  for (const name of EXPORTS) {
    assert.equal(typeof webdevBank[name], 'function', `lib/webdev-bank.ts must export ${name}; BoardlessAI imports it by name`);
  }

  const questions: unknown = await webdevBank.loadWebdevQuestions();
  const translations: unknown = await webdevBank.loadWebdevTranslations();
  assert.ok(Array.isArray(questions) && questions.length > 0, 'loadWebdevQuestions resolves to a non-empty array');
  assert.deepEqual(translations, {}, 'loadWebdevTranslations resolves to an empty record: there is no second language');

  const seen = new Set<string>();
  let fenced = 0;
  for (const entry of questions as Array<Record<string, unknown>>) {
    const id = entry.id;
    assert.ok(isNonEmptyString(id), 'every question has a non-empty string id');
    const where = `question ${id}`;
    // The adapter keeps the first occurrence of an id and drops the rest, so a
    // duplicate is a question the snapshot can never serve.
    assert.ok(!seen.has(id), `${where} appears twice; the importer would drop the second`);
    seen.add(id);

    assert.ok(isNonEmptyString(entry.question), `${where}: question is a non-empty string`);
    assert.ok(isNonEmptyString(entry.category), `${where}: category is a non-empty string`);
    // The adapter tolerates a missing introduction or explanation and reads it
    // as "". This bank always carries both, so an absent one is a rename.
    assert.ok(isString(entry.introduction), `${where}: introduction is a string`);
    assert.ok(isString(entry.explanation), `${where}: explanation is a string`);

    const options = entry.options;
    assert.ok(isStringArray(options) && options.length >= 2, `${where}: options is an array of at least two strings`);
    const correct = entry.correctAnswer;
    assert.ok(
      typeof correct === 'number' && Number.isInteger(correct) && correct >= 0 && correct < options.length,
      `${where}: correctAnswer is an index into options`,
    );
    const difficulty = entry.difficulty;
    assert.ok(
      typeof difficulty === 'number' && Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5,
      `${where}: difficulty is an integer from 1 to 5`,
    );
    const importance = entry.importance;
    assert.ok(
      importance === undefined || (typeof importance === 'number' && Number.isInteger(importance) && importance >= 1 && importance <= 10),
      `${where}: importance is absent or an integer from 1 to 10`,
    );

    // hasFencedCode input: the adapter passes `introduction ?? ""` and `question`.
    const hasCode = FENCED_CODE.test(entry.question) || FENCED_CODE.test(entry.introduction);
    if (hasCode) fenced += 1;
    // A question that declares code-reading metadata must keep its code where
    // the importer looks, or the snapshot records it as a question with no code.
    if (entry.snippet !== undefined) {
      assert.ok(hasCode, `${where} declares a snippet but has no fenced block in its question or introduction`);
    }
  }

  assert.ok(fenced > 0, 'no question carries a fenced code block, so the importer would mark the whole bank as having no code');
}
