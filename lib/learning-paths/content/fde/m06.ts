/** M06 — Tools and boundaries.
 *
 * M03 established that the tenant comes from the session and never from the
 * arguments. M04 established that a model response is untrusted text until
 * your own code has checked it. This module puts the two together in the one
 * place where a model's output turns into an effect: the tool call.
 *
 * Two lessons, one four-question check, one graded dispatcher. The first
 * lesson is about the tool definition — the schema as a gate rather than a
 * description, one permission per tool, and what a client does with a
 * protocol version it has never seen. The second is about what happens once
 * the definition is right: how many attempts a failing tool gets, what a
 * repeated call does, and what an operator has to be shown for their approval
 * to still mean something five minutes later.
 *
 * Everything the dispatcher talks to is an authored fixture. `__fixture` in
 * the task harness builds a registry of three synthetic tools whose handlers
 * push to an array; nothing calls a provider, needs a key or opens a socket,
 * and no timer is involved. Marlbrook Systems, its order ids and its refund
 * figures are invented for this path. No real customer data appears in it. */

import type { ModuleSource } from '../../types';

/** The registry, session and call log the dispatcher is graded against.
 * Appended after the learner's code so the fixtures cannot be shadowed.
 *
 * Three tools, chosen so each grading criterion has something to bite on:
 * `orders.read` takes only optional arguments and gets no retry budget,
 * `refunds.create` requires approval and three validated arguments, and
 * `ledger.sync` is allowed three attempts. `readFails` and `syncFails` say
 * how many times those two handlers throw before they succeed, and `log`
 * records every handler invocation, so a test can prove a refusal never
 * reached the handler at all. */
const TOOL_FIXTURE = `
var __fixture = function (options) {
  var opts = options || {};
  var log = [];
  var readFails = opts.readFails || 0;
  var syncFails = opts.syncFails || 0;
  var reads = 0;
  var syncs = 0;
  var refunds = 0;
  var registry = {
    'orders.read': {
      scope: 'orders.read',
      schema: {
        status: { type: 'string', required: false, enum: ['open', 'closed'] },
        limit: { type: 'number', required: false }
      },
      handler: function (args) {
        log.push({ tool: 'orders.read', args: args });
        reads += 1;
        if (reads <= readFails) throw new Error('orders backend unavailable');
        return { count: args.status === 'closed' ? 1 : 2 };
      }
    },
    'refunds.create': {
      scope: 'refunds.write',
      approval: true,
      schema: {
        orderId: { type: 'string', required: true },
        amountCents: { type: 'number', required: true },
        currency: { type: 'string', required: true, enum: ['USD', 'EUR', 'GBP'] }
      },
      handler: function (args) {
        log.push({ tool: 'refunds.create', args: args });
        refunds += 1;
        return { refundId: 'RFD-' + refunds, amountCents: args.amountCents };
      }
    },
    'ledger.sync': {
      scope: 'ledger.write',
      maxAttempts: 3,
      schema: { batchId: { type: 'string', required: true } },
      handler: function (args) {
        log.push({ tool: 'ledger.sync', args: args });
        syncs += 1;
        if (syncs <= syncFails) throw new Error('gateway timeout');
        return { batchId: args.batchId, synced: true };
      }
    }
  };
  var session = {
    operatorId: 'USR-31',
    scopes: opts.scopes || ['orders.read', 'refunds.write', 'ledger.write']
  };
  return { registry: registry, session: session, log: log };
};
var __tools = function (log) {
  return log.map(function (entry) { return entry.tool; });
};
`.trim();

