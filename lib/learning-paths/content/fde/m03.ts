/** M03 — Enterprise boundaries.
 *
 * The module between the connector and everything that reads from it. M02
 * taught the sync to survive a messy feed; this one decides who is allowed to
 * see what came back. Two lessons, one four-question check, one graded tool
 * wrapper.
 *
 * The three repairs the wrapper needs are the three mistakes that show up in
 * real reviews: a tenant id taken from the caller's arguments, a permission
 * checked only when one happened to be present, and a filter applied after
 * the rows were already fetched. Each has its own critical criterion, because
 * a tenant leak cannot be averaged away by a correct record shape.
 *
 * Marlbrook Systems, its two tenants — Dunfold Freight and Kestrel Foods —
 * their order ids, users and grants are fixtures written for this module. The
 * store and the session are object literals in the task harness. There is no
 * live database, no model, no vendor account and no network call anywhere in
 * it, and no real customer data appears in it. */

import type { ModuleSource } from '../../types';

/** The two-tenant order store and the session builder the assertions run
 * against. Appended after the learner's code, so neither the store nor the
 * grant builder can be shadowed by a same-named declaration.
 *
 * `scanAll` exists on purpose: it is the call a post-fetch filter needs, and
 * `store.reads` is what lets the grade see that it was used. A wrapper that
 * reads every tenant's rows and filters them afterwards returns the right
 * records and still fails, which is the whole point of the exercise. */
const ORDER_STORE = `
var __ROWS = [
  { id: 'ORD-1001', tenantId: 'TEN-4021', customer: 'Halloway Depot', status: 'open', total: 240.5 },
  { id: 'ORD-2001', tenantId: 'TEN-7788', customer: 'Brant and Ivey', status: 'open', total: 512 },
  { id: 'ORD-1002', tenantId: 'TEN-4021', customer: 'Halloway Depot', status: 'shipped', total: 1180 },
  { id: 'ORD-2002', tenantId: 'TEN-7788', customer: 'Marrow Fields', status: 'held', total: 78.4 },
  { id: 'ORD-1005', tenantId: 'TEN-4021', customer: 'Petrie Cold Chain', status: 'open', total: 96.25 }
];

var __clone = function (row) { return JSON.parse(JSON.stringify(row)); };

var __makeStore = function (rows) {
  var data = (rows || __ROWS).map(__clone);
  var store = {
    reads: [],
    scanAll: function () {
      store.reads.push('scanAll:*');
      return data.map(__clone);
    },
    queryOrders: function (tenantId, filter) {
      store.reads.push('queryOrders:' + String(tenantId));
      var status = filter && filter.status ? filter.status : null;
      return data
        .filter(function (row) { return row.tenantId === tenantId; })
        .filter(function (row) { return status === null || row.status === status; })
        .map(__clone);
    }
  };
  return store;
};

var __store = function () { return __makeStore(null); };

var __grant = function (tenantId, patch) {
  var grant = { scope: 'orders.read', tenantId: tenantId, expiresAt: '2026-04-02T17:00:00Z', revokedAt: null };
  if (patch) {
    for (var patchKey in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, patchKey)) grant[patchKey] = patch[patchKey];
    }
  }
  return grant;
};

var __session = function (overrides) {
  var session = {
    userId: 'USR-31',
    tenantId: 'TEN-4021',
    at: '2026-04-02T09:00:00Z',
    grants: [__grant('TEN-4021', null)]
  };
  if (overrides) {
    for (var key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) session[key] = overrides[key];
    }
  }
  return session;
};

var __ids = function (out) {
  return (out.records || []).map(function (record) { return record.id; });
};

var __tenants = function (out) {
  var seen = [];
  (out.records || []).forEach(function (record) {
    if (seen.indexOf(record.tenantId) === -1) seen.push(record.tenantId);
  });
  return seen.sort();
};
`.trim();

