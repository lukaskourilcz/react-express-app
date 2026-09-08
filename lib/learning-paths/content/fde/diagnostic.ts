/** FDE — the optional placement diagnostic.
 *
 * Twelve authored scenarios and two short debugging exercises, arranged so a
 * learner finds out where they already stand before committing forty hours.
 * It is skippable by design: the module carries no requirements, no activity
 * here gates anything, and passing it grants no exemption from a bridge or a
 * module. What it produces is a recommendation.
 *
 * The scenarios split four ways, three items each: APIs and data, security
 * and operations, the operator's screen, and evaluating an AI-assisted
 * result. Every question tags the competencies it touches, because the
 * per-competency report is built from those tags. A competency no question
 * carries comes back as `not_assessed` — never as a zero, which would claim a
 * measurement nobody made.
 *
 * Both coding exercises hand the learner code that is already broken and say
 * so. Every page, delay and outcome they meet is a synthetic in-memory
 * fixture built in the task harness. No network, no vendor, no live model.
 */

import type { ModuleSource } from '../../types';

/** A paginated source, a caller-owned array and a record of what the
 * submission actually asked for. Appended after the learner's code, so the
 * probe cannot be shadowed by a same-named declaration in the submission. */
const PAGE_PROBE = `
var __collect = function (pages, known) {
  var requested = [];
  var before = JSON.stringify(known);
  var fetchPage = function (page) {
    requested.push(page);
    var entry = pages[page - 1] || [];
    return new Promise(function (resolve) {
      setTimeout(function () { resolve({ items: entry.slice(), pageCount: pages.length }); }, 20);
    });
  };
  return Promise.resolve(collectAll(fetchPage, known)).then(function (result) {
    return {
      result: result,
      requested: requested,
      callerUnchanged: JSON.stringify(known) === before,
      sameArray: result === known,
    };
  });
};
`.trim();

