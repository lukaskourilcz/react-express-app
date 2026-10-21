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
            'Adding a refund tool needs a declared input contract, current authorization, specific approval and safe effect handling. The tool definition helps describe these decisions, but it is not the only place policy exists and is not sufficient authority to move money.',
        },
        {
          kind: 'prose',
          body:
            'A tool definition describes what callers may request; the application must enforce the relevant contract at execution. A decoder or framework may enforce some structure, but cannot establish current permission, balance or consent from a schema alone. Validate the actual arguments before passing them to an effectful handler, then enforce its live business invariants.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Know which checks the chosen decoder, framework and server actually perform. Do not assume every schema is merely a hint or that external structured decoding enforces nothing. Server-side validation and authorization still guard the effect, including cases where a call reaches the handler through another path.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: "const registry = {\n  'refunds.create': {\n    scope: 'refunds.write',\n    approval: true,\n    schema: {\n      orderId: { type: 'string', required: true },\n      amountCents: { type: 'number', required: true },\n      currency: { type: 'string', required: true, enum: ['USD', 'EUR', 'GBP'] },\n    },\n    handler: args => ledger.refund(args),\n  },\n};",
          caption: 'An illustrative custom registry, not an MCP inputSchema or full JSON Schema. Type-only amountCents accepts more than a valid financial amount; the real handler must enforce numeric/range, authorization, approval and atomic balance rules.',
        },
        {
          kind: 'prose',
          body:
            'This exercise uses a small argument-only schema language: own-field presence, JavaScript typeof and fixed enum membership. Here null is present and typeof null is object, so null for a string field is a type failure. Other schema languages define required/nullability differently and can express more than these three checks. Stateful validation still needs trusted external context.',
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
            ['This scenario’s refund policy requires checking current order/refund state', 'Handler', 'It needs authoritative state, and potentially a trusted clock; an arbitrary one-hour ban is not a universal refund rule.'],
          ],
        },
        {
          kind: 'trace',
          caption: 'One refund call through the gates: orderId is valid, but amountCents has the wrong type and currency is outside the enum.',
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
                note: 'The session holds refunds.write, so this operator may use the tool. Authorization is answered before the arguments are read, so this response does not disclose argument-validation details to an unauthorized caller. Other discovery, timing or error channels require separate controls.',
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
            'Refuse known-invalid calls before the effect. The handler must still validate current authority, approval and business state atomically with execution; reaching a handler is not automatically the point after which all validation is impossible. Recovery or compensation depends on what actually completed.',
        },
        {
          kind: 'prose',
          body:
            'Give each tool one permission name and check it against the session. The session’s scopes come from whatever authenticated the operator; an argument called `scope` or `tenantId` is a value the model chose, and a value the model chose can never widen what the operator may do. That is the same rule M03 applied to the tenant, applied here to the verb.',
        },
        {
          kind: 'prose',
          body:
            'Marlbrook’s combined orders.manage tool used one broad grant for read and refund. Splitting the tools/scopes makes least-privilege grants easier to express. A combined tool can also be safe if it enforces distinct operation permissions correctly; a mode argument does not inherently require granting every branch.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Separate tool definitions when they make authority, approval, input contracts and audit clearer. Shared implementation code can remain behind them. If operations need different permissions, enforce those distinctions whether the public interface is split or combined; tool count alone does not prove least privilege.',
        },
        {
          kind: 'prose',
          body:
            'MCP standardizes versioned tool discovery and calls; this exercise instead uses a small in-process registry. Read the actual revision a client implements rather than assuming all MCP versions negotiate at connection time. The registry’s per-field type objects are not an MCP inputSchema.',
        },
        {
          kind: 'prose',
          body:
            'MCP 2026-07-28 uses per-request version metadata, with UnsupportedProtocolVersionError listing supported revisions; clients should choose mutual support or report incompatibility. Legacy 2025-03-26 uses initialization negotiation and says a client should disconnect if it cannot support the selected version. Follow the implemented revision and ordinary retry rules; never silently interpret an unsupported version as one you know.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Unknown fields and unknown protocol versions need their documented compatibility rules. Ignoring a field is safe only when the contract permits it; authorization, required semantics or extensions may depend on that field. Parsing bytes successfully does not establish protocol support.',
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
            'A schema/permission gate is only part of execution safety. Define total retry/deadline budgets, operation identity and durable deduplication, approval binding and current-state enforcement. The in-memory exercise below isolates selected synchronous mechanics; it is not a production financial dispatcher.',
        },
        {
          kind: 'prose',
          body:
            'Nested retry layers multiply attempts. Three retries means four total attempts at a layer; three such layers can issue 4×4×4=64 underlying attempts, not 27. Three total attempts at each of three layers would give 27. Coordinate retry eligibility, counts, deadlines and delay policy across layers instead of assuming a dispatcher count sees hidden client retries.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code: '// Illustrative asynchronous runner: maxAttempts is a trusted positive integer.\n// shouldRetry includes a reliable safe-replay contract and transient-error policy.\nconst run = async (tool, args) => {\n  const budget = tool.maxAttempts ?? 1;\n  for (let attempts = 1; attempts <= budget; attempts++) {\n    try { return {ok: true, value: await tool.handler(args), attempts}; }\n    catch (error) {\n      if (attempts === budget || !tool.shouldRetry(error))\n        return {ok: false, reason: \'tool_failed\', attempts};\n      await tool.waitBeforeRetry(attempts, error);\n    }\n  }\n};',
          caption: 'This separate async sketch awaits rejections and retries only under an explicit safe-replay policy. The exercise uses synchronous synthetic handlers and its own exact result/error contract.',
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
            'A stable key enables deduplication only when the receiver enforces the documented scoped operation contract against concurrency and crashes. Bind request identity and result, state which failures are retained and define the retention window. PUT/DELETE are idempotent in intended HTTP effect, not identical response. A refund API may supply its own idempotency mechanism; merely sending a key does not make arbitrary repeated financial effects safe.',
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
              'Define the replay response',
              'Retain enough state or a reference to provide the promised replay response.',
              'A seen marker can support a duplicate acknowledgement, but cannot reconstruct the original response unless that response is stored or resolvable.',
            ],
            [
              'Define pending, success and failure retention explicitly',
              'The toy dispatcher caches success/pending and clears failed execution; real services may retain some failures or in-progress claims.',
              'A retry must follow the service’s key/payload contract; a changed intended operation may require a new key rather than overwriting old meaning.',
            ],
            [
              'Keys use an explicitly authorized namespace',
              'Authorize the namespace before lookup; a shared table can safely enforce a tenant/caller/operation boundary.',
              'Without a trusted namespace and access check, cross-tenant key collisions can expose another caller’s result.',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'The exercise deliberately uses one immutable trusted session per dispatcher instance and replays its cached key before new gates, even if the later tool/arguments differ. This is a bounded toy contract, not a recommended production authorization order. A real service must authorize cached-result access, bind the intended operation/payload, handle concurrency durably and define failure/expiry semantics. Clearing a failed key is unsafe if the effect may already have happened without a recorded result.',
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
            'Show the actual validated action, order, amount and currency in understandable terms; a rendered raw object alone is not necessarily usable consent. Bind an immutable snapshot or trusted server reference to that exact request. Model wording cannot alter the approved effect, and the server still enforces authority and current business rules.',
        },
        {
          kind: 'trace',
          caption: 'A hypothetical approval for the full 24050-cent remaining balance, reserving nothing. A colleague refunds it fully before execution; compare unchecked versus atomically checked execution.',
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
                note: '09:17, with the re-check in place. The handler atomically checks current authorization/approval and remaining balance with the effect. It sees zero remaining after the full manual refund and refuses; a separate earlier read would still leave a race. The operator gets the call back with the reason and the new balance instead of a second refund.',
                counter: { label: 'Refunded on ORD-4471, cents', value: 24050 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'At execution, enforce approval identity and relevant current state together with the effect, using a transaction, conditional write or the provider’s equivalent safe contract. A version/ETag/fingerprint can support this binding but does not by itself enforce authority or prevent a check-then-write race. If changed state invalidates the approved effect, refuse or request a fresh decision under policy. The memory exercise snapshots primitive arguments but does not implement these external-state controls.',
        },
        {
          kind: 'prose',
          body:
            'Define an approval lifetime from the actual risk and workflow policy. Expiry bounds time, not concurrent state changes: a record can change immediately after approval. Enforce both the trusted expiry condition and current-state/approval binding; no universal five-minute or operator-memory interval proves safety.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'An approval is not a permission grant. Approving one refund does not add `refunds.write` to a session that lacked it, and it does not authorize the next refund. Production execution must check relevant current authority even for approved operations. The exercise instead assumes a fixed trusted session for its entire short lifetime.',
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
      summary: 'Custom schema limits, operation permissions, handler invariants and revision-specific MCP compatibility.',
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
      summary: 'Total retry budgets, scoped durable idempotency, explicit toy limits and approval binding at execution.',
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
      summary: 'Four tool decisions: static argument validation, documented version compatibility, policy-required approval and current preconditions enforced with the effect.',
      competencies: ['tools'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-m06-q1',
          prompt: "This tool uses a static argument-only JSON Schema with a fixed currency allowlist; it performs no stateful lookups. Before refunds.create can move money, which check can that schema decide from {orderId, amountCents, currency} alone?",
          options: [
            "currency is one of the fixed allowed values USD, EUR or GBP.",
            '`amountCents` must not exceed the order’s remaining refundable balance.',
            'The operator’s session must hold the `refunds.write` scope.',
            'The order must have no refund recorded against it in the last hour.',
          ],
          correct: 0,
          explanation: "The fixed enum can be checked from the submitted currency alone. Remaining balance, current session scope and recent refunds require trusted live state and separate operation checks. A custom validator could be supplied such context, but that is outside this stated argument-only schema; it does not make model-chosen claims authoritative. All required checks still apply before the effect, with mutable preconditions protected against races. Structural validity is not permission or a guarantee of available funds.",
          competencies: ['tools'],
        },
        {
          id: 'fde-v1-m06-q2',
          prompt: "A tool response declares a protocol version your client cannot interpret. Which condition must hold before the client uses that versioned tool list or invokes its tools?",
          options: [
            "Establish a mutually supported version through the protocol’s documented flow; otherwise stop with a compatibility error.",
            'Read the tool list and ignore any field it does not recognise, since protocol changes are additive by convention.',
            'Read the tool list under the newest version the client implements and log a warning, since the server will reject anything it cannot handle.',
            'Fall back automatically to the oldest version the client still supports, so the widest range of servers keeps working.',
          ],
          correct: 0,
          explanation: "Do not treat an unsupported payload version as compatible because its JSON parses or some fields look familiar. Follow the protocol revision actually in use. In modern MCP 2026-07-28, requests declare their version; an UnsupportedProtocolVersionError lists supported versions so the client can select a common one and retry, or report no compatible version. Legacy initialization-based revisions say the client SHOULD disconnect when the server-selected version is unsupported. Neither flow licenses guessing the oldest/newest version or silently reinterpreting unknown semantics. Any retry must also respect the normal operation and retry policy.",
          competencies: ['tools'],
        },
        {
          id: 'fde-v1-m06-q3',
          prompt: "Company policy allows the listed scoped reads and unsent local drafts automatically, but requires human approval for transfers of money. All four calls already pass current session-scope checks. Which call additionally needs the policy’s approval?",
          options: [
            "refunds.create, which moves money and is not undone by simply rerunning the assistant.",
            '`orders.read`, which returns orders the operator can already open in the admin console.',
            '`tickets.search`, which searches the operator’s own tenant and returns ticket summaries.',
            '`draft.compose`, which writes a reply into the operator’s editor that nobody sends until they press send.',
          ],
          correct: 0,
          explanation: "The explicit money-transfer policy adds approval for refunds.create; session authorization remains a separate requirement. The listed reads and unsent local draft are permitted automatically in this scenario. That does not make every read harmless or establish a universal rule that reads never need approval: sensitive exports and other policies may differ. Keep the draft visible and reversible before its separate send action. An approval should cover the actual effect/parameters and must not replace current authorization or live business checks.",
          competencies: ['tools'],
        },
        {
          id: 'fde-v1-m06-q4',
          prompt: "Approval records intent but reserves no balance. At 09:12 an operator approved a 24050-cent refund, equal to the remaining refundable balance. A colleague fully refunded that order at 09:15; the dispatcher reaches the approved call at 09:17. Why must it revalidate before the effect?",
          options: [
            "Consent is not a reservation; atomically enforce current authorization, balance and replay protections, and refuse the exhausted balance.",
            'The approval is stale, and every approval must carry a time limit shorter than five minutes.',
            'The dispatcher cannot rely on the operator’s judgement, so it re-evaluates the decision itself before acting.',
            'The retry budget resets when a call is approved, so the call has to be re-validated to avoid a duplicate attempt.',
          ],
          correct: 0,
          explanation: "The approval refers to the described effect, not a guarantee that its mutable preconditions remain true. Here the refundable balance is now zero, so the approved amount is no longer allowed. Enforce the live checks together with the effect using the appropriate transaction/conditional operation so another change cannot race between checking and writing. Approval expiry can be an additional policy control, but no universal five-minute limit follows from this example. Revalidation is not replacing the operator’s judgement; it applies current facts and permission. A retry budget alone does not prevent duplicate writes or reserve funds.",
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
          'Write `createDispatcher(registry, session)`, returning `{ call, approve }`. It is the single place where a proposed tool call turns into an effect, so every boundary in this module lands in it.\n\n`registry` maps a tool name to `{ scope, schema, handler, approval?, maxAttempts? }`. A `schema` maps an argument name to `{ type, required, enum? }`, where `type` is compared with `typeof`. `session` is `{ operatorId, scopes }`, and `scopes` is the only place a permission may come from.\n\n`call(name, args, options)` works through the gates in this order and stops at the first refusal.\n\n1. **Idempotency replay.** When `options.idempotencyKey` is a key this dispatcher has already recorded, return the recorded result immediately and do nothing else, whatever name and arguments arrived with it.\n2. **Unknown tool.** A name that is not in `registry` gives `{ ok: false, reason: \'unknown_tool\', tool: name }`.\n3. **Scope.** When `session.scopes` does not contain the tool’s `scope` exactly, give `{ ok: false, reason: \'scope_denied\', scope: <the tool’s scope> }`. Match the whole string: a session holding `refunds` does not hold `refunds.write`.\n4. **Arguments.** Walk the schema fields in declaration order. A required field that is absent gives `problem: \'missing\'`; a present value whose `typeof` is not the declared `type` gives `\'type\'`; a present value outside a declared `enum` gives `\'enum\'`. Then walk the supplied arguments: any key the schema does not declare gives `\'unknown\'`. The first failure returns `{ ok: false, reason: \'invalid_arguments\', field, problem }` and the handler never runs. An absent optional field is fine, and `null` where a string was declared is a type failure, not a missing one.\n5. **Approval.** A tool with `approval: true` does not run. Store a private shallow snapshot of the validated primitive arguments and return `{ ok: false, reason: \'pending_approval\', callId }`, where `callId` is `\'CALL-1\'` for the first pending call this dispatcher creates, `\'CALL-2\'` for the second, and so on.\n6. **Execute.** Call `handler(args)`, retrying while it throws until `maxAttempts` attempts in total have been made. Missing `maxAttempts` means one attempt. Success gives `{ ok: true, value, attempts }`; exhausting the budget gives `{ ok: false, reason: \'tool_failed\', attempts, error }`, where `error` is the `message` of the last error thrown.\n\n`approve(callId)` runs a pending call under the same retry rules and returns the same shapes. A `callId` that is unknown, or that was already approved, gives `{ ok: false, reason: \'unknown_call\' }` and runs nothing.\n\nAn idempotency key records a call that produced a result: an `ok: true` execution, or a pending approval — so a replayed key returns the same `callId` instead of queuing a second refund. A refusal and a `tool_failed` are not recorded, so the caller can correct the call and use the same key again, and an approval that failed clears its key.\n\nDomain: one immutable trusted tenant/operator authorization context per dispatcher. Registry, session and schema stay fixed; at most 10 tools/scopes/schema fields and 50 calls are used. Tool names, argument names and idempotency keys are strings of at most 100 UTF-16 units. Schemas use string/number/boolean typeof rules and primitive enums. Arguments are ordinary own enumerable flat primitive fields, optionally missing/null as a whole; no getters, proxies, nested mutable values or prototype tricks. maxAttempts is absent or an integer 1–3. Handlers are synchronous, return bounded JSON-like values, and throw Error objects on the authored transient failures. Treat returned results as read-only.\n\nThe early replay path is valid only for this fixed trusted instance; it is not production authentication, durable/concurrent idempotency or authorization of cached results. approve represents an already trusted approval event, not verification of a human identity. The exercise has no current-order store, provider transaction, approval expiry or revocation mechanism. Its unconditional throw-retry and failed-key clearing are fixture contracts, not safe defaults for real financial effects.\n\nEvery tool here is a synthetic fixture. The handlers push to an array and return authored values; nothing calls a provider, opens a socket or waits on a timer, so a failing handler is a thrown `Error` rather than real network behaviour.',
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

// Scratch pad — change this before submitting.
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
