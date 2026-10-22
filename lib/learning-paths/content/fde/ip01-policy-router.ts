/** Original synthetic event-routing service used as an unfamiliar reading fixture. */
export const ROUTER_FIXTURE = String.raw`// Brightgate Events: a deterministic notification planner.
// All organizations, event payloads and subscription names are fictional.
// This module plans deliveries; it sends no email, webhook or network call.
// The public JSON readers validate shape. Planning accepts their typed output.
// Existing selectors are all, one event kind, one tag, or minimum severity.

type EventKind = 'ticket.opened' | 'ticket.closed' | 'invoice.issued' | 'account.changed';
type Severity = 'info' | 'warn' | 'critical';
type Channel = 'email' | 'webhook' | 'audit';

type Selector =
  | { kind: 'all' }
  | { kind: 'eventKind'; value: EventKind }
  | { kind: 'tag'; value: string }
  | { kind: 'minimumSeverity'; value: Severity };

interface EventRecord {
  id: string;
  tenantId: string;
  kind: EventKind;
  severity: Severity;
  tags: string[];
  subject: string;
}

interface Subscription {
  id: string;
  tenantId: string;
  enabled: boolean;
  channel: Channel;
  destination: string;
  selector: Selector;
}

interface Delivery {
  deliveryId: string;
  eventId: string;
  tenantId: string;
  subscriptionId: string;
  channel: Channel;
  destination: string;
  subject: string;
  description: string;
}

interface Plan {
  deliveries: Delivery[];
  unmatched: string[];
  duplicates: number;
  nextSeen: string[];
}

interface ParseError {
  at: string;
  message: string;
}

type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ParseError[] };

type RawObject = Record<string, unknown>;

const EVENT_KINDS: readonly EventKind[] = [
  'ticket.opened',
  'ticket.closed',
  'invoice.issued',
  'account.changed',
];
const SEVERITIES: readonly Severity[] = ['info', 'warn', 'critical'];
const CHANNELS: readonly Channel[] = ['email', 'webhook', 'audit'];
const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  warn: 1,
  critical: 2,
};

function rawObject(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function eventKind(value: unknown): value is EventKind {
  return typeof value === 'string' && (EVENT_KINDS as readonly string[]).includes(value);
}

function severity(value: unknown): value is Severity {
  return typeof value === 'string' && (SEVERITIES as readonly string[]).includes(value);
}

function channel(value: unknown): value is Channel {
  return typeof value === 'string' && (CHANNELS as readonly string[]).includes(value);
}

function error(at: string, message: string): ParseError {
  return { at, message };
}

function readText(raw: RawObject, key: string, at: string, errors: ParseError[]): string {
  const value = raw[key];
  if (!nonempty(value)) {
    errors.push(error(at + '.' + key, 'must be nonempty text'));
    return '';
  }
  return value.trim();
}

function readTags(raw: unknown, at: string): Parsed<string[]> {
  if (!Array.isArray(raw)) {
    return { ok: false, errors: [error(at, 'must be a list')] };
  }
  if (raw.length > 16) {
    return { ok: false, errors: [error(at, 'at most 16 tags')] };
  }
  const tags: string[] = [];
  const seen = new Set<string>();
  const errors: ParseError[] = [];
  raw.forEach((value, index) => {
    if (!nonempty(value)) {
      errors.push(error(at + '[' + index + ']', 'must be nonempty text'));
      return;
    }
    const normalized = value.trim();
    if (seen.has(normalized)) {
      errors.push(error(at + '[' + index + ']', 'duplicate tag'));
      return;
    }
    seen.add(normalized);
    tags.push(normalized);
  });
  return errors.length ? { ok: false, errors } : { ok: true, value: tags };
}

function parseEvent(raw: unknown, at = 'event'): Parsed<EventRecord> {
  if (!rawObject(raw)) return { ok: false, errors: [error(at, 'must be an object')] };
  const errors: ParseError[] = [];
  const id = readText(raw, 'id', at, errors);
  const tenantId = readText(raw, 'tenantId', at, errors);
  const subject = readText(raw, 'subject', at, errors);
  const kind = raw.kind;
  const level = raw.severity;
  if (!eventKind(kind)) errors.push(error(at + '.kind', 'unknown event kind'));
  if (!severity(level)) errors.push(error(at + '.severity', 'unknown severity'));
  const tags = readTags(raw.tags, at + '.tags');
  if (!tags.ok) errors.push(...tags.errors);
  if (errors.length || !eventKind(kind) || !severity(level) || !tags.ok) {
    return { ok: false, errors };
  }
  return { ok: true, value: { id, tenantId, subject, kind, severity: level, tags: tags.value } };
}

function parseSelector(raw: unknown, at = 'selector'): Parsed<Selector> {
  if (!rawObject(raw)) return { ok: false, errors: [error(at, 'must be an object')] };
  switch (raw.kind) {
    case 'all':
      return { ok: true, value: { kind: 'all' } };
    case 'eventKind':
      return eventKind(raw.value)
        ? { ok: true, value: { kind: 'eventKind', value: raw.value } }
        : { ok: false, errors: [error(at + '.value', 'unknown event kind')] };
    case 'tag':
      return nonempty(raw.value)
        ? { ok: true, value: { kind: 'tag', value: raw.value.trim() } }
        : { ok: false, errors: [error(at + '.value', 'must be nonempty text')] };
    case 'minimumSeverity':
      return severity(raw.value)
        ? { ok: true, value: { kind: 'minimumSeverity', value: raw.value } }
        : { ok: false, errors: [error(at + '.value', 'unknown severity')] };
    default:
      return { ok: false, errors: [error(at + '.kind', 'unknown selector kind')] };
  }
}

function parseSubscription(raw: unknown, at = 'subscription'): Parsed<Subscription> {
  if (!rawObject(raw)) return { ok: false, errors: [error(at, 'must be an object')] };
  const errors: ParseError[] = [];
  const id = readText(raw, 'id', at, errors);
  const tenantId = readText(raw, 'tenantId', at, errors);
  const destination = readText(raw, 'destination', at, errors);
  if (typeof raw.enabled !== 'boolean') errors.push(error(at + '.enabled', 'must be boolean'));
  const routeChannel = raw.channel;
  if (!channel(routeChannel)) errors.push(error(at + '.channel', 'unknown channel'));
  const selector = parseSelector(raw.selector, at + '.selector');
  if (!selector.ok) errors.push(...selector.errors);
  if (errors.length || !channel(routeChannel) || !selector.ok) return { ok: false, errors };
  return {
    ok: true,
    value: { id, tenantId, destination, enabled: raw.enabled as boolean, channel: routeChannel, selector: selector.value },
  };
}

function selectorMatches(selector: Selector, event: EventRecord): boolean {
  switch (selector.kind) {
    case 'all':
      return true;
    case 'eventKind':
      return selector.value === event.kind;
    case 'tag':
      return event.tags.includes(selector.value);
    case 'minimumSeverity':
      return SEVERITY_ORDER[event.severity] >= SEVERITY_ORDER[selector.value];
  }
}

function selectorDescription(selector: Selector): string {
  switch (selector.kind) {
    case 'all':
      return 'all events';
    case 'eventKind':
      return 'event kind: ' + selector.value;
    case 'tag':
      return 'tag: ' + selector.value;
    case 'minimumSeverity':
      return 'minimum severity: ' + selector.value;
  }
}

function eventKey(event: Pick<EventRecord, 'tenantId' | 'id'>): string {
  return JSON.stringify([event.tenantId, event.id]);
}

function deliveryKey(event: EventRecord, subscription: Subscription): string {
  return JSON.stringify([event.tenantId, event.id, subscription.id]);
}

function subjectPrefix(kind: EventKind): string {
  switch (kind) {
    case 'ticket.opened': return 'New ticket';
    case 'ticket.closed': return 'Closed ticket';
    case 'invoice.issued': return 'Invoice';
    case 'account.changed': return 'Account change';
  }
}

function makeDelivery(event: EventRecord, subscription: Subscription): Delivery {
  return {
    deliveryId: deliveryKey(event, subscription),
    eventId: event.id,
    tenantId: event.tenantId,
    subscriptionId: subscription.id,
    channel: subscription.channel,
    destination: subscription.destination,
    subject: subjectPrefix(event.kind) + ': ' + event.subject,
    description: selectorDescription(subscription.selector),
  };
}

// Output follows event order, then subscription order. No destination is called.
// Replayed input is classified before routing; it cannot emit another delivery.
// Seen identity is tenant plus event id, never the bare source id.
function planEvents(events: readonly EventRecord[], subscriptions: readonly Subscription[], previousSeen: readonly string[]): Plan {
  const seen = new Set(previousSeen);
  const deliveries: Delivery[] = [];
  const unmatched: string[] = [];
  let duplicates = 0;
  for (const event of events) {
    const key = eventKey(event);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    let matched = false;
    for (const subscription of subscriptions) {
      if (!subscription.enabled) continue;
      if (subscription.tenantId !== event.tenantId) continue;
      if (!selectorMatches(subscription.selector, event)) continue;
      deliveries.push(makeDelivery(event, subscription));
      matched = true;
    }
    if (!matched) unmatched.push(key);
  }
  return { deliveries, unmatched, duplicates, nextSeen: Array.from(seen) };
}

function parseMany<T>(values: unknown, name: string, reader: (raw: unknown, at: string) => Parsed<T>): Parsed<T[]> {
  if (!Array.isArray(values)) return { ok: false, errors: [error(name, 'must be a list')] };
  const errors: ParseError[] = [];
  const out: T[] = [];
  values.forEach((raw, index) => {
    const result = reader(raw, name + '[' + index + ']');
    if (result.ok) out.push(result.value);
    else errors.push(...result.errors);
  });
  return errors.length ? { ok: false, errors } : { ok: true, value: out };
}

function previewJson(rawEvents: unknown, rawSubscriptions: unknown): Parsed<Plan> {
  const events = parseMany(rawEvents, 'events', parseEvent);
  const subscriptions = parseMany(rawSubscriptions, 'subscriptions', parseSubscription);
  if (!events.ok || !subscriptions.ok) {
    return { ok: false, errors: [...(!events.ok ? events.errors : []), ...(!subscriptions.ok ? subscriptions.errors : [])] };
  }
  return { ok: true, value: planEvents(events.value, subscriptions.value, []) };
}

function channelCounts(plan: Plan): Record<Channel, number> {
  const counts: Record<Channel, number> = { email: 0, webhook: 0, audit: 0 };
  for (const delivery of plan.deliveries) counts[delivery.channel]++;
  return counts;
}

function tenantCounts(plan: Plan): { tenantId: string; deliveries: number }[] {
  const counts = new Map<string, number>();
  for (const delivery of plan.deliveries) {
    counts.set(delivery.tenantId, (counts.get(delivery.tenantId) ?? 0) + 1);
  }
  return Array.from(counts, ([tenantId, deliveries]) => ({ tenantId, deliveries }));
}

function auditLines(plan: Plan): string[] {
  const lines = plan.deliveries.map(delivery =>
    delivery.tenantId + ' / ' + delivery.eventId + ' -> ' + delivery.subscriptionId + ' [' + delivery.channel + ']');
  lines.push('duplicates: ' + plan.duplicates);
  lines.push('unmatched: ' + plan.unmatched.length);
  return lines;
}

const SAMPLE_EVENT: EventRecord = {
  id: 'EV-17', tenantId: 'TEN-NORTH', kind: 'ticket.opened',
  severity: 'warn', tags: ['customer', 'priority'], subject: 'Delivery queue stalled',
};
const SAMPLE_SUBSCRIPTION: Subscription = {
  id: 'SUB-4', tenantId: 'TEN-NORTH', enabled: true, channel: 'audit',
  destination: 'support-log', selector: { kind: 'minimumSeverity', value: 'warn' },
};

// A scratch call is optional and is not a separately recorded result.
// console.log(auditLines(planEvents([SAMPLE_EVENT], [SAMPLE_SUBSCRIPTION], [])));
`;