export const FDE_M03: ModuleSource = {
  id: 'fde-v1-m03',
  title: 'Enterprise boundaries',
  outcomes: [
    'Separate who the caller is from who they are acting for, and take the tenant from the verified session rather than from anything the caller or the model wrote.',
    'Scope the query instead of filtering the result, and say what a post-fetch filter has already exposed by the time it runs.',
    'Decide a permission at the point of use, so an expired or revoked grant stops the next action rather than the next job.',
    'Write an audit entry someone can reconstruct six months later, and a retention promise that names every copy you made.',
  ],
  competencies: ['boundaries'],
  dependsOn: ['fde-v1-m02'],
  estimatedMinutes: 110,
  lessons: [
    {
      id: 'fde-v1-m03-l1',
      title: 'Identity and tenant access',
      summary:
        'The three identities in one request, why the tenant has to come from the verified session, and why a filter applied after the fetch is not a boundary.',
      estimatedMinutes: 25,
      sources: [
        { label: 'RFC 9110 — HTTP Semantics', url: 'https://www.rfc-editor.org/rfc/rfc9110', reviewedOn: '2026-09-08' },
        {
          label: 'MDN — HTTP response status codes',
          url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'Model Context Protocol specification',
          url: 'https://modelcontextprotocol.io/specification',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'This workbench asks who is calling and which tenant/action that caller is currently allowed to access. Verify the request context and current authorization; successful sign-in alone does not prove every later action is allowed.',
        },
        {
          kind: 'prose',
          body:
            'Authentication answers the first question: the server checked a credential and knows it is talking to user USR-31. Authorization answers a narrower one: may this caller do this action, to this record, right now. A system that gets the first right and treats the second as a formality is the system that shows Dunfold Freight an order belonging to Kestrel Foods.',
        },
        {
          kind: 'table',
          caption: 'Four things a single tool call carries that all look like identity, and only one of which decides the tenant.',
          headers: ['What it is', 'Where it comes from', 'What it is allowed to decide'],
          rows: [
            [
              'The principal',
              'Trusted caller context verified for the current request',
              'Which grants apply, and whose name goes in the audit entry',
            ],
            [
              'The tenant',
              'The currently authorized active tenant; this workbench fixes it for the call',
              'Which customer’s rows the query is allowed to touch',
            ],
            [
              'The service identity',
              'The database credential the process itself holds',
              'Only the access its database role actually holds; it does not establish the caller’s tenant permission',
            ],
            [
              'The tool arguments',
              'The model, from text it read a moment ago',
              'Filters inside the tenant the session already fixed, and nothing wider',
            ],
          ],
        },
        {
          kind: 'prose',
          body:
            'A privileged service can become a confused deputy if it uses its own database access on behalf of an unauthorized caller. Service credentials need least privilege; they need not have access to every tenant. Tool arguments may be influenced by a model, user or external content. The server must resolve authority from trusted context. This workbench ignores proposed tenant selectors; another API may accept a selector only after explicit membership and permission checks.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code:
            '// Unsafe with an unrestricted store: the caller selects a tenant without authorization.\nconst unsafeReadOrders = (session, args) =>\n  store.queryOrders(args.tenantId, { status: args.status });\n\n// This workbench uses its trusted, currently authorized active tenant.\nconst scopedReadOrders = (session, args) =>\n  store.queryOrders(session.tenantId, { status: args.status });',
          caption: 'The comparison assumes an unrestricted store and a preverified active-tenant context. The scoped version still needs grant enforcement and an actual store access policy.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Tool arguments, retrieved documents and model output do not grant authority. Enforce the chosen authorization policy outside the model on every relevant request/effect. Prompt instructions and structured framing may reduce risk, but they do not replace server permission checks. Identity claims and data access must follow the actual trusted path.',
        },
        {
          kind: 'prose',
          body:
            'This workbench requires the storage query itself to be tenant-scoped. Fetching every tenant into the application and filtering afterwards violates that policy even if the final result happens to be correct. Other trusted aggregation services may have different permissions and policies; do not infer an external leak solely because broad data was fetched.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code:
            '// Broad fetch: all tenants enter the application, against this workbench policy.\nconst allRows = store.scanAll();\nlogger.info(\'orders fetched\', { count: allRows.length });\nconst filteredRows = allRows.filter(row => row.tenantId === session.tenantId);\n\n// Scoped fetch: the store must actually enforce the supplied tenant boundary.\nconst scopedRows = store.queryOrders(session.tenantId, {});',
          caption: 'Broad and scoped reads have different data exposure. A scoped method name alone proves no access policy; inspect its implementation, role and storage enforcement.',
        },
        {
          kind: 'prose',
          body:
            'A broad fetch places more tenants’ data in the process and increases the consequences of a logging, caching, exception-reporting or filtering mistake. A log containing an all-tenant count exposes that aggregate to its readers, not necessarily the underlying rows. An exception includes row payloads only if the reporting configuration attaches them. Evaluate actual data flows and permissions rather than claiming every broad fetch already leaked all records.',
        },
        {
          kind: 'trace',
          caption:
            'One tool call whose arguments ask for the wrong tenant, stepped through the wrapper. Read the notes before you read the fix in the exercise.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['Verify session', 'Read arguments', 'Resolve tenant', 'Check grant', 'Query store', 'Return'],
                note: 'The assistant proposes one call: orders.read, with arguments { status: "open", tenantId: "TEN-7788" }. Nothing has been decided yet.',
              },
              {
                cells: ['Verify session', 'Read arguments', 'Resolve tenant', 'Check grant', 'Query store', 'Return'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The server verifies this request context: user USR-31 and currently authorized active tenant TEN-4021, Dunfold Freight. These values do not come from the model-proposed request body.',
              },
              {
                cells: ['Verify session', 'Read arguments', 'Resolve tenant', 'Check grant', 'Query store', 'Return'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'active' },
                ],
                note: 'The wrapper reads the arguments. `status` is a filter the model is allowed to choose. `tenantId` is dropped here and never read again.',
              },
              {
                cells: ['Verify session', 'Read arguments', 'Resolve tenant', 'Check grant', 'Query store', 'Return'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'excluded' },
                  { index: 2, role: 'active' },
                ],
                note: 'The tenant is TEN-4021, taken from the session. The argument asking for TEN-7788 changed nothing, and the call that carried it returns exactly what the same call without it returns.',
              },
              {
                cells: ['Verify session', 'Read arguments', 'Resolve tenant', 'Check grant', 'Query store', 'Return'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'excluded' },
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'active' },
                ],
                note: 'Under this fixture policy, a matching unrevoked orders.read grant expires at 17:00 and the trusted request time is 09:00, so it permits the read. A TEN-7788 grant does not authorize TEN-4021.',
              },
              {
                cells: ['Verify session', 'Read arguments', 'Resolve tenant', 'Check grant', 'Query store', 'Return'],
                marks: [
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'active' },
                ],
                note: 'The store is asked for TEN-4021 open orders. With the stipulated scoped store, Kestrel’s rows do not enter this result; the wrapper does not need a post-fetch tenant filter.',
              },
              {
                cells: ['Verify session', 'Read arguments', 'Resolve tenant', 'Check grant', 'Query store', 'Return'],
                marks: [
                  { index: 3, role: 'settled' },
                  { index: 4, role: 'settled' },
                  { index: 5, role: 'active' },
                ],
                note: 'Two orders come back. The wrapper returns the id, tenant, status and total, and drops the customer name nobody asked for.',
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'Use application scoping and appropriate storage enforcement, such as correctly configured row-level security or a restricted per-tenant credential. Check which role the query actually uses and whether it bypasses those rules. Defense in depth can contain some wrapper bugs; two checks are not an unconditional guarantee against a breach, especially if they share a flawed authority source.',
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'RFC 9110 distinguishes missing/invalid authentication credentials (401) from a request the server understands but refuses (403), and permits 404 to conceal a forbidden resource. This workbench can use a consistent public refusal for inaccessible and nonexistent records to reduce enumeration. That is a chosen disclosure policy, not a universal requirement; timing, metadata and other responses also need review. Keep precise internal reasons without exposing sensitive details.',
        },
        {
          kind: 'prose',
          body:
            'Write the rule down where the next engineer will meet it. One sentence at the top of the wrapper — the tenant comes from the session, arguments may only narrow within it — costs less than the review meeting that follows the first cross-tenant read, and it is the sentence the exercise at the end of this module asks you to make true in code.',
        },
      ],
    },
    {
      id: 'fde-v1-m03-l2',
      title: 'Data lifecycle and audit',
      summary:
        'Every copy you made, deletion that actually removes, the audit entry someone can reconstruct later, and the difference between a permission that expired and one that was revoked.',
      estimatedMinutes: 25,
      sources: [
        {
          label: 'NIST AI Risk Management Framework',
          url: 'https://www.nist.gov/itl/ai-risk-management-framework',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'OpenTelemetry — Traces',
          url: 'https://opentelemetry.io/docs/concepts/signals/traces/',
          reviewedOn: '2026-09-08',
        },
        {
          label: 'MDN — Date.prototype.toISOString',
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString',
          reviewedOn: '2026-09-08',
        },
      ],
      sections: [
        {
          kind: 'prose',
          body:
            'The first question Dunfold’s security reviewer asks is not how the assistant works. She asks what it keeps, for how long, and what happens on the day her legal team sends a deletion request. If the answer is a shrug, the project stops at her desk, and she is right to stop it.',
        },
        {
          kind: 'prose',
          body:
            'Inventory the copies the system actually makes: primary rows, caches, derived indexes, logs, error reports, backups and exports are common categories, not an inevitable fixed count. Assign retention and deletion responsibilities before use. Identifiers can also be sensitive; data minimization does not exempt id-only records from access and lifecycle rules.',
        },
        {
          kind: 'table',
          caption: 'Where one ticket ends up, who made each copy, and what deletion has to do about it.',
          headers: ['Copy', 'Who created it', 'What deletion has to do'],
          rows: [
            ['The primary row', 'Your sync, on first read', 'Remove it, and say whether removal means the row is gone or hidden'],
            ['A response cache', 'Your own read path, for speed', 'Evict the key, or the deleted ticket keeps answering for the length of the TTL'],
            ['A derived index', 'The embedding or search job that ran afterwards', 'Delete the derived rows too; they are the ticket in another shape'],
            ['Application logs', 'Every handler that logged the payload instead of the id', 'Minimize payloads, restrict access and apply the retention/deletion policy to identifiers and bodies; deletion capability depends on the log system'],
            ['An error report', 'The crash that attached the request payload', 'Scrub it, and stop attaching payloads before the next one'],
            ['Last night’s backup', 'The scheduled snapshot', 'Document restricted access, retention/expiry, applicable exceptions and how restored data will respect prior deletions'],
            ['An operator’s export', 'A person, in a spreadsheet', 'Identify the export owner, approved storage and deletion process; do not promise control you have not established'],
          ],
        },
        {
          kind: 'prose',
          body:
            'State the operation precisely. Setting deletedAt is usually a visibility/retention change, not removal of the underlying row. Hard removal from a primary table also does not prove all caches, indexes, logs, backups or exports are gone. Undo windows and retention obligations depend on the actual policy and applicable requirements; describe what remains accessible, to whom, and for how long rather than promising complete deletion without evidence.',
        },
        {
          kind: 'code',
          language: 'javascript',
          code:
            '// Sketch: trusted tenant/record and current deletion authority are checked first.\n// The primary deletion and durable cleanup job commit together in one database.\nawait db.transaction(async tx => {\n  await tx.tickets.remove({ id, tenantId });\n  await tx.cleanupJobs.insert({ action: \'ticket.delete\', tenantId, id });\n});\n\n// A worker retries this job idempotently; partial failure is not completion.\nawait cache.evict(`ticket:${tenantId}:${id}`);\nawait index.removeByDocument({ tenantId, id });\nawait audit.write({ action: \'ticket.delete\', tenantId, targetIds: [id], decision: \'allow\' });',
          caption: 'Illustrative APIs, not a live deletion implementation. Scoped cache/index cleanup needs durable retry and completion tracking; this sketch does not erase every copy, backup or concurrent recreation.',
        },
        {
          kind: 'callout',
          tone: 'warning',
          body:
            'Backup deletion capabilities vary. If approved policy retains a restricted backup until expiry, state its window and exceptions accurately, enforce access limits, and ensure restore procedures reapply required deletions before returning data to service. Verify those procedures and applicable obligations; a backup expiry promise is not evidence that every live or exported copy has been removed.',
        },
        {
          kind: 'prose',
          body:
            'An audit record should support attribution and investigation: who acted, for which tenant, on which targets, with what decision and authority reference. A single JSON entry cannot necessarily reconstruct the historical decision. That may require preserved policy versions, grant history, request inputs and trusted timing under an appropriate retention/access policy. Do not log full sensitive payloads merely to make a record self-contained.',
        },
        {
          kind: 'code',
          language: 'json',
          code:
            '{\n  "at": "2026-04-02T09:14:11.204Z",\n  "requestId": "req-9d2f41",\n  "actor": { "type": "user", "id": "USR-31" },\n  "onBehalfOfTenant": "TEN-4021",\n  "action": "orders.read",\n  "targetIds": ["ORD-1001", "ORD-1005"],\n  "decision": "allow",\n  "reason": "grant_valid",\n  "grantId": "GRT-77",\n  "policyVersion": 4,\n  "source": "assistant-tool-call"\n}',
          caption: 'A hypothetical attribution/correlation entry. It avoids full order bodies, but ids still need protection; historical reconstruction also needs retained policy and authorization context.',
        },
        {
          kind: 'table',
          caption: 'Each field of that entry, and the question a reviewer cannot answer without it.',
          headers: ['Field', 'What it answers', 'What its absence costs'],
          rows: [
            ['`actor`', 'Which person or service acted', 'Every entry reads “the assistant did it”, and nobody is accountable'],
            ['`onBehalfOfTenant`', 'Whose data was touched', 'You cannot tell a normal read from a cross-tenant one'],
            ['`action` and `targetIds`', 'What was done, to which records', 'You know something happened and not what'],
            ['`decision` and `reason`', 'Allowed or refused, and on what ground', 'Refusals vanish, so an attack looks like silence'],
            ['`grantId`, `policyVersion`', 'Which permission and which version of the rules applied', 'A version/id supports lookup only if the relevant historical policy, grant and decision inputs remain available'],
            ['`at` in UTC, `requestId`', 'When, and which request this belongs to', 'You cannot line the entry up with the trace or the logs beside it'],
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          body:
            'Record the refusals as loudly as the successes. A log with only allows cannot show you the afternoon somebody tried forty tool calls against another tenant and was stopped every time. And log ids, not bodies: an audit entry that copies the order rows into itself has just made another copy of the data, with its own retention and its own access list.',
        },
        {
          kind: 'prose',
          body:
            'Expiry is a time condition evaluated using a trusted clock and defined boundary; it does not itself require an invalidation event, but the system still needs valid trusted context. Revocation changes authorization before the original expiry. Its enforcement delay depends on authoritative lookups, cache rules, invalidation or introspection; it need not always wait for a cache TTL. Define when in-flight actions and later batches must recheck and fail closed as required by policy.',
        },
        {
          kind: 'table',
          caption: 'Four permission states under this workbench’s point-of-use policy; cache and in-flight behavior must be specified separately.',
          headers: ['State', 'What the wrapper does', 'What the entry records'],
          rows: [
            ['Valid grant', 'Runs the action inside the tenant on the grant', '`allow`, with the grant id and the policy version'],
            ['Expired', 'Refuses the next action; the clock already told it, with no message needed', '`deny`, reason `grant_expired`, with the expiry time'],
            ['Revoked', 'Refuses when the authoritative point-of-use check observes revocation; define and test any permitted caching delay', '`deny`, reason `grant_revoked`, with who revoked it and when'],
            ['Never granted', 'Refuses under the chosen public disclosure policy, with a precise internal reason', '`deny`, reason `no_grant`, with the scope that was asked for'],
          ],
        },
        {
          kind: 'trace',
          caption:
            'An export of 60 orders that runs past its own grant. Step through it: the check that matters is the one before the next batch, not the one at the start.',
          trace: {
            shape: 'array',
            frames: [
              {
                cells: ['Start', 'Batch 1', 'Batch 2', 'Batch 3', 'Finish'],
                note: 'An operator starts an export of 60 Dunfold orders at 16:50. Her grant for TEN-4021 expires at 17:00, which nobody notices.',
                counter: { label: 'Rows exported', value: 0 },
              },
              {
                cells: ['Start', 'Batch 1', 'Batch 2', 'Batch 3', 'Finish'],
                marks: [{ index: 0, role: 'active' }],
                note: 'The wrapper checks the grant before the first batch. Ten minutes left, so the export begins.',
                counter: { label: 'Rows exported', value: 0 },
              },
              {
                cells: ['Start', 'Batch 1', 'Batch 2', 'Batch 3', 'Finish'],
                marks: [
                  { index: 0, role: 'settled' },
                  { index: 1, role: 'active' },
                ],
                note: 'Batch one at 16:53. The grant is checked again, it holds, and 20 rows are written.',
                counter: { label: 'Rows exported', value: 20 },
              },
              {
                cells: ['Start', 'Batch 1', 'Batch 2', 'Batch 3', 'Finish'],
                marks: [
                  { index: 1, role: 'settled' },
                  { index: 2, role: 'active' },
                ],
                note: 'Batch two at 16:58. Still valid, 20 more rows. Under the stated per-batch policy, a start-only check would not protect the next batch at 17:01.',
                counter: { label: 'Rows exported', value: 40 },
              },
              {
                cells: ['Start', 'Batch 1', 'Batch 2', 'Batch 3', 'Finish'],
                marks: [
                  { index: 2, role: 'settled' },
                  { index: 3, role: 'excluded' },
                ],
                note: 'Batch three at 17:01. The grant expired at 17:00, so the check refuses and no rows are written. The job stops here rather than finishing what it started.',
                counter: { label: 'Rows exported', value: 40 },
              },
              {
                cells: ['Start', 'Batch 1', 'Batch 2', 'Batch 3', 'Finish'],
                marks: [
                  { index: 3, role: 'excluded' },
                  { index: 4, role: 'excluded' },
                ],
                note: 'The audit records one deny: actor USR-31, tenant TEN-4021, action orders.export, grant GRT-77, reason grant_expired, 40 of 60 rows already written. Before resuming, obtain a fresh grant and verify the persisted checkpoint and source snapshot/cursor contract; simply starting at a row number may skip or repeat changed data.',
                counter: { label: 'Rows exported', value: 40 },
              },
            ],
          },
        },
        {
          kind: 'prose',
          body:
            'This exercise’s export policy requires a current grant before each 20-row batch, with no continuation after expiry. Other systems must define authorization duration and in-flight behavior explicitly. Rechecking bounds the gap at the chosen decision points; it does not by itself cancel an already running external effect. Define the trusted clock, source of current grants, failure behavior, checkpoints and any permitted cache lifetime, then verify the implementation.',
        },
      ],
    },
  ],
  activities: [
    {
      id: 'fde-v1-m03-l1-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: identity and tenant access',
      summary: 'Current request authority, fixed active-tenant policy, scoped storage and bounded disclosure risks.',
      competencies: ['boundaries'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m03-l1',
    },
    {
      id: 'fde-v1-m03-l2-read',
      kind: 'lesson',
      purpose: 'exercise',
      verification: 'self_reviewed',
      title: 'Read: data lifecycle and audit',
      summary: 'Actual data-copy inventory, scoped cleanup and recovery, bounded audit evidence and explicit grant freshness policy.',
      competencies: ['boundaries'],
      estimatedMinutes: 25,
      lessonId: 'fde-v1-m03-l2',
    },
    {
      id: 'fde-v1-m03-checks',
      kind: 'check',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Boundary checks',
      summary: 'Four boundary questions under explicit policies: active-tenant authority, scoped storage access, per-batch grants and useful audit attribution/correlation.',
      competencies: ['boundaries'],
      estimatedMinutes: 15,
      passThreshold: 0.8,
      questions: [
        {
          id: 'fde-v1-m03-q1',
          prompt:
            'This run is bound by policy to the active tenant in a server-verified session; even membership in another tenant does not permit switching this run. The model supplies tool arguments. Which tenant source must the wrapper use while checking current permission?',
          options: [
            'The server-verified active-tenant session, with current authorization checked for the operation.',
            'From the `tenantId` argument on the tool call, after checking that it names a tenant the store knows about.',
            'From the `X-Tenant-Id` header the client sends, after checking the operator belongs to that tenant.',
            'From the `tenantId` on the records themselves, once the query has returned them.',
          ],
          correct: 0,
          explanation:
            'Under this explicit fixed-tenant policy, use the server-verified active tenant and current authorization. A valid credential from sign-in alone does not guarantee every later operation remains permitted. The tool argument is written by the model from text it just read, so checking that it names a real tenant only proves the attacker picked an existing one. The header is written by the client; a membership-checked header can be valid in a different design that explicitly permits tenant selection, but it does not satisfy this run’s fixed-active-tenant policy. Reading the tenant off the returned rows is the post-fetch filter, and by then the rows are already in your process.',
          competencies: ['boundaries'],
        },
        {
          id: 'fde-v1-m03-q2',
          prompt:
            'The policy requires tenant scope at the storage query. A handler instead fetches all tenants and correctly filters before returning only the caller’s rows. Why does this still violate that policy and least-data-access design?',
          options: [
            'A JavaScript comparison of two tenant ids can differ from the database’s collation, so the filter may keep a row the store would have excluded.',
            'Unrelated tenants’ rows enter the handler before filtering, increasing exposure to later logging, error or aggregation mistakes.',
            'The extra rows make the request slow enough to time out under load, and a timed-out request returns the unfiltered set.',
            'The filter cannot see rows written since the query started, so the caller misses their own most recent orders.',
          ],
          correct: 1,
          explanation:
            'The broad fetch already violates the stated storage-scope policy by bringing unrelated rows into the handler. It expands the data exposed to later mistakes; it does not prove that every log or crash report actually contains those rows. Apply the authorized tenant at the query and use an appropriate independent database policy where supported. Collation is a real hazard in a different discussion and would produce a wrong result rather than this one. The latency claim is backwards — a fast leak is still a leak, and a timeout returns an error, not the raw set. Missing later writes is a consistency question, not the stated storage-scope defect; its behavior depends on the query and isolation model.',
          competencies: ['boundaries'],
        },
        {
          id: 'fde-v1-m03-q3',
          prompt:
            'Policy requires a currently valid grant before every batch and forbids self-extension. An export writes exactly 20 orders per successful batch. After two batches, the operator’s grant expires before batch three starts. What must the wrapper do?',
          options: [
            'Finish the run: the grant was checked and valid when the job started, and re-checking a permission mid-job makes long exports unreliable.',
            'Finish the run but flag the remaining rows for review, because an expiry ends future authorizations while a revocation ends current ones.',
            'Refuse the third batch, stop the job, and record the denial together with the 40 rows already written.',
            'Extend the grant for the remaining batches, since the operator was authorized when the work began and nobody revoked it.',
          ],
          correct: 2,
          explanation:
            'The stated policy requires authorization again before batch three, when this grant is no longer valid. Stop before writing that batch and record the denial plus the 40 rows already written; denial does not undo completed external work. A start-only check does not meet this policy, and the wrapper cannot renew its own authority. Expiry and revocation have different mechanisms and propagation rules in different systems, so do not infer a universal in-flight rule beyond the contract given here.',
          competencies: ['boundaries'],
        },
        {
          id: 'fde-v1-m03-q4',
          prompt:
            'Which candidate best records who read which tenant’s orders, the authorization decision and policy/grant correlation, without copying complete customer rows into this audit entry?',
          context: {
            language: 'json',
            code:
              '[\n  { "entry": "A", "at": "2026-04-02T09:14:11Z", "message": "Operator exported orders" },\n\n  { "entry": "B", "at": "2026-04-02T09:14:11Z", "actor": "USR-31", "action": "orders.read",\n    "decision": "allow",\n    "records": [{ "id": "ORD-1001", "customer": "Halloway Depot", "total": 240.5 }] },\n\n  { "entry": "C", "at": "2026-04-02T09:14:11Z", "requestId": "req-9d2f41", "actor": "USR-31",\n    "onBehalfOfTenant": "TEN-4021", "action": "orders.read",\n    "targetIds": ["ORD-1001", "ORD-1005"],\n    "decision": "allow", "grantId": "GRT-77", "policyVersion": 4 },\n\n  { "entry": "D", "at": "09:14", "actor": "assistant", "action": "read", "decision": "allow" }\n]',
          },
          options: [
            'C: actor, tenant, action/targets, decision, grant/policy and request correlation.',
            'B, because it stores the rows themselves, so a reviewer can see exactly which data left the system without trusting anything else.',
            'A, because a plain sentence is what a reviewer actually reads, and the UTC timestamp is enough to find the matching request in the logs.',
            'D, because it is the smallest entry that still records an actor, an action and a decision, and short entries are the ones teams keep writing.',
          ],
          correct: 0,
          explanation:
            'C records the requested attribution and correlation fields. Fully reproducing a past decision also needs the relevant historical policy/grant versions and decision inputs; a version number alone does not reconstruct them. B copies customer details and totals that are not needed for this entry’s stated purpose, while omitting tenant and grant attribution. Protect and retain audit evidence according to the actual policy; this question does not set a universal retention period. A has no actor, no tenant and no ids, so it is a sentence rather than a record. D records the software as the actor and a local time with no date or zone, which is exactly the entry that cannot be lined up with anything else six months later.',
          competencies: ['boundaries'],
        },
      ],
    },
    {
      id: 'fde-v1-m03-tenant-tool-wrapper',
      kind: 'code',
      purpose: 'exercise',
      verification: 'machine_verified',
      title: 'Tenant-scoped tool wrapper',
      summary:
        'Repair a wrapper that trusts the caller’s tenant argument, checks a permission only when one is present, and filters after fetching. Graded on behaviour, on tenant isolation and on permission freshness.',
      competencies: ['boundaries'],
      estimatedMinutes: 45,
      code: {
        language: 'javascript',
        prompt:
          'Repair `callTool(session, request, store)`, the wrapper every tool call at Marlbrook passes through. It returns `{ ok: true, records }` when the call is allowed, and `{ ok: false, reason }` when it is refused.\n\n`session` is trusted context freshly established by the server for this request under the exercise policy: `userId`, `tenantId`, `at` (the trusted instant at which this synchronous read is authorized) and `grants`, always an array of `{ scope, tenantId, expiresAt, revokedAt }`. `request` is what the assistant proposed: `tool`, and usually `arguments`. `store` is the customer database.\n\nThe version you have been given almost works, and the scratch pad shows what "almost" costs: it takes the tenant from `request.arguments`, it checks the expiry only when a grant happened to be found, and it fetches every tenant’s rows and filters them afterwards. Repair all three.\n\nWhat it must do, in this order:\n\n1. **An unknown tool refuses first.** This wrapper serves `orders.read` and nothing else. Any other `tool` returns `{ ok: false, reason: \'unknown_tool\' }` before anything else is examined.\n2. **The tenant comes from the session.** Query `session.tenantId`. `request.arguments.tenantId` was written by the model, so never read it: a call carrying one must return exactly what the same call without it returns. `arguments` may be missing entirely.\n3. **A grant must match the scope and the tenant.** Use the grant whose `scope` equals the tool and whose `tenantId` equals `session.tenantId`. If there is none, return `{ ok: false, reason: \'no_grant\' }` — including when the session carries a grant for the same scope issued to a different tenant.\n4. **A stale grant refuses.** A grant is revoked when `revokedAt` is set and falls at or before `session.at`, giving `{ ok: false, reason: \'grant_revoked\' }`. A grant is expired when `expiresAt` falls at or before `session.at`, giving `{ ok: false, reason: \'grant_expired\' }`; exactly at the expiry it has already expired. When both are true, report `grant_revoked`. A `revokedAt` later than `session.at` has not taken effect yet.\n5. **Refuse before you read.** Every refusal happens before the store is touched, so a refused call makes no read at all.\n6. **Query inside the tenant.** `store.queryOrders(tenantId, { status })` returns only that tenant’s rows. `store.scanAll()` returns every tenant’s rows and is here so the grade can see whether you used it. `arguments.status` is a filter the caller may choose: pass it through, and pass nothing when it is missing.\n\nA returned record is exactly `{ id, tenantId, status, total }`, in the order the store returned them. The `customer` field on a row is not part of the answer.\n\nDomain: ordinary objects and arrays, at most 100 grants and 1,000 returned rows, with bounded string fields of at most 200 UTF-16 code units. Session and grant timestamps are valid ISO instants with Z or an explicit offset; revokedAt is null or such an instant. The only permitted accessor is the ignored arguments.tenantId, which may throw if read. Do not mutate session, grants, request or store rows. The store returns a finite correctly scoped array; authorization of the context itself is outside this function.\n\nTarget: O(n) time, where n is the grant count plus returned row count, excluding the store implementation cost and using bounded-length field operations.\n\nThe store, the session and the grants are fixtures written for this exercise. There is no live database, no model and no network here — the model-supplied arguments are an object literal in the test, and a stronger instruction in a prompt would not have changed any of it.',
        contract: [
          '`store.queryOrders(tenantId, filter)` is the only read this wrapper may make. `store.scanAll()` exists so the grade can see a post-fetch filter, and using it fails the tenant criterion even when the records you return are correct.',
          'The tenant comes from `session.tenantId`. `request.arguments` may narrow the result with `status` and may never decide which tenant is read.',
          'Decide the permission before the store is read: a refused call makes no read at all.',
          '`session.grants` is always an array, and carries at most one grant per scope and tenant. `request.arguments` may be missing.',
          'The store and the session come from the task harness. Do not define your own `__store` or `__session`, and do not reach for a network, a clock or a real database.',
        ],
        starter: `const callTool = (session, request, store) => {
  const tenantId = request.arguments.tenantId;
  const grant = session.grants.find(one => one.scope === request.tool);

  if (grant && Date.parse(grant.expiresAt) <= Date.parse(session.at)) {
    return { ok: false, reason: 'grant_expired' };
  }

  const rows = store.scanAll();
  const records = rows
    .filter(row => row.tenantId === tenantId)
    .filter(row => !request.arguments.status || row.status === request.arguments.status)
    .map(row => ({ id: row.id, tenantId: row.tenantId, status: row.status, total: row.total }));

  return { ok: true, records };
};

// Scratch pad — change this before submitting.
const demoRows = [
  { id: 'ORD-1001', tenantId: 'TEN-4021', customer: 'Halloway Depot', status: 'open', total: 240.5 },
  { id: 'ORD-2001', tenantId: 'TEN-7788', customer: 'Brant and Ivey', status: 'open', total: 512 },
];
const demoStore = {
  scanAll: () => demoRows.map(row => ({ ...row })),
  queryOrders: (tenantId, filter) =>
    demoRows
      .filter(row => row.tenantId === tenantId)
      .filter(row => !filter || !filter.status || row.status === filter.status)
      .map(row => ({ ...row })),
};
const demoSession = {
  userId: 'USR-31',
  tenantId: 'TEN-4021',
  at: '2026-04-02T09:00:00Z',
  grants: [{ scope: 'orders.read', tenantId: 'TEN-4021', expiresAt: '2026-04-02T17:00:00Z', revokedAt: null }],
};

// The operator belongs to TEN-4021. Look at whose order comes back.
console.log(JSON.stringify(callTool(demoSession, { tool: 'orders.read', arguments: { tenantId: 'TEN-7788' } }, demoStore)));
`,
        skeleton: `const callTool = (session, request, store) => {
  if (/* the tool is not one this wrapper serves */) return { ok: false, reason: 'unknown_tool' };

  const tenantId = /* the tenant the session was verified for */;
  const args = request.arguments || {};

  const grant = session.grants.find(one => /* the scope and the tenant both match */);
  if (!grant) return { ok: false, reason: /* ... */ };

  const at = Date.parse(session.at);
  // refuse a revoked grant, then an expired one, both before the store is touched

  const rows = store.queryOrders(/* the session tenant */, { status: args.status });
  return {
    ok: true,
    records: rows.map(row => (/* id, tenantId, status, total */)),
  };
};`,
        hints: [
          '`session.tenantId` is the only tenant this function knows. Read `request.arguments` for `status` and for nothing else. Deleting the line that reads `arguments.tenantId` is most of the first repair.',
          'A grant matches only when both halves line up: `session.grants.find(one => one.scope === request.tool && one.tenantId === session.tenantId)`. A grant for the same scope issued to another tenant must miss.',
          'Compare instants with `Date.parse`. A grant whose `expiresAt` equals `session.at` has already expired; a `revokedAt` after `session.at` has not taken effect. Both checks belong above the `store.queryOrders` call, so a refusal never reads anything.',
        ],
        approach: [
          'Refuse an unknown tool first: anything other than `orders.read` returns `{ ok: false, reason: \'unknown_tool\' }`.',
          'Take the tenant from `session.tenantId`, and read `request.arguments` only for `status`, defaulting to an empty object when it is missing.',
          'Find the grant matching both the tool and the session tenant, and refuse with `no_grant` when there is none.',
          'Parse `session.at` once, then refuse `grant_revoked` when `revokedAt` is set and at or before it, and `grant_expired` when `expiresAt` is at or before it.',
          'Only now call `store.queryOrders(session.tenantId, { status })`, and map each row to `{ id, tenantId, status, total }`.',
        ],
        criteria: [
          {
            id: 'core',
            label: 'Correct results, refusals and record shape',
            critical: true,
            weight: 3,
            detail:
              'The behaviour is off somewhere outside the boundary checks. Confirm that an unknown tool refuses with `unknown_tool` before anything else runs, that a missing `arguments` object does not throw, that `status` narrows the result, that a record is exactly `{ id, tenantId, status, total }` with no `customer`, and that the records keep the order the store returned them in.',
          },
          {
            id: 'tenant-isolation',
            label: 'No record from another tenant is ever returned, however the arguments are shaped',
            critical: true,
            weight: 3,
            detail:
              'The tenant boundary did not hold. Either a record from another tenant reached the caller, or `request.arguments.tenantId` changed which rows were read, or a grant belonging to another tenant authorized this session, or the store was read with `scanAll` and filtered afterwards. A filter applied after the fetch is not a boundary: the other tenant’s rows were already in the process by the time it ran.',
          },
          {
            id: 'permission-freshness',
            label: 'An expired or revoked grant refuses',
            critical: true,
            weight: 2,
            detail:
              'A permission check ran too late, too loosely, or not at all. A session with no matching grant must give `no_grant`, a grant whose `expiresAt` is at or before `session.at` must give `grant_expired`, a grant revoked at or before `session.at` must give `grant_revoked` even when it is also expired, a revocation dated after the request must not refuse, and every one of those refusals must happen before the store is read.',
          },
        ],
        tests: [
          {
            call: '(function () { var out = callTool(__session(), { tool: \'orders.read\', arguments: {} }, __store()); return __ids(out); })()',
            expected: ['ORD-1001', 'ORD-1002', 'ORD-1005'],
            label: 'the operator sees the three orders of their own tenant',
          },
          {
            call: '(function () { var out = callTool(__session(), { tool: \'orders.read\', arguments: {} }, __store()); return out.records[0]; })()',
            expected: { id: 'ORD-1001', tenantId: 'TEN-4021', status: 'open', total: 240.5 },
            label: 'a record carries id, tenant, status and total, and drops the customer name',
          },
          {
            call: '(function () { var out = callTool(__session(), { tool: \'orders.read\', arguments: { status: \'open\' } }, __store()); return __ids(out); })()',
            expected: ['ORD-1001', 'ORD-1005'],
            label: 'the status argument narrows the result inside the tenant',
          },
          {
            call: '(function () { var s = __store(); var out = callTool(__session(), { tool: \'orders.delete\', arguments: {} }, s); return { ok: out.ok, reason: out.reason, reads: s.reads.length }; })()',
            expected: { ok: false, reason: 'unknown_tool', reads: 0 },
            label: 'an unknown tool refuses and never reaches the store',
            edge: true,
          },
          {
            call: '(function () { var out = callTool(__session(), { tool: \'orders.read\', arguments: { tenantId: \'TEN-7788\' } }, __store()); return { ids: __ids(out), tenants: __tenants(out) }; })()',
            expected: { ids: ['ORD-1001', 'ORD-1002', 'ORD-1005'], tenants: ['TEN-4021'] },
            label: 'an argument asking for another tenant changes nothing',
            edge: true,
            criterion: 'tenant-isolation',
          },
          {
            call: '(function () { var s = __store(); callTool(__session(), { tool: \'orders.read\', arguments: { tenantId: \'TEN-7788\' } }, s); return s.reads; })()',
            expected: ['queryOrders:TEN-4021'],
            label: 'the store is queried once, inside the session tenant',
            criterion: 'tenant-isolation',
          },
          {
            call: '(function () { return callTool(__session({ grants: [] }), { tool: \'orders.read\', arguments: {} }, __store()); })()',
            expected: { ok: false, reason: 'no_grant' },
            label: 'a session with no grant is refused',
            criterion: 'permission-freshness',
          },
          {
            call: '(function () { var session = __session({ grants: [__grant(\'TEN-4021\', { expiresAt: \'2026-04-02T08:00:00Z\' })] }); return callTool(session, { tool: \'orders.read\', arguments: {} }, __store()); })()',
            expected: { ok: false, reason: 'grant_expired' },
            label: 'a grant that expired an hour ago is refused',
            criterion: 'permission-freshness',
          },
          {
            call: '(function () { var session = __session({ grants: [__grant(\'TEN-4021\', { revokedAt: \'2026-04-01T12:00:00Z\' })] }); return callTool(session, { tool: \'orders.read\', arguments: {} }, __store()); })()',
            expected: { ok: false, reason: 'grant_revoked' },
            label: 'a grant revoked yesterday is refused, though it has not expired',
            criterion: 'permission-freshness',
          },
        ],
        harness: ORDER_STORE,
      },
    },
  ],
  requires: [
    { activityId: 'fde-v1-m03-checks', state: 'verified_pass' },
    { activityId: 'fde-v1-m03-tenant-tool-wrapper', state: 'verified_pass' },
  ],
};