export const FDE_DIAGNOSTIC: ModuleSource = {
  id: 'fde-v1-diagnostic',
  title: 'Where you already are',
  optional: true,
  outcomes: [
    'See which FDE competencies you can already show, and which this diagnostic never looked at.',
    'Get bridge recommendations aimed at the gaps, with nothing locked or unlocked by the result.',
    'Skip the whole thing: it is optional, it grants no exemption, and on its own it completes nothing.',
    'Read a competency no question here touched as not assessed rather than as a zero.',
  ],
  competencies: ['integration', 'boundaries', 'handoff', 'evaluation'],
  dependsOn: [],
  estimatedMinutes: 40,
  lessons: [],
  activities: [
    {
      id: 'fde-v1-diagnostic-check',
      kind: 'check',
      purpose: 'diagnostic',
      verification: 'machine_verified',
      title: 'Twelve situations',
      summary:
        'Three questions each on APIs and data, security and operations, the operator screen, and evaluating an AI result. Optional and retryable. It recommends bridges, exempts you from nothing, completes nothing on its own, and reports a competency it did not measure as not assessed rather than as a zero.',
      competencies: ['integration', 'boundaries', 'operations', 'handoff', 'evaluation'],
      estimatedMinutes: 16,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-diagnostic-q1',
          prompt:
            'A nightly job pulls contacts from a vendor API. The vendor documents two things: a page may come back shorter than `page_size` when records are filtered out after the page is assembled, and `next_cursor` is `null` only on the last page. The job finishes without an error and stores about 4,000 of the 11,000 contacts. Which line explains it?',
          context: {
            language: 'javascript',
            code: 'const pullContacts = async () => {\n  const contacts = [];\n  let cursor = null;\n\n  while (true) {\n    const page = await vendor.contacts({ cursor, page_size: 500 });\n    contacts.push(...page.items);\n    if (page.items.length < 500) break;\n    cursor = page.next_cursor;\n  }\n\n  return contacts;\n};',
          },
          options: [
            '`if (page.items.length < 500) break;` — a short page is not the end of this collection, and only `next_cursor === null` says it is.',
            '`contacts.push(...page.items)` — spreading 500 entries onto the argument list overflows it and drops the tail.',
            '`let cursor = null;` — a null cursor starts the scan from an undefined position, so the first request skips ahead.',
            '`page_size: 500` is above the vendor maximum, so every response is truncated to the vendor default.',
          ],
          correct: 0,
          explanation:
            'The vendor says a short page is normal and marks the end with `next_cursor: null`. Breaking on a short page stops at the first filtered page and reports success, which is the symptom: no error, most of the records missing. Spreading 500 arguments is well inside the engine limit, and going over it throws rather than dropping entries quietly. A null cursor is how a cursor scan starts, and the first page did arrive. A page size above the maximum would still come back with a `next_cursor`, so the loop would keep going instead of stopping early.',
          competencies: ['integration'],
        },
        {
          id: 'fde-v1-diagnostic-q2',
          prompt:
            'A connector posts one invoice per approved order. When the invoice service answers 504, the connector retries the same POST up to three times. Finance reports that roughly one order in two hundred produced two invoices. Which change stops the duplicates?',
          options: [
            'Retry at most once, so at worst a single duplicate is created.',
            'Add exponential backoff with jitter between the attempts.',
            'Send an idempotency key the connector generates once per order, and have the invoice service return the stored result for a repeated key instead of writing again.',
            'Stop retrying on 504 and surface the timeout to the operator.',
          ],
          correct: 2,
          explanation:
            'A 504 says the gateway stopped waiting, not that the write failed, so the invoice may already exist. Only a key the server remembers turns the second attempt into a read of the first result. Retrying once halves the duplicates and keeps making them. Backoff changes when the retry lands, never what it does when it gets there. Refusing to retry does avoid the second write, but it leaves the outcome unknown and hands the operator an order they will re-submit by hand, which duplicates it anyway.',
          competencies: ['integration'],
        },
        {
          id: 'fde-v1-diagnostic-q3',
          prompt:
            'The nightly CSV export leaves `vat_id` blank for customers who have none, and the CSV reader hands blanks over as `""`. The same field arrives as `null` from the vendor JSON API. What happens to a blank row here?',
          context: {
            language: 'javascript',
            code: 'const toCustomer = row => ({\n  externalId: row.customer_id,\n  name: row.name,\n  vatId: row.vat_id !== null ? row.vat_id : null,\n});\n\nconst findByVat = (customers, vatId) =>\n  customers.filter(one => one.vatId === vatId);',
          },
          options: [
            'The empty string is falsy, so the conditional stores `null` and the two sources end up agreeing.',
            'The empty string is not `null`, so it is stored as a VAT id, and `findByVat(customers, "")` then returns every blank customer as one match.',
            'The CSV reader converts a blank column to `null` before the mapper sees it, so the two sources already agree.',
            'The insert fails, because a nullable column rejects an empty string.',
          ],
          correct: 1,
          explanation:
            '`row.vat_id !== null` is a null check, and `""` passes it, so a blank becomes a stored value that compares equal to every other blank. Nothing raises an error; a lookup by VAT id just starts matching a whole class of customers at once. The empty string is falsy, but the code tests `!== null` rather than truthiness, so a falsiness argument describes code that is not on the screen. The reader hands the raw column over, which is exactly why the two sources disagree. And a nullable column accepts `""` without complaint: the empty string is a value, not the absence of one.',
          competencies: ['integration'],
        },
        {
          id: 'fde-v1-diagnostic-q4',
          prompt:
            'Every caller of this endpoint is authenticated, and the browser client always sends the tenant it is currently showing. What can a signed-in user of tenant A do?',
          context: {
            language: 'javascript',
            code: 'export default async function handler(req, res) {\n  const session = await requireSession(req);\n  const { tenantId, caseId } = req.body;\n\n  const record = await db.cases.findOne({ tenantId, id: caseId });\n  return res.json(record);\n}',
          },
          options: [
            'Read any case from tenant B by putting tenant B’s id in the request body: the filter enforces the value the caller chose, not the one the session proves.',
            'Nothing. The query is still filtered by tenant, so a user of tenant A gets no rows belonging to tenant B.',
            'Nothing, as long as the body is validated against a schema that requires `tenantId` to be a well-formed UUID.',
            'Nothing on reads. The pattern only matters for writes, where a wrong tenant id corrupts another tenant’s data.',
          ],
          correct: 0,
          explanation:
            'The query filters on a value the caller supplies, so it enforces the caller’s claim instead of the session’s. Derive `tenantId` from the session and ignore the body field; a row-level policy scoped to the session tenant is the second layer, in the database rather than in the handler. Arguing that the filter protects the row assumes the attacker cannot change the filter, and changing it is the attack. A schema check proves the value is a well-formed UUID and never that it belongs to this user. Reads are not the lesser case either: the case body is the data, so reading tenant B’s case is the breach.',
          competencies: ['boundaries'],
        },
        {
          id: 'fde-v1-diagnostic-q5',
          prompt:
            'The operator dashboard calls a vendor API straight from the browser with a key read from `import.meta.env.VITE_VENDOR_KEY`. The value lives in the hosting provider’s encrypted environment settings and is never committed. Who can read the key?',
          options: [
            'Nobody outside the build. The value exists only in the encrypted settings and is injected at build time.',
            'Only someone with access to the hosting dashboard, because minification renames the variable in the output.',
            'Anyone who loads the dashboard. A build-time variable is inlined into the JavaScript the browser downloads, so the key ships inside the bundle.',
            'Anyone on the same network, unless the request is sent over TLS.',
          ],
          correct: 2,
          explanation:
            'Injected at build time means injected into the artifact. The literal sits in the bundle, in the browser cache and in any proxy that saw the response. The repair is structural: move the call behind a server route that holds the key, then rotate the key that already shipped. Encrypted settings protect the value at rest inside the provider, not after a build copied it into the output. Minification renames identifiers and leaves string literals alone, and grepping a bundle for a key shape takes seconds. TLS protects the request in flight and does nothing about a secret the client already holds.',
          competencies: ['boundaries', 'operations'],
        },
        {
          id: 'fde-v1-diagnostic-q6',
          prompt:
            'Release 42 ships a migration that copies `legacy_owner` into a new `owner_id` column and then drops `legacy_owner`. Two hours later the new code is failing on a subset of records. The team redeploys release 41. What have they got?',
          options: [
            'A working system: redeploying release 41 also reverts the migrations release 42 applied.',
            'Release 41 running against a schema with no `legacy_owner`, so it fails on the same records. The code rolled back and the schema did not.',
            'A working system, because release 41 recreates any column it needs from its own migration history when it starts.',
            'A working system, as long as the backfill is replayed in reverse from the application log first.',
          ],
          correct: 1,
          explanation:
            'A deploy rollback moves code. It does not move a schema, and it cannot bring back the data in a dropped column. Release 41 reads `legacy_owner`, which is gone, so the rollback restores the previous failure rather than the previous behaviour. Migration tools do not run down-migrations because an older build started; a down-migration is a deliberate, separately tested step, and a drop is frequently not reversible at all. Replaying from the application log assumes the log holds every value and is complete, which describes a restore rather than a rollback. The way out is not to arrive here: add `owner_id`, write both columns, move readers across, and drop `legacy_owner` in a later release once no rollback target still needs it.',
          competencies: ['operations'],
        },
        {
          id: 'fde-v1-diagnostic-q7',
          prompt:
            'The triage queue shows a spinner while cases load, then the list. When the case service answers 503 the component keeps its `loading` flag set and the spinner stays up. What is the minimum fix?',
          options: [
            'Keep the spinner and add a line in the header saying results may be delayed.',
            'Show the empty-queue message, since an operator with no cases and an operator with a failed fetch both have nothing to work on.',
            'Give the failure its own state that names what failed and offers a retry, so a load that ended never renders as a load still running.',
            'Log the error and retry every five seconds until it succeeds.',
          ],
          correct: 2,
          explanation:
            'An operator has to be able to tell "still working" from "this did not work", and the retry has to be theirs to press. A delay notice leaves the two states looking identical, which is the defect being described. The empty-queue message is worse than silence: an operator who reads "no cases waiting" stops looking, and the queue may be full. Silent retries hide the failure from the one person who could escalate it, and they keep hitting a service that is already failing. Retry if you like, with backoff, and still show the state.',
          competencies: ['handoff'],
        },
        {
          id: 'fde-v1-diagnostic-q8',
          prompt:
            'Pressing Approve shows a green "Case approved" toast immediately, then sends the POST. About one POST in fifty fails, and nothing on the screen changes when it does. What is wrong with this?',
          options: [
            'The screen has told the operator something that is not true, and one case in fifty is now approved in their head and not in the system. Either wait for the write to confirm, or keep the optimistic update and reverse it visibly when the write fails.',
            'Nothing. Optimistic updates are the standard pattern, and a 2% failure rate sits inside normal tolerance for a background write.',
            'Nothing, as long as the failed request is retried in the background until it goes through.',
            'The toast should stay on screen longer, so the operator is still looking when the error arrives.',
          ],
          correct: 0,
          explanation:
            'A success message is a claim about the system, and this screen makes it before anything has confirmed it. Optimistic updates are fine when the reversal is real: the row goes back, the operator is told, and the work returns to the queue. A failure rate is a reason to design the failure path, not a budget for false claims. A background retry can fail too, and by then the operator has moved on, so the correction still has to reach them. Toast duration matters for a message that does arrive; here none does.',
          competencies: ['handoff'],
        },
        {
          id: 'fde-v1-diagnostic-q9',
          prompt:
            'Delete case sits in the row menu directly under Duplicate case, and it deletes immediately and permanently. Operators hit the wrong row roughly once a week. Which change addresses that?',
          options: [
            'Add a confirmation dialog. A second deliberate click is what separates an accident from an intention.',
            'Make the operator type the case number to confirm the deletion.',
            'Restrict deleting to supervisors and have operators request a deletion instead.',
            'Make the deletion recoverable — mark the case deleted, keep it, and offer a visible undo for a set window — and move the action away from Duplicate in the menu.',
          ],
          correct: 3,
          explanation:
            'Once a week means the mistake will keep happening, so the design has to survive it: recovery, plus separation from the neighbouring action people are actually aiming for. A confirmation dialog helps a little against a slip of the mouse and not at all against the operator who confirms the wrong row, and a dialog on a weekly action becomes a reflex within a fortnight. Typing the case number raises the cost of every legitimate deletion and still leaves nothing to recover. Moving the permission upward moves the mistake to someone else and blocks routine work; that fits a rare action with a wide blast radius, not a weekly one.',
          competencies: ['handoff'],
        },
        {
          id: 'fde-v1-diagnostic-q10',
          prompt:
            'A case-routing model scores 0.94 accuracy over 1,000 held-out cases, against a 0.90 bar. Billing cases are 6% of the volume and score 0.41 on their own. What should the team do with that?',
          options: [
            'Ship it. The number clears the bar, and billing is 6% of the traffic.',
            'Report the slices next to the average and decide on those. Sixty billing cases at 0.41 move a 1,000-case average by about three points, so no threshold on the average could have caught this.',
            'Gather more billing cases until the billing slice reaches the bar.',
            'Re-weight the average so small slices count for more, then hold the weighted number to the same bar.',
          ],
          correct: 1,
          explanation:
            'The arithmetic is the argument: the other 940 cases run at about 0.974, and folding in sixty cases at 0.41 costs roughly three points. An average over a thousand cases cannot surface a slice that small failing, whatever the bar is set to. Shipping on the average sends billing cases to the wrong queue six times in ten, and billing is where the money questions arrive. Collecting more billing cases measures the slice more precisely without changing it. Re-weighting produces a different single number that is still a single number: other slices can drag it back over the bar, and it never says which slice broke.',
          competencies: ['evaluation'],
        },
        {
          id: 'fde-v1-diagnostic-q11',
          prompt:
            'The team wrote 120 labelled cases, then spent two weeks adjusting prompts, routing rules and thresholds until the score on those 120 went from 0.71 to 0.93. The report gives 0.93 as expected quality in production. What is wrong with the claim?',
          options: [
            'The 120 cases steered every decision, so 0.93 measures how well the design fits them. A claim about unseen cases needs a set that was held back and never scored while the design was changing.',
            'Nothing, provided the 120 cases were sampled at random from production traffic.',
            'Nothing, provided no case text was copied into the prompts.',
            'Nothing a split does not fix: score the finished design again on 24 of the 120 and report that number.',
          ],
          correct: 0,
          explanation:
            'Tuning against a score is what leaks the set, whatever the prompt text contains. Every threshold that got nudged was nudged because of those cases, so the number that came out describes the fit rather than the future. Random sampling makes a set representative and does nothing about the leak: a representative set you optimised against is still a set you optimised against. Copying case text is one way to leak and not the one that happened here. A split made afterwards splits cases that all shaped the design already; the hold-out has to be set aside before the tuning starts, and scored as rarely as you can manage.',
          competencies: ['evaluation'],
        },
        {
          id: 'fde-v1-diagnostic-q12',
          prompt:
            'A twelve-minute live demo handles three cases the engineer picked, all three correctly. The sponsor asks whether it is ready for the 400-case daily queue. What does the demo support?',
          options: [
            'That the workflow is covered end to end, and the remaining cases are variations on the same path.',
            'A yes, with a caveat in the notes that quality will vary on real traffic.',
            'That the path runs and gives the right answer on three cases the engineer chose. It says nothing about the rate on cases nobody picked, and the honest answer names what was measured and what a go-live decision would still need.',
            'Nothing yet. Put it on the live queue for a week and count the complaints.',
          ],
          correct: 2,
          explanation:
            'Three self-selected cases are an existence proof: the path can work. Readiness is a rate on cases you did not choose, and nothing here measures one. Calling the rest variations assumes exactly what a labelled sample would have told you. A caveat is not a measurement; it turns an unsupported yes into a hedged unsupported yes. Running it on the live queue does produce real data, but with no labels, no baseline and no hold-out it measures customer patience: complaints arrive late, come from a biased slice, and cannot separate a routing error from a busy Monday.',
          competencies: ['evaluation'],
        },
      ],
    },
    {
      id: 'fde-v1-diagnostic-debug-js',
      kind: 'code',
      purpose: 'diagnostic',
      verification: 'machine_verified',
      title: 'The page that never arrives',
      summary: 'Two defects in a paginated collector: the last page is never fetched, and the caller’s array is written into.',
      competencies: ['integration'],
      estimatedMinutes: 12,
      code: {
        language: 'javascript',
        prompt:
          'The starter is broken. Read it before you change it.\n\n`collectAll(fetchPage, known)` reads every page of a paginated source and returns `known` followed by all the items, in page order. `fetchPage(pageNumber)` takes a page number starting at 1 and resolves to `{ items, pageCount }`, where `pageCount` is the total number of pages and is the same on every page. `known` is the array of ids the caller already had.\n\nThere are two defects, and both are the quiet kind:\n\n- The last page is never fetched. The collection comes back short and nothing reports an error.\n- `known` is pushed into rather than copied, so the caller’s array changes underneath them.\n\nFix both. `fetchPage` is a synthetic in-memory fixture the grader builds, with a simulated delay that the sandbox’s virtual clock resolves instantly. There is no network here and no vendor API.',
        contract: [
          'Fetch every page through the `fetchPage` you are given; nothing else reaches a page.',
          'Read `pageCount` from the first page, then read pages 1 through `pageCount` in order, each one once.',
          'Return a new array. The `known` array the caller passed in must come back exactly as it went in.',
        ],
        starter: `// Broken on purpose: the last page goes missing and the caller's array is
// modified. Run it, read the output, then fix both.
const collectAll = async (fetchPage, known) => {
  const out = known;
  const first = await fetchPage(1);
  out.push(...first.items);

  let page = 2;
  while (page < first.pageCount) {
    const next = await fetchPage(page);
    out.push(...next.items);
    page += 1;
  }

  return out;
};

// Scratch pad — change this and press Run.
const pages = [['a', 'b'], ['c', 'd'], ['e']];
const fixture = n => Promise.resolve({ items: pages[n - 1], pageCount: pages.length });
const seen = ['seed'];
collectAll(fixture, seen).then(result => console.log(result, seen));
`,
        skeleton: `const collectAll = async (fetchPage, known) => {
  const out = /* a copy of known, not known itself */;
  const first = await fetchPage(1);
  out.push(...first.items);

  let page = 2;
  while (/* pages 2 through first.pageCount, inclusive */) {
    const next = await fetchPage(page);
    out.push(...next.items);
    page += 1;
  }

  return out;
};`,
        hints: [
          'Run the starter unchanged and print `seen` after the result. Two things are wrong with what comes out: `e` is missing, and `seen` is no longer `["seed"]`.',
          'With a `pageCount` of 3, a loop that starts at page 2 has to run for 2 and for 3. Work out which comparison does that.',
          '`const out = known` binds a second name to the same array, so every `push` writes into the caller’s. Copying the entries into a fresh array is the whole fix.',
        ],
        approach: [
          'Copy `known` into a fresh array and push into the copy from then on.',
          'Fetch page 1 and read `pageCount` off it.',
          'Loop from page 2 while the page number is still at most `pageCount`, awaiting each fetch and appending its items.',
          'Return the copy. The array the caller handed in is untouched.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Every page collected, in order',
            critical: true,
            weight: 3,
            detail: 'The last page is the one to check. Also check a single-page source and pages that come back empty.',
          },
          {
            id: 'no-mutation',
            label: 'The caller’s array is left alone',
            critical: true,
            weight: 2,
            detail: 'The `known` array changed during the call, or the array you returned is the same object the caller passed in. Copy it before you push.',
          },
        ],
        tests: [
          {
            call: "__collect([['a', 'b'], ['c', 'd'], ['e']], []).then(function (r) { return r.result; })",
            expected: ['a', 'b', 'c', 'd', 'e'],
            label: 'all three pages, including the last one',
            async: true,
          },
          {
            call: "__collect([['a']], []).then(function (r) { return r.result; })",
            expected: ['a'],
            label: 'a single page still works',
            async: true,
            edge: true,
          },
          {
            call: "__collect([['a'], ['b'], ['c'], ['d']], []).then(function (r) { return r.result; })",
            expected: ['a', 'b', 'c', 'd'],
            label: 'four pages, none skipped',
            async: true,
          },
          {
            call: "__collect([[], [], ['z']], []).then(function (r) { return r.result; })",
            expected: ['z'],
            label: 'empty pages before the page that has the item',
            async: true,
            edge: true,
          },
          {
            call: "__collect([['a', 'b'], ['c']], ['seed']).then(function (r) { return r.result; })",
            expected: ['seed', 'a', 'b', 'c'],
            label: 'what the caller already had comes first',
            async: true,
          },
          {
            call: "__collect([['a', 'b'], ['c']], ['seed']).then(function (r) { return r.callerUnchanged; })",
            expected: true,
            label: 'the caller’s array is the same afterwards',
            async: true,
            criterion: 'no-mutation',
          },
          {
            call: "__collect([['a']], ['seed']).then(function (r) { return r.sameArray; })",
            expected: false,
            label: 'the result is a new array, not the one that was passed in',
            async: true,
            criterion: 'no-mutation',
          },
        ],
        harness: PAGE_PROBE,
      },
    },
    {
      id: 'fde-v1-diagnostic-debug-ts',
      kind: 'code',
      purpose: 'diagnostic',
      verification: 'machine_verified',
      title: 'The branch that swallows a failure',
      summary: 'A union of three sync outcomes, narrowed by the wrong test, so a rejected record is reported as applied.',
      competencies: ['integration'],
      estimatedMinutes: 12,
      code: {
        language: 'typescript',
        prompt:
          'The starter is broken. It compiles, the tests fail, and the reason is the narrowing.\n\n`SyncOutcome` has three members: an `applied` record, a `queued` record with a `retryAfterMs` delay, and a `rejected` record with an `error`. `describeOutcome` turns one into a line of text:\n\n- applied → `applied r-1`\n- queued → `queued r-2 in 500ms`\n- rejected → `rejected r-3: MISSING_VAT`\n\nThe starter tests `outcome.state !== \'queued\'`, which is true for `applied` and for `rejected` alike, so every rejected record is described as an applied one. A failure reported as a success is the defect: nothing throws, and the sync log reads clean.\n\nFix the narrowing so each state is decided by its own name. The compiler is graded too, so the types have to stay clean.',
        contract: [
          'Decide each branch from `outcome.state`, not from which properties happen to be present.',
          'Keep the `SyncOutcome` union and the `(outcome: SyncOutcome) => string` signature. Widening either to `any` is not a fix.',
          'Return the exact text the examples show, including the `ms` suffix and the `: ` before an error.',
        ],
        starter: `type SyncOutcome =
  | { state: 'applied'; recordId: string }
  | { state: 'queued'; recordId: string; retryAfterMs: number }
  | { state: 'rejected'; recordId: string; error: string };

// Broken on purpose: a rejected outcome comes back described as an applied
// one. Read the narrowing, run it, then fix it.
const describeOutcome = (outcome: SyncOutcome): string => {
  if (outcome.state !== 'queued') {
    return 'applied ' + outcome.recordId;
  }
  return 'queued ' + outcome.recordId + ' in ' + outcome.retryAfterMs + 'ms';
};

// Scratch pad — change this and press Run.
console.log(describeOutcome({ state: 'rejected', recordId: 'r-3', error: 'MISSING_VAT' }));
`,
        skeleton: `type SyncOutcome =
  | { state: 'applied'; recordId: string }
  | { state: 'queued'; recordId: string; retryAfterMs: number }
  | { state: 'rejected'; recordId: string; error: string };

const describeOutcome = (outcome: SyncOutcome): string => {
  if (/* the state is exactly 'applied' */) {
    return 'applied ' + outcome.recordId;
  }

  if (/* the state is exactly 'queued' */) {
    return 'queued ' + outcome.recordId + ' in ' + outcome.retryAfterMs + 'ms';
  }

  /* only 'rejected' is left, and the compiler knows it */
  return 'rejected ' + outcome.recordId + ': ' + outcome.error;
};`,
        hints: [
          'Run the starter on a rejected outcome. It prints an applied line, because `state !== \'queued\'` covers `applied` and `rejected` together.',
          'Three states need three answers. Test for `\'applied\'` by name, then for `\'queued\'` by name, and let the last return handle `\'rejected\'`.',
          'Comparing `outcome.state` against a string literal is what narrows the union: inside the rejected branch, `outcome.error` is a `string` with no cast and no non-null assertion.',
        ],
        approach: [
          'Read the union first: three states, each carrying its own extra field.',
          'Compare `outcome.state` against `\'applied\'` and return that description.',
          'Compare against `\'queued\'` and return that one, reading `retryAfterMs` inside the branch where it exists.',
          'Return the rejected description last, where the compiler has narrowed the union to the only member left.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Every state described, with clean types',
            critical: true,
            weight: 3,
            detail: 'Check an applied, a queued and a rejected outcome, and make sure the compiler reports nothing on your code.',
          },
          {
            id: 'discriminant',
            label: 'The branch is chosen by `state`',
            critical: true,
            weight: 2,
            detail: 'An outcome came back described as a different state. Compare `outcome.state` against each literal instead of testing which properties exist.',
          },
        ],
        tests: [
          {
            call: "describeOutcome({ state: 'applied', recordId: 'r-1' })",
            expected: 'applied r-1',
            label: 'an applied record',
          },
          {
            call: "describeOutcome({ state: 'queued', recordId: 'r-2', retryAfterMs: 500 })",
            expected: 'queued r-2 in 500ms',
            label: 'a queued record carries its delay',
          },
          {
            call: "describeOutcome({ state: 'rejected', recordId: 'r-3', error: 'MISSING_VAT' })",
            expected: 'rejected r-3: MISSING_VAT',
            label: 'a rejected record is not reported as applied',
            edge: true,
            criterion: 'discriminant',
          },
          {
            call: "describeOutcome({ state: 'rejected', recordId: 'r-4', error: 'TENANT_MISMATCH' })",
            expected: 'rejected r-4: TENANT_MISMATCH',
            label: 'the error travels with the description',
            criterion: 'discriminant',
          },
          {
            call: "describeOutcome({ state: 'queued', recordId: 'r-5', retryAfterMs: 0 })",
            expected: 'queued r-5 in 0ms',
            label: 'a zero delay is still a delay',
            edge: true,
          },
          {
            call: "[{ state: 'applied', recordId: 'a' }, { state: 'rejected', recordId: 'b', error: 'E' }].map(function (one) { return describeOutcome(one); })",
            expected: ['applied a', 'rejected b: E'],
            label: 'a mixed batch keeps each outcome distinct',
          },
          {
            call: "describeOutcome({ state: 'applied', recordId: 'r-6' }) === describeOutcome({ state: 'rejected', recordId: 'r-6', error: 'DUPLICATE' })",
            expected: false,
            label: 'the same record id in two states never describes the same',
            edge: true,
            criterion: 'discriminant',
          },
        ],
        typeTests: [
          {
            code: "const __sig: (outcome: SyncOutcome) => string = describeOutcome;",
            label: 'the union and the signature are both still there',
          },
          {
            code: "const __label: string = describeOutcome({ state: 'applied', recordId: 'r-1' });",
            label: 'an applied outcome describes to text',
          },
          {
            code: "const __count: number = describeOutcome({ state: 'applied', recordId: 'r-1' });",
            label: 'the description is text, not a number',
            rejects: true,
          },
          {
            code: "describeOutcome({ state: 'queued', recordId: 'r-2' });",
            label: 'a queued outcome without its delay is not a SyncOutcome',
            rejects: true,
          },
          {
            code: "describeOutcome({ state: 'rejected', recordId: 'r-3' });",
            label: 'a rejected outcome without its error is not a SyncOutcome',
            rejects: true,
          },
          {
            code: "describeOutcome({ state: 'lost', recordId: 'r-4' });",
            label: 'an unknown state is not a SyncOutcome',
            rejects: true,
          },
        ],
      },
    },
  ],
  requires: [],
};
