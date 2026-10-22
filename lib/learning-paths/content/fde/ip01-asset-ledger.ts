/** Original synthetic asset ledger used as an unfamiliar reading fixture. */
export const LEDGER_FIXTURE = String.raw`// Westmere Equipment: an in-memory asset-change ledger.
// Every tenant, asset and CSV row is an invented reading fixture.
// There is no database, file access, network or actual asset operation.
// The CSV dialect is deliberately small: exactly six unquoted fields.
// A whole batch either produces a new snapshot or returns errors.

type AssetStatus = 'active' | 'retired';
interface AssetRecord {
  tenantId: string;
  itemId: string;
  revision: number;
  location: string;
  label: string;
  status: AssetStatus;
  lastChange: string;
}

interface CommandBase {
  tenantId: string;
  itemId: string;
  revision: number;
}
interface CreateCommand extends CommandBase {
  kind: 'create';
  location: string;
  label: string;
}
interface MoveCommand extends CommandBase {
  kind: 'move';
  location: string;
}
interface RetireCommand extends CommandBase {
  kind: 'retire';
}
type Command = CreateCommand | MoveCommand | RetireCommand;

interface RowError {
  row: number;
  code: string;
}
interface Counts {
  applied: number;
  stale: number;
  duplicate: number;
}
interface AppliedBatch {
  ok: true;
  records: AssetRecord[];
  counts: Counts;
  changes: string[];
}
interface RejectedBatch {
  ok: false;
  errors: RowError[];
}
type BatchResult = AppliedBatch | RejectedBatch;
type ReadResult<T> = { ok: true; value: T } | { ok: false; errors: RowError[] };

const INPUT_HEADER = 'tenant_id,item_id,revision,kind,location,label';
const OUTPUT_HEADER = 'tenant_id,item_id,revision,location,label,status';
const FIELD_LIMIT = 100;

function issue(row: number, code: string): RowError {
  return { row, code };
}

function token(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
    && value.trim().length <= FIELD_LIMIT && !/[,\r\n]/.test(value);
}

function positiveRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function recordKey(value: Pick<CommandBase, 'tenantId' | 'itemId'>): string {
  return JSON.stringify([value.tenantId, value.itemId]);
}

// JSON arrays preserve the boundary between values that may contain dashes.
// Fingerprints identify a normalized command, not an untrusted raw CSV row.
function changeKey(command: Command): string {
  switch (command.kind) {
    case 'create':
      return JSON.stringify([command.kind, command.tenantId, command.itemId, command.revision, command.location, command.label]);
    case 'move':
      return JSON.stringify([command.kind, command.tenantId, command.itemId, command.revision, command.location]);
    case 'retire':
      return JSON.stringify([command.kind, command.tenantId, command.itemId, command.revision]);
  }
}

function describeCommand(command: Command): string {
  const who = command.tenantId + '/' + command.itemId;
  switch (command.kind) {
    case 'create': return who + ': create at ' + command.location;
    case 'move': return who + ': move to ' + command.location;
    case 'retire': return who + ': retire';
  }
}

function readRevision(value: string, row: number): ReadResult<number> {
  // The dialect accepts decimal digits only: no exponent, sign or fraction.
  if (!/^[0-9]+$/.test(value)) {
    return { ok: false, errors: [issue(row, 'revision:decimal-integer-required')] };
  }
  const revision = Number(value);
  return positiveRevision(revision)
    ? { ok: true, value: revision }
    : { ok: false, errors: [issue(row, 'revision:positive-safe-integer-required')] };
}

function parseCommand(cells: string[], row: number): ReadResult<Command> {
  if (cells.length !== 6) return { ok: false, errors: [issue(row, 'row:exactly-six-fields')] };
  const [tenantId, itemId, revisionText, kind, location, label] = cells.map(value => value.trim());
  const errors: RowError[] = [];
  if (!token(tenantId)) errors.push(issue(row, 'tenant:invalid'));
  if (!token(itemId)) errors.push(issue(row, 'item:invalid'));
  const revision = readRevision(revisionText, row);
  if (!revision.ok) errors.push(...revision.errors);
  if (errors.length || !revision.ok) return { ok: false, errors };
  const base: CommandBase = { tenantId, itemId, revision: revision.value };
  switch (kind) {
    case 'create':
      if (!token(location)) errors.push(issue(row, 'location:invalid'));
      if (!token(label)) errors.push(issue(row, 'label:invalid'));
      if (errors.length) return { ok: false, errors };
      return { ok: true, value: { ...base, kind: 'create', location, label } };
    case 'move':
      if (!token(location)) errors.push(issue(row, 'location:invalid'));
      if (label !== '') errors.push(issue(row, 'label:must-be-empty'));
      if (errors.length) return { ok: false, errors };
      return { ok: true, value: { ...base, kind: 'move', location } };
    case 'retire':
      if (location !== '') errors.push(issue(row, 'location:must-be-empty'));
      if (label !== '') errors.push(issue(row, 'label:must-be-empty'));
      if (errors.length) return { ok: false, errors };
      return { ok: true, value: { ...base, kind: 'retire' } };
    default:
      return { ok: false, errors: [issue(row, 'kind:unknown')] };
  }
}

function readCsv(text: string): ReadResult<{ command: Command; row: number }[]> {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== INPUT_HEADER) {
    return { ok: false, errors: [issue(1, 'header:invalid')] };
  }
  const commands: { command: Command; row: number }[] = [];
  const errors: RowError[] = [];
  for (let index = 1; index < lines.length; index++) {
    if (lines[index].trim() === '') continue;
    const row = index + 1;
    const parsed = parseCommand(lines[index].split(','), row);
    if (parsed.ok) commands.push({ command: parsed.value, row });
    else errors.push(...parsed.errors);
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: commands };
}

function recordProblems(record: AssetRecord, row: number): RowError[] {
  const out: RowError[] = [];
  if (!token(record.tenantId)) out.push(issue(row, 'snapshot:tenant-invalid'));
  if (!token(record.itemId)) out.push(issue(row, 'snapshot:item-invalid'));
  if (!positiveRevision(record.revision)) out.push(issue(row, 'snapshot:revision-invalid'));
  if (!token(record.location)) out.push(issue(row, 'snapshot:location-invalid'));
  if (!token(record.label)) out.push(issue(row, 'snapshot:label-invalid'));
  if (record.status !== 'active' && record.status !== 'retired') out.push(issue(row, 'snapshot:status-invalid'));
  if (typeof record.lastChange !== 'string' || record.lastChange === '') out.push(issue(row, 'snapshot:change-invalid'));
  return out;
}

function copyRecord(record: AssetRecord): AssetRecord {
  return {
    tenantId: record.tenantId,
    itemId: record.itemId,
    revision: record.revision,
    location: record.location,
    label: record.label,
    status: record.status,
    lastChange: record.lastChange,
  };
}

function readSnapshot(records: readonly AssetRecord[]): ReadResult<Map<string, AssetRecord>> {
  const index = new Map<string, AssetRecord>();
  const errors: RowError[] = [];
  records.forEach((record, position) => {
    errors.push(...recordProblems(record, position + 1));
    const key = recordKey(record);
    if (index.has(key)) errors.push(issue(position + 1, 'snapshot:duplicate-identity'));
    else index.set(key, copyRecord(record));
  });
  return errors.length ? { ok: false, errors } : { ok: true, value: index };
}

function applyCommand(previous: AssetRecord | undefined, command: Command, row: number): ReadResult<AssetRecord> {
  switch (command.kind) {
    case 'create':
      if (previous) return { ok: false, errors: [issue(row, 'create:already-exists')] };
      return {
        ok: true,
        value: { tenantId: command.tenantId, itemId: command.itemId, revision: command.revision,
          location: command.location, label: command.label, status: 'active', lastChange: changeKey(command) },
      };
    case 'move':
      if (!previous) return { ok: false, errors: [issue(row, 'move:not-found')] };
      if (previous.status === 'retired') return { ok: false, errors: [issue(row, 'move:retired')] };
      return { ok: true, value: { ...previous, revision: command.revision, location: command.location, lastChange: changeKey(command) } };
    case 'retire':
      if (!previous) return { ok: false, errors: [issue(row, 'retire:not-found')] };
      if (previous.status === 'retired') return { ok: false, errors: [issue(row, 'retire:retired')] };
      return { ok: true, value: { ...previous, revision: command.revision, status: 'retired', lastChange: changeKey(command) } };
  }
}

// Parse the entire CSV before changing the staged snapshot.
// Any application conflict also rejects the entire staged result.
// The caller's snapshot remains unchanged even when a later row fails.
function applyCsv(snapshot: readonly AssetRecord[], csv: string): BatchResult {
  const read = readCsv(csv);
  const initial = readSnapshot(snapshot);
  if (!read.ok || !initial.ok) {
    return { ok: false, errors: [...(!read.ok ? read.errors : []), ...(!initial.ok ? initial.errors : [])] };
  }
  const staged = initial.value;
  const counts: Counts = { applied: 0, stale: 0, duplicate: 0 };
  const changes: string[] = [];
  for (const { command, row } of read.value) {
    const key = recordKey(command);
    const previous = staged.get(key);
    if (previous && command.revision < previous.revision) {
      counts.stale++;
      continue;
    }
    if (previous && command.revision === previous.revision) {
      if (previous.lastChange !== changeKey(command)) {
        return { ok: false, errors: [issue(row, 'revision:conflict')] };
      }
      counts.duplicate++;
      continue;
    }
    const applied = applyCommand(previous, command, row);
    if (!applied.ok) return { ok: false, errors: applied.errors };
    staged.set(key, applied.value);
    counts.applied++;
    changes.push(describeCommand(command));
  }
  return { ok: true, records: Array.from(staged.values()), counts, changes };
}

function recordsForTenant(records: readonly AssetRecord[], tenantId: string): AssetRecord[] {
  return records.filter(record => record.tenantId === tenantId).map(copyRecord);
}

function activeByLocation(records: readonly AssetRecord[], tenantId: string): { location: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (record.tenantId !== tenantId || record.status !== 'active') continue;
    counts.set(record.location, (counts.get(record.location) ?? 0) + 1);
  }
  return Array.from(counts, ([location, count]) => ({ location, count }));
}

// The operator uses these counts when reconciling a tenant export.
function tenantAudit(records: readonly AssetRecord[], tenantId: string): {
  active: number;
  retired: number;
  latestRevision: number | null;
} {
  let active = 0;
  let retired = 0;
  let latestRevision: number | null = null;
  for (const record of records) {
    if (record.tenantId !== tenantId) continue;
    if (record.status === 'active') active++;
    else retired++;
    latestRevision = latestRevision === null ? record.revision : Math.max(latestRevision, record.revision);
  }
  return { active, retired, latestRevision };
}

function snapshotCsv(records: readonly AssetRecord[], tenantId: string): string {
  const rows = recordsForTenant(records, tenantId).map(record => [
    record.tenantId, record.itemId, String(record.revision), record.location, record.label, record.status,
  ].join(','));
  return [OUTPUT_HEADER, ...rows].join('\n');
}

function summarize(result: BatchResult): string[] {
  if (!result.ok) return result.errors.map(problem => 'row ' + problem.row + ': ' + problem.code);
  return [
    'applied: ' + result.counts.applied,
    'stale: ' + result.counts.stale,
    'duplicate: ' + result.counts.duplicate,
    ...result.changes,
  ];
}

const SAMPLE_CSV = [
  INPUT_HEADER,
  'TEN-WEST,EQ-8,1,create,Depot-A,Pressure gauge',
  'TEN-WEST,EQ-8,2,move,Depot-B,',
  'TEN-EAST,EQ-8,1,create,Depot-C,Spare gauge',
].join('\n');

// Optional scratch call; it records no separate result.
// console.log(summarize(applyCsv([], SAMPLE_CSV)).join(' | '));
`;