export const FDE_M06: ModuleSource = {
  id: 'fde-v1-m06',
  title: 'Tools and boundaries',
  outcomes: [
    'Say what a tool schema enforces inside your process and what it only suggests to the model, and put each argument check on the right side of that line.',
    'Give every tool one permission scope, and split a tool that does two things whenever you would grant one half and withhold the other.',
    'Handle a protocol version your client does not implement without guessing at what the payload means.',
    'Bound a failing tool with an attempt budget held in one place, and make a repeated call return the first result instead of repeating the effect.',
    'Say what an operator has to see for an approval to mean anything, and what a dispatcher must re-check before it runs a call approved five minutes ago.',
  ],
  competencies: ['tools'],
  dependsOn: ['fde-v1-m03', 'fde-v1-m04'],
  estimatedMinutes: 115,
  lessons: [
    {
      id: 'fde-v1-m06-l1',
      title: 'Tool schemas and what they are for',
      summary:
        'The tool definition is where the boundary gets written down. What the schema has to enforce in your own process, why a tool that does two things should be two tools, and what a client does with a protocol version it has never seen.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'Model Context Protocol — specification',
          url: 'https://modelcontextprotocol.io/specification',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'OWASP Top 10 for Large Language Model Applications',
          url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'MDN — typeof',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'Marlbrook Systems runs a support desk. Its assistant can already read a ticket, and the support lead now wants it to issue a refund when a customer was double-charged. That request turns into a tool definition, and the tool definition is the only place anyone writes down what the assistant may do with a customer’s money.',
        },
        {
          kind: 'prose',
          body:
            'A tool definition does two jobs that look identical on the page. Sent to the model, the schema is a hint: here are the arguments, here is what they mean, fill them in. Held in your dispatcher, the same schema is a gate: these arguments and no others, this type, this list of values. The model can ignore the hint. Your gate is the part that stops it.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'A schema you only ship to the model enforces nothing. The model produces text, a decoder may constrain that text, a framework may parse it, and none of those steps is your process. If the check that guards a refund lives in the prompt, an argument shaped the wrong way walks straight past it. Run the check again in your own code, on the arguments you are about to hand the handler.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const registry = {\n  'refunds.create': {\n    scope: 'refunds.write',\n    approval: true,\n    schema: {\n      orderId: { type: 'string', required: true },\n      amountCents: { type: 'number', required: true },\n      currency: { type: 'string', required: true, enum: ['USD', 'EUR', 'GBP'] },\n    },\n    handler: args => ledger.refund(args),\n  },\n};",
          caption: 'One registry entry carries four separate decisions: the permission it needs, whether a person signs it off, the arguments it accepts, and the code that acts.',
        },
        {
          kind: 'prose',
          body:
            'Three checks the schema can settle on its own: a required field is present, a value is the declared type, a value is one of the listed ones. Each of them needs nothing but the arguments in front of it. In JavaScript the type test is `typeof`, which has one trap worth remembering — `typeof null` is `"object"`, so a `null` where a string was required fails the type check rather than the presence check.',
        },
        {
          kind: 'table',
          caption: 'Two gates, one refund. Which checks run on the arguments alone, and which need something the arguments do not carry.',
          headers: ['Check', 'Where it runs', 'Why it belongs there'],
          rows: [
            ['`currency` is one of USD, EUR, GBP', 'Schema', 'The list is fixed when the tool is registered, and the argument carries everything the check needs.'],
            ['`amountCents` is a number, not the string "24050"', 'Schema', 'One `typeof` test on one value, with no lookup behind it.'],
            ['`orderId` is present at all', 'Schema', 'Presence is structural. Whether that id names a real order is not.'],
            ['The amount is within the order’s remaining refundable balance', 'Handler', 'It needs the order, which the argument only names.'],
            ['The operator’s session holds `refunds.write`', 'Handler', 'It needs the session. No argument supplies it, and no argument may override it.'],
            ['This order has no refund recorded in the last hour', 'Handler', 'It needs the store and the clock, both of which move between calls.'],
          ],
        },
        {
          kind: 'trace',
          caption: 'One refund call stepped through the gates. The arguments look reasonable and two of the three are fine.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['Known tool', 'Scope', 'Arguments', 'Handler'],
                note: 'The assistant proposes refunds.create with { orderId: "ORD-4471", amountCents: "24050", currency: "CZK" }. Nothing has run yet.',
              },
              {
                cells: ['Known tool', 'Scope', 'Arguments', 'Handler'],
                marks: [{ index: 0, role: 'active' }],
                note: 'refunds.create is in the registry, so the dispatcher now has a scope, a schema and a handler to work with. A name that is not registered stops here.',
              },
              {
                cells: ['Known tool', 'Scope', 'Arguments', 'Handler'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'active' },
                ],
                note: 'The session holds refunds.write, so this operator may use the tool. Authorization is answered before the arguments are read, so a caller who may not use the tool learns nothing about its shape.',
              },
              {
                cells: ['Known tool', 'Scope', 'Arguments', 'Handler'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'active' },
                ],
                note: 'The schema runs in declaration order. orderId is a present string and passes. amountCents arrived as the string "24050" where a number was declared, so the check fails on that field.',
              },
              {
                cells: ['Known tool', 'Scope', 'Arguments', 'Handler'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'compare' },
                  { index: 3, role: 'excluded' },
                ],
                note: 'The dispatcher returns invalid_arguments for amountCents and the handler never runs. The currency was never reached, because the first failing field ends the check — and CZK would have failed too.',
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'The ordering is the whole point. Every refusal above happened before `ledger.refund` was called. Once the handler runs you are not validating any more, you are compensating, and a refund is one of the effects that compensating handles badly.',
        },
        {
          kind: 'prose',
          body:
            'Give each tool one permission name and check it against the session. The session’s scopes come from whatever authenticated the operator; an argument called `scope` or `tenantId` is a value the model chose, and a value the model chose can never widen what the operator may do. That is the same rule M03 applied to the tenant, applied here to the verb.',
        },
        {
          kind: 'prose',
          body:
            'Marlbrook’s first draft had one tool, `orders.manage`, with a `mode` argument that was either `read` or `refund`. Granting it granted both, so every operator who could look at an order could also refund one. Splitting it into `orders.read` under the `orders.read` scope and `refunds.create` under `refunds.write` moved the decision back where it belongs: the grant decides, and the argument is only a filter.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Splitting a tool is a permission decision, not a tidiness one. The question is never whether the two branches share code. It is whether you would ever want to grant one and withhold the other. When the answer is yes, they are two tools, however similar the handlers look.',
        },
        {
          kind: 'prose',
          body:
            'Across a process boundary, the Model Context Protocol is the convention a lot of this now runs on: a server advertises its tools with a name, a description and an input schema, and a client discovers and calls them. The specification is versioned, and the client and server settle on a protocol version when they connect. Reading it is worth an hour, because it names the shapes you will otherwise reinvent badly.',
        },
        {
          kind: 'prose',
          body:
            'Versions move, so your client will eventually meet one it does not implement. It must not guess. Either refuse the connection and report which versions it speaks, or propose one it does implement and treat the peer’s agreement as the answer. Reading a payload under the wrong version’s rules is worse than refusing to read it: a field whose meaning changed still parses cleanly, and the mistake shows up later as a tool call that did the wrong thing to a real record.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Handling an unknown version is not the same as skipping an unknown field. A field you have never seen is often safe to ignore. A protocol version you have never seen tells you the rules for reading every field may have moved, including the fields you do recognise.',
        },
      ],
    },
    {
      id: 'fde-v1-m06-l2',
      title: 'Bounded execution and approval',
      summary:
        'Retry budgets counted in one place, an idempotency key that survives a duplicate delivery, and what an operator has to be shown for their approval to still mean something when the call finally runs.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'RFC 9110 — HTTP Semantics',
          url: 'https://www.rfc-editor.org/rfc/rfc9110',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'OWASP Top 10 for Large Language Model Applications',
          url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'Model Context Protocol — specification',
          url: 'https://modelcontextprotocol.io/specification',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'The refund tool now exists and refuses everything it should refuse. Three questions are still open, and none of them is about the schema: how many times may this call try, what happens when the same call arrives twice, and who says yes before money moves.',
        },
        {
          kind: 'prose',
          body:
            'A retry budget is a count of attempts for the whole call, held in one place. Marlbrook’s first version retried inside the HTTP client, retried again in the tool handler and retried once more in the agent loop. Three retries at each layer is twenty-seven attempts against a service that was already struggling. Count attempts where the call is dispatched, not where the failure happens to be noticed.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const run = (tool, args) => {\n  const budget = tool.maxAttempts || 1;\n  let attempts = 0;\n  let error = '';\n\n  while (attempts < budget) {\n    attempts += 1;\n    try {\n      return { ok: true, value: tool.handler(args), attempts };\n    } catch (thrown) {\n      error = thrown.message;\n    }\n  }\n\n  return { ok: false, reason: 'tool_failed', attempts, error };\n};",
          caption: 'The budget is a total, not a per-failure allowance, and the count comes back with the result so the caller can see what the answer cost.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'A retry budget bounds how many times you try. It says nothing about what each try did. Retrying `refunds.create` after a timeout can refund the order twice, because a timeout tells you the response never arrived, not that the effect never happened.',
        },
        {
          kind: 'prose',
          body:
            'An idempotency key closes that gap. The caller mints one key per intended effect, before the first attempt, and sends it with every attempt of that effect. The receiver records the result under the key, and a second arrival with the same key returns the recorded result without running the handler again. HTTP already gives some methods this property by definition — repeating a PUT or a DELETE has the same intended effect as sending it once — and a refund is not one of them, so the key is what supplies what the method does not.',
        },
        {
          kind: 'table',
          caption: 'What the key has to do, and four ways teams lose the property they thought they had.',
          headers: ['Rule', 'What it means', 'What breaks without it'],
          rows: [
            [
              'One key per intended effect',
              'The caller mints it once, before the first attempt, and reuses it for every retry of that effect.',
              'A key generated per attempt makes every retry a new call, which is exactly the duplicate you were preventing.',
            ],
            [
              'Record the result, not just the key',
              'The stored entry holds what the first call returned.',
              'A receiver that only remembers "seen" can refuse the replay but cannot answer it, so the caller keeps retrying.',
            ],
            [
              'Record it only when something completed',
              'A call that never reached a verdict leaves no entry behind.',
              'A key burned by a refusal blocks the corrected call that follows two seconds later.',
            ],
            [
              'Keys are scoped to one tenant and one operator',
              'The lookup happens inside the boundary, never in a global table.',
              'A key another tenant happens to reuse hands them a stored result they were never allowed to see.',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'The dispatcher you write next takes the simplest rule: a repeated key is the same call, and the stored result comes back whatever arguments arrive with it. Several payment APIs go further and reject a reused key whose arguments changed, on the grounds that the caller has a bug worth reporting. Both rules are defensible. Running the second call is not.',
        },
        {
          kind: 'prose',
          body:
            'Approval is the last bound, and it is the one that gets faked most often. An approval means a person agreed to a specific effect, which is only true if they saw the effect: the tool name, the validated arguments the dispatcher will actually pass, the record it lands on, and the amount. "Approve this refund?" with no number on the screen is a button, not an approval.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Show the validated arguments, not the assistant’s description of them. Model output is untrusted content: it can describe "a small courtesy refund" over arguments that read 240500 cents, and it can ask the operator to approve on grounds that are not in the record. The operator is approving what the dispatcher will run, so render that object.',
        },
        {
          kind: 'trace',
          caption: 'An approval granted at 09:12 and executed at 09:17, with a colleague working the same order in between.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['Approval shown', 'Operator approves', 'Order changes', 'Call executes'],
                marks: [{ index: 0, role: 'active' }],
                note: '09:12. The dispatcher holds refunds.create for ORD-4471, 24050 cents, USD, and shows the operator those exact arguments. Nothing has run, and nothing has been refunded.',
                counter: { label: 'Refunded on ORD-4471, cents', value: 0 },
              },
              {
                cells: ['Approval shown', 'Operator approves', 'Order changes', 'Call executes'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'active' },
                ],
                note: '09:12. The operator approves. The dispatcher records that a person agreed to this effect and holds the call in a pending state.',
                counter: { label: 'Refunded on ORD-4471, cents', value: 0 },
              },
              {
                cells: ['Approval shown', 'Operator approves', 'Order changes', 'Call executes'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'active' },
                ],
                note: '09:15. A colleague refunds the same order by hand in the billing tool. ORD-4471 now carries 24050 cents of refund, and the pending approval knows nothing about it.',
                counter: { label: 'Refunded on ORD-4471, cents', value: 24050 },
              },
              {
                cells: ['Approval shown', 'Operator approves', 'Order changes', 'Call executes'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'active' },
                ],
                note: '09:17, with no re-check. The dispatcher runs the approved call because a person approved it, and the customer is refunded twice for one charge.',
                counter: { label: 'Refunded on ORD-4471, cents', value: 48100 },
              },
              {
                cells: ['Approval shown', 'Operator approves', 'Order changes', 'Call executes'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'excluded' },
                ],
                note: '09:17, with the re-check in place. The dispatcher re-reads the order first, finds a refund it did not make, and refuses. The operator gets the call back with the reason and the new balance instead of a second refund.',
                counter: { label: 'Refunded on ORD-4471, cents', value: 24050 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'So re-check at execution. An approval records a decision, not a fact about the world. Bind it to whatever the decision rested on — a version number on the order, an ETag, a hash of the fields you put on the screen — and compare that again before the handler runs. When it moved, refuse and ask the operator again with the new numbers.',
        },
        {
          kind: 'prose',
          body:
            'Give approvals an expiry as well, short enough that the operator still remembers the call when it runs. An expiry is a cheap bound on how stale a decision can get, and it is not a substitute for the re-check: data moves in thirty seconds as readily as in five minutes.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'An approval is not a permission grant. Approving one refund does not add `refunds.write` to a session that lacked it, and it does not authorize the next refund. Scope is checked on every call, approved or not.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'fde-v1-m06-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: tool schemas and what they are for',
      summary: 'The schema as a gate rather than a description, one permission per tool, and a protocol version the client has never seen.',
      competencies: ['tools'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m06-l1',
    },
    {
      id: 'fde-v1-m06-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: bounded execution and approval',
      summary: 'Attempt budgets in one place, idempotency keys under duplicate delivery, and the approval that went stale before it ran.',
      competencies: ['tools'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m06-l2',
    },
    {
      id: 'fde-v1-m06-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Tool boundary checks',
      summary: 'Four questions: where an argument check belongs, what an unknown protocol version costs, which call needs approval, and why an approved call gets re-checked.',
      competencies: ['tools'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-m06-q1',
          prompt:
            'Marlbrook’s `refunds.create` tool takes `{ orderId, amountCents, currency }`. Four checks have to run before the handler moves money. Which one belongs in the argument schema rather than in the handler?',
          options: [
            '`currency` must be one of "USD", "EUR" or "GBP".',
            '`amountCents` must not exceed the order’s remaining refundable balance.',
            'The operator’s session must hold the `refunds.write` scope.',
            'The order must have no refund recorded against it in the last hour.',
          ],
          correct: 0,
          explanation:
            'A schema check is decidable from the arguments alone: the allowed currencies are fixed when the tool is registered, so the value in front of you settles it. The other three each need something the arguments do not carry. The balance needs the order the id only names, the scope needs the session that authenticated the operator, and the recent-refund check needs the store and the clock. Putting any of those in the schema would mean either passing state into the validator or trusting an argument to describe it, and an argument the model chose can never establish a permission. All four still run before the handler acts; the split is about what each check can see, not about which one matters.',
          competencies: ['tools'],
        },
        {
          id: 'fde-v1-m06-q2',
          prompt:
            'Your client connects to a tool server that announces a protocol version your client does not implement. What should the client do with the tool list that follows?',
          options: [
            'Treat the tool list as unusable: either refuse the connection and report which versions it speaks, or propose a version it does implement and act only if the server agrees to it.',
            'Read the tool list and ignore any field it does not recognise, since protocol changes are additive by convention.',
            'Read the tool list under the newest version the client implements and log a warning, since the server will reject anything it cannot handle.',
            'Fall back automatically to the oldest version the client still supports, so the widest range of servers keeps working.',
          ],
          correct: 0,
          explanation:
            'An unknown version tells you the rules for reading the payload may have moved, so the only safe moves are refusing or negotiating down to a version both sides implement. Ignoring unrecognised fields assumes the change was additive, which is precisely what you cannot know from a version you have never seen — a field you do recognise may have changed meaning and will still parse. Leaning on the server to reject bad requests puts your safety in the peer’s hands and misses the failures that are silent rather than rejected. Falling back to the oldest supported version is still a guess: the server may not implement it either, and picking without confirming leaves both sides reading the same bytes by different rules.',
          competencies: ['tools'],
        },
        {
          id: 'fde-v1-m06-q3',
          prompt:
            'Marlbrook’s assistant has four tools, all of them scope-checked against the operator’s session. Which one needs a human approval step before it runs?',
          options: [
            '`refunds.create`, which moves money out of Marlbrook’s account and cannot be undone by re-running the assistant.',
            '`orders.read`, which returns orders the operator can already open in the admin console.',
            '`tickets.search`, which searches the operator’s own tenant and returns ticket summaries.',
            '`draft.compose`, which writes a reply into the operator’s editor that nobody sends until they press send.',
          ],
          correct: 0,
          explanation:
            'Approval buys you a person between the model and an effect that is expensive to reverse, and a refund is exactly that. The two read-only tools change nothing, so an approval step would only add a click; their protection is the scope check, and approval is never a substitute for it. `draft.compose` is the interesting distractor: it does write something, but the operator already has to press send, so a second confirmation adds a habit of clicking through prompts without reading them. Every approval you add costs the attention of the approvals that matter.',
          competencies: ['tools'],
        },
        {
          id: 'fde-v1-m06-q4',
          prompt:
            'An operator approved `refunds.create` on ORD-4471 for 24050 cents at 09:12. The dispatcher reaches the call at 09:17, and at 09:15 a colleague refunded the same order by hand. Why must the dispatcher re-run its checks before executing?',
          options: [
            'The approval records that a person agreed to the effect described at 09:12, not that the preconditions still hold, so the dispatcher has to re-read them and refuse when they moved.',
            'The approval is stale, and every approval must carry a time limit shorter than five minutes.',
            'The dispatcher cannot rely on the operator’s judgement, so it re-evaluates the decision itself before acting.',
            'The retry budget resets when a call is approved, so the call has to be re-validated to avoid a duplicate attempt.',
          ],
          correct: 0,
          explanation:
            'The approval is a record of consent to a described effect at a point in time. It says nothing about the balance, and the balance is what changed. A time limit is a useful second control, but five minutes is arbitrary and a thirty-second-old approval has the same defect, so an expiry does not remove the need to re-check. The dispatcher is not second-guessing the operator either — the person judged correctly on the facts they were shown, and those facts moved. The retry budget bounds how many attempts one call gets and has nothing to say about whether the world changed between approval and execution.',
          competencies: ['tools'],
        },
      ],
    },
    {
      id: 'fde-v1-m06-tool-dispatcher',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'The tool dispatcher',
      summary: 'One dispatcher that refuses an unknown tool, an unheld scope and an invalid argument, bounds retries, replays an idempotency key, and holds a refund until a person approves it.',
      competencies: ['tools'],
      estimatedMinutes: 50,
      code: {
        language: 'javascript',
        prompt:
          'Write `createDispatcher(registry, session)`, returning `{ call, approve }`. It is the single place where a proposed tool call turns into an effect, so every boundary in this module lands in it.\n\n`registry` maps a tool name to `{ scope, schema, handler, approval?, maxAttempts? }`. A `schema` maps an argument name to `{ type, required, enum? }`, where `type` is compared with `typeof`. `session` is `{ operatorId, scopes }`, and `scopes` is the only place a permission may come from.\n\n`call(name, args, options)` works through the gates in this order and stops at the first refusal.\n\n1. **Idempotency replay.** When `options.idempotencyKey` is a key this dispatcher has already recorded, return the recorded result immediately and do nothing else, whatever name and arguments arrived with it.\n2. **Unknown tool.** A name that is not in `registry` gives `{ ok: false, reason: \'unknown_tool\', tool: name }`.\n3. **Scope.** When `session.scopes` does not contain the tool’s `scope` exactly, give `{ ok: false, reason: \'scope_denied\', scope: <the tool’s scope> }`. Match the whole string: a session holding `refunds` does not hold `refunds.write`.\n4. **Arguments.** Walk the schema fields in declaration order. A required field that is absent gives `problem: \'missing\'`; a present value whose `typeof` is not the declared `type` gives `\'type\'`; a present value outside a declared `enum` gives `\'enum\'`. Then walk the supplied arguments: any key the schema does not declare gives `\'unknown\'`. The first failure returns `{ ok: false, reason: \'invalid_arguments\', field, problem }` and the handler never runs. An absent optional field is fine, and `null` where a string was declared is a type failure, not a missing one.\n5. **Approval.** A tool with `approval: true` does not run. Record it and return `{ ok: false, reason: \'pending_approval\', callId }`, where `callId` is `\'CALL-1\'` for the first pending call this dispatcher creates, `\'CALL-2\'` for the second, and so on.\n6. **Execute.** Call `handler(args)`, retrying while it throws until `maxAttempts` attempts in total have been made. Missing `maxAttempts` means one attempt. Success gives `{ ok: true, value, attempts }`; exhausting the budget gives `{ ok: false, reason: \'tool_failed\', attempts, error }`, where `error` is the `message` of the last error thrown.\n\n`approve(callId)` runs a pending call under the same retry rules and returns the same shapes. A `callId` that is unknown, or that was already approved, gives `{ ok: false, reason: \'unknown_call\' }` and runs nothing.\n\nAn idempotency key records a call that produced a result: an `ok: true` execution, or a pending approval — so a replayed key returns the same `callId` instead of queuing a second refund. A refusal and a `tool_failed` are not recorded, so the caller can correct the call and use the same key again, and an approval that failed clears its key.\n\nEvery tool here is a synthetic fixture. The handlers push to an array and return authored values; nothing calls a provider, opens a socket or waits on a timer, so a failing handler is a thrown `Error` rather than real network behaviour.',
        contract: [
          'Read permissions only from `session.scopes`, and compare whole scope strings. No argument may widen what the session holds.',
          'No handler runs until the tool is known, the scope is held and the arguments have validated.',
          'Count attempts once, in the dispatcher. Do not add a second retry loop inside the argument checks or around `approve`.',
          'Do not mutate `registry` or `session`, and keep the recorded keys and pending calls inside the dispatcher you return.',
          'Everything is in memory: no network, no timers, no imports.',
        ],
        starter: `const createDispatcher = (registry, session) => {

  return {
    call: (name, args, options) => {

    },
    approve: callId => {

    },
  };
};

// Scratch pad — change this and press Run.
const demoRegistry = {
  'orders.read': {
    scope: 'orders.read',
    schema: { status: { type: 'string', required: false, enum: ['open', 'closed'] } },
    handler: args => ({ count: args.status === 'closed' ? 1 : 2 }),
  },
};
const demoSession = { operatorId: 'USR-31', scopes: ['orders.read'] };
const demo = createDispatcher(demoRegistry, demoSession);

console.log(JSON.stringify(demo.call('orders.read', { status: 'open' })));
console.log(JSON.stringify(demo.call('refunds.create', { orderId: 'ORD-4471' })));
`,
        skeleton: `const createDispatcher = (registry, session) => {
  const held = /* the scopes the session was issued */;
  const completed = {}; // idempotency key -> the result already returned
  const pending = {};   // callId -> the call waiting for approval
  let nextId = 1;

  const validate = (schema, args) => {
    for (const name of Object.keys(schema || {})) {
      // absent: 'missing' when required, otherwise skip
      // present: 'type' when typeof disagrees, then 'enum' when a list excludes it
    }
    // any supplied key the schema does not declare is 'unknown'
    return null;
  };

  const run = (tool, args) => {
    const budget = /* maxAttempts, or one */;
    // call the handler, catching a throw, until the budget is spent
  };

  const call = (name, args, options) => {
    // 1 replay  2 unknown tool  3 scope  4 arguments  5 approval  6 execute
  };

  const approve = callId => {
    // take the pending call, remove it so a second approve cannot run it, then run it
  };

  return { call, approve };
};`,
        hints: [
          'Do the idempotency lookup first, before you even look the tool up. `Object.prototype.hasOwnProperty.call(completed, key)` is the test you want, because a key like `"constructor"` is truthy on a plain object without ever having been stored.',
          'Validation has two passes over one object. The first walks `Object.keys(schema)` and checks presence, then `typeof`, then `enum`. The second walks `Object.keys(args)` and rejects any name the schema does not declare. Return the first failure you find and let the caller turn it into a result.',
          'Write the retry loop once, as a helper that takes the tool and the arguments, so `call` and `approve` share it. Count the attempt before you try, return `{ ok: true, value, attempts }` from inside the `try`, and fall out of the loop into the `tool_failed` result.',
        ],
        approach: [
          'Capture `session.scopes` and set up three pieces of dispatcher state: the recorded results by idempotency key, the pending calls by callId, and the next callId number.',
          'Write `validate(schema, args)` so it returns `{ field, problem }` for the first failure or `null`, covering missing, type, enum and undeclared keys in that order.',
          'Write `run(tool, args)` so it attempts the handler up to `maxAttempts` times, returning the value and the attempt count on success and `tool_failed` with the last message when the budget runs out.',
          'Write `call` as the six gates in order, recording an `ok: true` result or a pending approval under the idempotency key and recording nothing else.',
          'Write `approve` so it removes the pending call before running it, then settles the same idempotency key the pending call was made under.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'The dispatcher returns the right shapes and the approval state machine holds',
            critical: true,
            weight: 3,
            detail:
              'Something outside the security gates is off. Check that a valid in-scope call returns `{ ok: true, value, attempts }`, that an unknown name returns `unknown_tool` with the name attached and touches no handler, that a pending call returns `CALL-1` before `CALL-2` and counts per dispatcher, that `approve` runs the call exactly once, and that approving the same callId twice gives `unknown_call`.',
          },
          {
            id: 'scope-enforced',
            label: 'A tool outside the session’s scopes never executes',
            critical: true,
            weight: 3,
            detail:
              'The permission gate did not hold. Either a tool ran for a session that did not hold its scope, or the comparison matched something it should not: a scope check that uses a prefix, a substring or a joined string will let `refunds` stand in for `refunds.write`. The scope refusal also has to come before the argument checks, so a caller who may not use the tool gets `scope_denied` even when the arguments are missing or malformed.',
          },
          {
            id: 'validated-before-effect',
            label: 'Invalid arguments never reach a handler',
            critical: true,
            weight: 3,
            detail:
              'An argument check ran too late or too loosely. Confirm that a missing required field, a wrong `typeof`, a value outside an `enum` and an undeclared key each refuse with the right `field` and `problem`, that the handler log stays empty when they do, that an absent optional field passes, that `amountCents: 0` passes, and that `null` where a string was declared is a `type` failure rather than a `missing` one.',
          },
          {
            id: 'retry-budget',
            label: 'A failing tool is attempted at most maxAttempts times',
            critical: false,
            weight: 2,
            detail:
              'The attempt count is wrong. Check that a tool declaring three attempts is called three times and no more when it always throws, that it stops as soon as one attempt succeeds, that the returned `attempts` matches how often the handler actually ran, and that a tool with no `maxAttempts` gets exactly one attempt.',
          },
          {
            id: 'idempotent-calls',
            label: 'A repeated idempotency key returns the first result without re-executing',
            critical: false,
            weight: 2,
            detail:
              'The replay path is not returning the stored call. Check that a second call with a seen key returns the identical result and leaves the handler log unchanged, that it does so even when the tool name and arguments differ, and that replaying the key of a pending approval hands back the same `callId` instead of creating a second pending refund.',
          },
        ],
        tests: [
          {
            call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); return d.call('orders.read', { status: 'open' }); })()",
            expected: { ok: true, value: { count: 2 }, attempts: 1 },
            label: 'an in-scope call with valid arguments runs once and returns its value',
          },
          {
            call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var out = d.call('orders.purge', {}); return { out: out, ran: f.log.length }; })()",
            expected: { out: { ok: false, reason: 'unknown_tool', tool: 'orders.purge' }, ran: 0 },
            label: 'an unregistered tool name refuses and reaches no handler',
            edge: true,
          },
          {
            call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var a = d.call('refunds.create', { amountCents: 24050, currency: 'USD' }); var b = d.call('refunds.create', { orderId: 'ORD-4471', amountCents: '24050', currency: 'USD' }); var c = d.call('refunds.create', { orderId: 'ORD-4471', amountCents: 24050, currency: 'CZK' }); return { a: a, b: b, c: c, ran: f.log.length }; })()",
            expected: {
              a: { ok: false, reason: 'invalid_arguments', field: 'orderId', problem: 'missing' },
              b: { ok: false, reason: 'invalid_arguments', field: 'amountCents', problem: 'type' },
              c: { ok: false, reason: 'invalid_arguments', field: 'currency', problem: 'enum' },
              ran: 0,
            },
            label: 'a missing field, a wrong type and a value outside the enum all refuse before the handler',
            criterion: 'validated-before-effect',
          },
          {
            call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var out = d.call('orders.read', { status: 'open', tenantId: 'TEN-7788' }); return { out: out, ran: f.log.length }; })()",
            expected: { out: { ok: false, reason: 'invalid_arguments', field: 'tenantId', problem: 'unknown' }, ran: 0 },
            label: 'an argument the schema does not declare is refused rather than passed through',
            edge: true,
            criterion: 'validated-before-effect',
          },
          {
            call: "(function () { var f = __fixture({ scopes: ['orders.read'] }); var d = createDispatcher(f.registry, f.session); var out = d.call('refunds.create', { orderId: 'ORD-4471', amountCents: 24050, currency: 'USD' }); return { out: out, ran: f.log.length }; })()",
            expected: { out: { ok: false, reason: 'scope_denied', scope: 'refunds.write' }, ran: 0 },
            label: 'a session without refunds.write cannot refund, however good the arguments are',
            criterion: 'scope-enforced',
          },
          {
            call: "(function () { var f = __fixture({ syncFails: 2 }); var d = createDispatcher(f.registry, f.session); var out = d.call('ledger.sync', { batchId: 'BAT-9' }); return { out: out, ran: f.log.length }; })()",
            expected: { out: { ok: true, value: { batchId: 'BAT-9', synced: true }, attempts: 3 }, ran: 3 },
            label: 'two failures then a success: three attempts, reported as three',
            criterion: 'retry-budget',
          },
          {
            call: "(function () { var f = __fixture({ syncFails: 99 }); var d = createDispatcher(f.registry, f.session); var out = d.call('ledger.sync', { batchId: 'BAT-9' }); return { out: out, ran: f.log.length }; })()",
            expected: { out: { ok: false, reason: 'tool_failed', attempts: 3, error: 'gateway timeout' }, ran: 3 },
            label: 'a tool that always throws stops at its budget of three',
            edge: true,
            criterion: 'retry-budget',
          },
          {
            call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var a = d.call('orders.read', { status: 'open' }, { idempotencyKey: 'IDK-1' }); var b = d.call('orders.read', { status: 'open' }, { idempotencyKey: 'IDK-1' }); return { a: a, b: b, ran: f.log.length }; })()",
            expected: { a: { ok: true, value: { count: 2 }, attempts: 1 }, b: { ok: true, value: { count: 2 }, attempts: 1 }, ran: 1 },
            label: 'the same key twice: the same result, and the handler ran once',
            criterion: 'idempotent-calls',
          },
          {
            call: "(function () { var f = __fixture(); var d = createDispatcher(f.registry, f.session); var waiting = d.call('refunds.create', { orderId: 'ORD-4471', amountCents: 24050, currency: 'USD' }); var before = f.log.length; var done = d.approve(waiting.callId); return { waiting: waiting, before: before, done: done, ran: f.log.length }; })()",
            expected: {
              waiting: { ok: false, reason: 'pending_approval', callId: 'CALL-1' },
              before: 0,
              done: { ok: true, value: { refundId: 'RFD-1', amountCents: 24050 }, attempts: 1 },
              ran: 1,
            },
            label: 'a refund waits as CALL-1 and runs only once a person approves it',
          },
        ],
        harness: TOOL_FIXTURE,
      },
    },
  ],
  requires: [
    { activityId: 'fde-v1-m06-checks', state: 'verified_pass' },
    { activityId: 'fde-v1-m06-tool-dispatcher', state: 'verified_pass' },
  ],
};
