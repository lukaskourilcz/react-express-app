/** Server-only corrected v2 services and hidden assertions. */
import type { PathCodeSolution } from '../types';
const TENANT_QUOTES_FIXED = "// Harrowgate Freight: quoting service, rate-card engine.\n//\n// Owned by the pricing team. Carriers send rate cards as JSON. Ops loads a\n// card with cardFromJson, validateCard refuses anything malformed, and quote()\n// prices one shipment against one card. Money is integer cents and weight is\n// integer grams everywhere in this file. Nothing here does I/O.\n\ntype Cents = number;\ntype Grams = number;\ntype Currency = 'EUR' | 'GBP' | 'USD';\ntype ZoneId = 'local' | 'regional' | 'national';\ntype ShipmentFlag = 'fragile' | 'residential' | 'hazmat' | 'liftgate';\n\nconst ZONES: readonly ZoneId[] = ['local', 'regional', 'national'];\nconst FLAGS: readonly ShipmentFlag[] = ['fragile', 'residential', 'hazmat', 'liftgate'];\nconst CURRENCIES: readonly Currency[] = ['EUR', 'GBP', 'USD'];\n\ninterface Shipment {\n  id: string;\n  zone: ZoneId;\n  weightGrams: Grams;\n  declaredValueCents: Cents;\n  flags: ShipmentFlag[];\n}\n\n/* ── rules ─────────────────────────────────────────────────────────────── */\n\ninterface FlatRule {\n  kind: 'flat';\n  id: string;\n  label: string;\n  amount: Cents;\n  zones?: ZoneId[];\n}\n\ninterface PerKgRule {\n  kind: 'perKg';\n  id: string;\n  label: string;\n  centsPerKg: Cents;\n  minimum?: Cents;\n  zones?: ZoneId[];\n}\n\ninterface ValueRule {\n  kind: 'percentOfValue';\n  id: string;\n  label: string;\n  basisPoints: number;\n  cap?: Cents;\n}\n\ninterface FlagRule {\n  kind: 'flagSurcharge';\n  id: string;\n  label: string;\n  flag: ShipmentFlag;\n  amount: Cents;\n}\n\ntype Rule = FlatRule | PerKgRule | ValueRule | FlagRule;\ntype RuleKind = Rule['kind'];\n\n/** Base charges take the card's discount; surcharges never do (contract\n * clause 4.2 with every carrier). */\nconst DISCOUNTABLE: Record<RuleKind, boolean> = {\n  flat: true,\n  perKg: true,\n  percentOfValue: false,\n  flagSurcharge: false,\n};\n\ninterface RateCard {\n  id: string;\n  carrier: string;\n  currency: Currency;\n  version: number;\n  discountBasisPoints: number;\n  rules: Rule[];\n}\n\ninterface LineItem {\n  ruleId: string;\n  label: string;\n  amount: Cents;\n  discountable: boolean;\n}\n\ninterface Quote {\n  shipmentId: string;\n  cardId: string;\n  currency: Currency;\n  lines: LineItem[];\n  subtotal: Cents;\n  discount: Cents;\n  total: Cents;\n}\n\ntype QuoteResult = { ok: true; quote: Quote } | { ok: false; errors: string[] };\ntype LoadResult = { ok: true; card: RateCard } | { ok: false; errors: string[] };\n\n/* ── helpers ───────────────────────────────────────────────────────────── */\n\nconst isWholeCents = (value: unknown): value is Cents =>\n  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;\n\nconst isZone = (value: unknown): value is ZoneId =>\n  typeof value === 'string' && (ZONES as readonly string[]).includes(value);\n\nconst isFlag = (value: unknown): value is ShipmentFlag =>\n  typeof value === 'string' && (FLAGS as readonly string[]).includes(value);\n\n/** Billed per started kilogram: 1 g is 1 kg, 1000 g is 1 kg, 1001 g is 2. */\nconst startedKg = (grams: Grams): number => Math.ceil(grams / 1000);\n\n/** Basis points of an amount, rounded half up to the cent. */\nconst basisPointsOf = (amount: Cents, basisPoints: number): Cents =>\n  Math.floor((amount * basisPoints + 5000) / 10000);\n\nconst appliesToZone = (zones: ZoneId[] | undefined, zone: ZoneId): boolean =>\n  zones === undefined || zones.includes(zone);\n\nconst zoneSuffix = (zones: ZoneId[] | undefined): string =>\n  zones === undefined ? '' : ' (' + zones.join(', ') + ')';\n\nconst formatCents = (amount: Cents, currency: Currency): string => {\n  const sign = amount < 0 ? '-' : '';\n  const abs = Math.abs(amount);\n  return sign + currency + ' ' + Math.floor(abs / 100) + '.' + String(abs % 100).padStart(2, '0');\n};\n\nconst assertNever = (value: never, where: string): never => {\n  throw new Error('unhandled ' + where + ': ' + JSON.stringify(value));\n};\n\n/* ── pricing ───────────────────────────────────────────────────────────── */\n\n/** One rule's charge for one shipment, or null when the rule does not apply.\n * A rule that applies and comes to zero returns 0, so its line still shows. */\nfunction priceRule(rule: Rule, shipment: Shipment): Cents | null {\n  switch (rule.kind) {\n    case 'flat':\n      return appliesToZone(rule.zones, shipment.zone) ? rule.amount : null;\n    case 'perKg': {\n      if (!appliesToZone(rule.zones, shipment.zone)) return null;\n      const charge = startedKg(shipment.weightGrams) * rule.centsPerKg;\n      return rule.minimum !== undefined && charge < rule.minimum ? rule.minimum : charge;\n    }\n    case 'percentOfValue': {\n      const charge = basisPointsOf(shipment.declaredValueCents, rule.basisPoints);\n      return rule.cap !== undefined && charge > rule.cap ? rule.cap : charge;\n    }\n    case 'flagSurcharge':\n      return shipment.flags.includes(rule.flag) ? rule.amount : null;\n    default:\n      return assertNever(rule, 'rule kind');\n  }\n}\n\n/** The one-line summary ops sees next to each rule in the admin console. */\nfunction describeRule(rule: Rule): string {\n  switch (rule.kind) {\n    case 'flat':\n      return rule.label + ': flat ' + rule.amount + 'c' + zoneSuffix(rule.zones);\n    case 'perKg':\n      return rule.label + ': ' + rule.centsPerKg + 'c per started kg'\n        + (rule.minimum !== undefined ? ', minimum ' + rule.minimum + 'c' : '') + zoneSuffix(rule.zones);\n    case 'percentOfValue':\n      return rule.label + ': ' + rule.basisPoints + ' bp of declared value'\n        + (rule.cap !== undefined ? ', capped at ' + rule.cap + 'c' : '');\n    case 'flagSurcharge':\n      return rule.label + ': ' + rule.amount + 'c when ' + rule.flag;\n    default:\n      return assertNever(rule, 'rule kind');\n  }\n}\n\n/* ── validation ────────────────────────────────────────────────────────── */\n\nfunction ruleProblems(rule: Rule): string[] {\n  const at = 'rule ' + rule.id + ': ';\n  const out: string[] = [];\n  if (rule.label.trim() === '') out.push(at + 'label must not be empty');\n  switch (rule.kind) {\n    case 'flat':\n      if (!isWholeCents(rule.amount)) out.push(at + 'amount must be whole cents');\n      if (rule.zones !== undefined && rule.zones.length === 0) out.push(at + 'zones must not be empty');\n      break;\n    case 'perKg':\n      if (!isWholeCents(rule.centsPerKg)) out.push(at + 'centsPerKg must be whole cents');\n      if (rule.minimum !== undefined && !isWholeCents(rule.minimum)) out.push(at + 'minimum must be whole cents');\n      if (rule.zones !== undefined && rule.zones.length === 0) out.push(at + 'zones must not be empty');\n      break;\n    case 'percentOfValue':\n      if (!Number.isInteger(rule.basisPoints) || rule.basisPoints < 0 || rule.basisPoints > 10000) {\n        out.push(at + 'basisPoints must be 0 to 10000');\n      }\n      if (rule.cap !== undefined && !isWholeCents(rule.cap)) out.push(at + 'cap must be whole cents');\n      break;\n    case 'flagSurcharge':\n      if (!isFlag(rule.flag)) out.push(at + 'unknown flag');\n      if (!isWholeCents(rule.amount)) out.push(at + 'amount must be whole cents');\n      break;\n    default:\n      return assertNever(rule, 'rule kind');\n  }\n  return out;\n}\n\n/** Every problem with a card, in rule order. An empty list means quote() may\n * price against it. */\nfunction validateCard(card: RateCard): string[] {\n  const problems: string[] = [];\n  if (!CURRENCIES.includes(card.currency)) problems.push('card: unknown currency');\n  if (!Number.isInteger(card.discountBasisPoints) || card.discountBasisPoints < 0 || card.discountBasisPoints > 5000) {\n    problems.push('card: discount must be 0 to 5000 bp');\n  }\n  if (card.rules.length === 0) problems.push('card: no rules');\n  const seen = new Set<string>();\n  for (const rule of card.rules) {\n    if (seen.has(rule.id)) problems.push('rule ' + rule.id + ': duplicate id');\n    seen.add(rule.id);\n    problems.push(...ruleProblems(rule));\n  }\n  return problems;\n}\n\nfunction shipmentProblems(shipment: Shipment): string[] {\n  const out: string[] = [];\n  if (!Number.isSafeInteger(shipment.weightGrams) || shipment.weightGrams <= 0) {\n    out.push('shipment: weight must be positive whole grams');\n  }\n  if (!isZone(shipment.zone)) out.push('shipment: unknown zone');\n  if (!isWholeCents(shipment.declaredValueCents)) out.push('shipment: declared value must be whole cents');\n  for (const flag of shipment.flags) if (!isFlag(flag)) out.push('shipment: unknown flag ' + flag);\n  return out;\n}\n\n/* ── quoting ───────────────────────────────────────────────────────────── */\n\nfunction quote(shipment: Shipment, card: RateCard): QuoteResult {\n  const errors = [...shipmentProblems(shipment), ...validateCard(card)];\n  if (errors.length > 0) return { ok: false, errors };\n  const lines: LineItem[] = [];\n  for (const rule of card.rules) {\n    const amount = priceRule(rule, shipment);\n    if (amount === null) continue;\n    lines.push({ ruleId: rule.id, label: rule.label, amount, discountable: DISCOUNTABLE[rule.kind] });\n  }\n  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);\n  const base = lines.filter((line) => line.discountable).reduce((sum, line) => sum + line.amount, 0);\n  const discount = basisPointsOf(base, card.discountBasisPoints);\n  return {\n    ok: true,\n    quote: {\n      shipmentId: shipment.id,\n      cardId: card.id,\n      currency: card.currency,\n      lines,\n      subtotal,\n      discount,\n      total: subtotal - discount,\n    },\n  };\n}\n\n/** The plain-text breakdown the support desk pastes into replies. */\nfunction explainQuote(result: QuoteResult): string[] {\n  if (!result.ok) return result.errors.map((error) => 'cannot quote: ' + error);\n  const { quote: q } = result;\n  const out = q.lines.map((line) => line.label + ' ' + formatCents(line.amount, q.currency));\n  if (q.discount > 0) out.push('Discount -' + formatCents(q.discount, q.currency));\n  out.push('Total ' + formatCents(q.total, q.currency));\n  return out;\n}\n\n/* ── loading cards from carrier JSON ───────────────────────────────────── */\n\ntype Raw = Record<string, unknown>;\n\nconst isRaw = (value: unknown): value is Raw =>\n  typeof value === 'object' && value !== null && !Array.isArray(value);\n\n/** Reads shape only: the right fields with the right JSON types. Value checks\n * (ranges, whole cents) belong to validateCard, which runs on every quote. */\nfunction readRule(raw: unknown, at: string, errors: string[]): Rule | null {\n  if (!isRaw(raw)) {\n    errors.push(at + ': not an object');\n    return null;\n  }\n  const str = (key: string): string => {\n    const value = raw[key];\n    if (typeof value === 'string') return value;\n    errors.push(at + ': ' + key + ' must be a string');\n    return '';\n  };\n  const num = (key: string): number => {\n    const value = raw[key];\n    if (typeof value === 'number') return value;\n    errors.push(at + ': ' + key + ' must be a number');\n    return 0;\n  };\n  const optNum = (key: string): number | undefined => (raw[key] === undefined ? undefined : num(key));\n  const optZones = (): ZoneId[] | undefined => {\n    const value = raw.zones;\n    if (value === undefined) return undefined;\n    if (Array.isArray(value) && value.every(isZone)) return value;\n    errors.push(at + ': zones must be a list of zones');\n    return undefined;\n  };\n  const before = errors.length;\n  const id = str('id');\n  const label = str('label');\n  let rule: Rule;\n  switch (raw.kind) {\n    case 'flat':\n      rule = { kind: 'flat', id, label, amount: num('amount'), zones: optZones() };\n      break;\n    case 'perKg':\n      rule = { kind: 'perKg', id, label, centsPerKg: num('centsPerKg'), minimum: optNum('minimum'), zones: optZones() };\n      break;\n    case 'percentOfValue':\n      rule = { kind: 'percentOfValue', id, label, basisPoints: num('basisPoints'), cap: optNum('cap') };\n      break;\n    case 'flagSurcharge': {\n      const flag = raw.flag;\n      if (!isFlag(flag)) errors.push(at + ': flag must be a known flag');\n      rule = { kind: 'flagSurcharge', id, label, flag: isFlag(flag) ? flag : 'fragile', amount: num('amount') };\n      break;\n    }\n    default:\n      errors.push(at + ': unknown kind ' + JSON.stringify(raw.kind));\n      return null;\n  }\n  // Optional fields the JSON left out stay absent, not undefined-valued.\n  for (const key of Object.keys(rule) as (keyof Rule)[]) {\n    if (rule[key] === undefined) delete rule[key];\n  }\n  return errors.length === before ? rule : null;\n}\n\nfunction cardFromJson(raw: unknown): LoadResult {\n  const errors: string[] = [];\n  if (!isRaw(raw)) return { ok: false, errors: ['card: not an object'] };\n  const currency = raw.currency;\n  if (typeof currency !== 'string' || !(CURRENCIES as readonly string[]).includes(currency)) {\n    errors.push('card: unknown currency');\n  }\n  for (const key of ['id', 'carrier'] as const) {\n    if (typeof raw[key] !== 'string') errors.push('card: ' + key + ' must be a string');\n  }\n  for (const key of ['version', 'discountBasisPoints'] as const) {\n    if (typeof raw[key] !== 'number') errors.push('card: ' + key + ' must be a number');\n  }\n  const rawRules = Array.isArray(raw.rules) ? raw.rules : [];\n  if (!Array.isArray(raw.rules)) errors.push('card: rules must be a list');\n  const rules: Rule[] = [];\n  rawRules.forEach((one: unknown, index: number) => {\n    const rule = readRule(one, 'rules[' + index + ']', errors);\n    if (rule) rules.push(rule);\n  });\n  if (errors.length > 0) return { ok: false, errors };\n  return {\n    ok: true,\n    card: {\n      id: raw.id as string,\n      carrier: raw.carrier as string,\n      currency: currency as Currency,\n      version: raw.version as number,\n      discountBasisPoints: raw.discountBasisPoints as number,\n      rules,\n    },\n  };\n}\n\n/* ── fixtures the pricing team tests against ───────────────────────────── */\n\nconst SAMPLE_CARD: RateCard = {\n  id: 'HGF-2026-Q4',\n  carrier: 'Harrowgate Freight',\n  currency: 'EUR',\n  version: 7,\n  discountBasisPoints: 1000,\n  rules: [\n    { kind: 'flat', id: 'pickup', label: 'Pickup', amount: 450 },\n    { kind: 'perKg', id: 'linehaul', label: 'Linehaul', centsPerKg: 85, minimum: 900, zones: ['regional', 'national'] },\n    { kind: 'percentOfValue', id: 'cover', label: 'Cover', basisPoints: 150, cap: 2500 },\n    { kind: 'flagSurcharge', id: 'fragile', label: 'Fragile handling', flag: 'fragile', amount: 300 },\n  ],\n};\n\nconst SAMPLE_SHIPMENT: Shipment = {\n  id: 'SHP-1042',\n  zone: 'regional',\n  weightGrams: 12400,\n  declaredValueCents: 48000,\n  flags: ['fragile'],\n};\n\n// Pricing team's smoke check. Prints the breakdown for the sample shipment.\n// console.log(explainQuote(quote(SAMPLE_SHIPMENT, SAMPLE_CARD)).join(' | '));\n\n\n// Version 2: quote requests carry an actor/tenant boundary and operation identity.\n// The whole batch is a preview; no money is charged and no quote is sent.\ninterface TenantCard {\n  tenantId: string;\n  card: RateCard;\n}\ninterface QuoteRequest {\n  requestId: string;\n  tenantId: string;\n  cardId: string;\n  shipment: Shipment;\n}\ninterface PlannedQuote {\n  requestId: string;\n  cardId: string;\n  currency: Currency;\n  total: number;\n}\ntype QuoteBatch =\n  | { ok: true; quotes: PlannedQuote[]; duplicates: number }\n  | { ok: false; errors: string[] };\n\nfunction planTenantQuotes(actorTenantId: string, requests: readonly QuoteRequest[], cards: readonly TenantCard[]): QuoteBatch {\n  const seen = new Map<string, string>();\n  const quotes: PlannedQuote[] = [];\n  const errors: string[] = [];\n  let duplicates = 0;\n  for (const request of requests) {\n    if (request.tenantId !== actorTenantId) {\n      errors.push('request:' + request.requestId + ':wrong-tenant');\n      continue;\n    }\n    const fingerprint = JSON.stringify([request.cardId, request.shipment.id, request.shipment.zone, request.shipment.weightGrams, request.shipment.declaredValueCents, request.shipment.flags]);\n    const previous = seen.get(request.requestId);\n    if (previous !== undefined) {\n      if (previous !== fingerprint) errors.push('request:' + request.requestId + ':conflict');\n      else duplicates++;\n      continue;\n    }\n    seen.set(request.requestId, fingerprint);\n    const matches = cards.filter(wrapper => wrapper.tenantId === actorTenantId && wrapper.card.id === request.cardId);\n    if (matches.length !== 1) {\n      errors.push('request:' + request.requestId + (matches.length === 0 ? ':unknown-card' : ':ambiguous-card'));\n      continue;\n    }\n    const result = quote(request.shipment, matches[0].card);\n    if (!result.ok) {\n      errors.push(...result.errors.map(problem => 'request:' + request.requestId + ':' + problem));\n      continue;\n    }\n    quotes.push({ requestId: request.requestId, cardId: request.cardId, currency: result.quote.currency, total: result.quote.total });\n  }\n  if (errors.length > 0) return { ok: false, errors };\n  return { ok: true, quotes, duplicates };\n}\n";
const ACTOR_PAGE_FIXED = "// Brightgate Events: a deterministic notification planner.\n// All organizations, event payloads and subscription names are fictional.\n// This module plans deliveries; it sends no email, webhook or network call.\n// The public JSON readers validate shape. Planning accepts their typed output.\n// Existing selectors are all, one event kind, one tag, or minimum severity.\n\ntype EventKind = 'ticket.opened' | 'ticket.closed' | 'invoice.issued' | 'account.changed';\ntype Severity = 'info' | 'warn' | 'critical';\ntype Channel = 'email' | 'webhook' | 'audit';\n\ntype Selector =\n  | { kind: 'all' }\n  | { kind: 'eventKind'; value: EventKind }\n  | { kind: 'tag'; value: string }\n  | { kind: 'minimumSeverity'; value: Severity };\n\ninterface EventRecord {\n  id: string;\n  tenantId: string;\n  kind: EventKind;\n  severity: Severity;\n  tags: string[];\n  subject: string;\n}\n\ninterface Subscription {\n  id: string;\n  tenantId: string;\n  enabled: boolean;\n  channel: Channel;\n  destination: string;\n  selector: Selector;\n}\n\ninterface Delivery {\n  deliveryId: string;\n  eventId: string;\n  tenantId: string;\n  subscriptionId: string;\n  channel: Channel;\n  destination: string;\n  subject: string;\n  description: string;\n}\n\ninterface Plan {\n  deliveries: Delivery[];\n  unmatched: string[];\n  duplicates: number;\n  nextSeen: string[];\n}\n\ninterface ParseError {\n  at: string;\n  message: string;\n}\n\ntype Parsed<T> =\n  | { ok: true; value: T }\n  | { ok: false; errors: ParseError[] };\n\ntype RawObject = Record<string, unknown>;\n\nconst EVENT_KINDS: readonly EventKind[] = [\n  'ticket.opened',\n  'ticket.closed',\n  'invoice.issued',\n  'account.changed',\n];\nconst SEVERITIES: readonly Severity[] = ['info', 'warn', 'critical'];\nconst CHANNELS: readonly Channel[] = ['email', 'webhook', 'audit'];\nconst SEVERITY_ORDER: Record<Severity, number> = {\n  info: 0,\n  warn: 1,\n  critical: 2,\n};\n\nfunction rawObject(value: unknown): value is RawObject {\n  return typeof value === 'object' && value !== null && !Array.isArray(value);\n}\n\nfunction nonempty(value: unknown): value is string {\n  return typeof value === 'string' && value.trim().length > 0;\n}\n\nfunction eventKind(value: unknown): value is EventKind {\n  return typeof value === 'string' && (EVENT_KINDS as readonly string[]).includes(value);\n}\n\nfunction severity(value: unknown): value is Severity {\n  return typeof value === 'string' && (SEVERITIES as readonly string[]).includes(value);\n}\n\nfunction channel(value: unknown): value is Channel {\n  return typeof value === 'string' && (CHANNELS as readonly string[]).includes(value);\n}\n\nfunction error(at: string, message: string): ParseError {\n  return { at, message };\n}\n\nfunction readText(raw: RawObject, key: string, at: string, errors: ParseError[]): string {\n  const value = raw[key];\n  if (!nonempty(value)) {\n    errors.push(error(at + '.' + key, 'must be nonempty text'));\n    return '';\n  }\n  return value.trim();\n}\n\nfunction readTags(raw: unknown, at: string): Parsed<string[]> {\n  if (!Array.isArray(raw)) {\n    return { ok: false, errors: [error(at, 'must be a list')] };\n  }\n  if (raw.length > 16) {\n    return { ok: false, errors: [error(at, 'at most 16 tags')] };\n  }\n  const tags: string[] = [];\n  const seen = new Set<string>();\n  const errors: ParseError[] = [];\n  raw.forEach((value, index) => {\n    if (!nonempty(value)) {\n      errors.push(error(at + '[' + index + ']', 'must be nonempty text'));\n      return;\n    }\n    const normalized = value.trim();\n    if (seen.has(normalized)) {\n      errors.push(error(at + '[' + index + ']', 'duplicate tag'));\n      return;\n    }\n    seen.add(normalized);\n    tags.push(normalized);\n  });\n  return errors.length ? { ok: false, errors } : { ok: true, value: tags };\n}\n\nfunction parseEvent(raw: unknown, at = 'event'): Parsed<EventRecord> {\n  if (!rawObject(raw)) return { ok: false, errors: [error(at, 'must be an object')] };\n  const errors: ParseError[] = [];\n  const id = readText(raw, 'id', at, errors);\n  const tenantId = readText(raw, 'tenantId', at, errors);\n  const subject = readText(raw, 'subject', at, errors);\n  const kind = raw.kind;\n  const level = raw.severity;\n  if (!eventKind(kind)) errors.push(error(at + '.kind', 'unknown event kind'));\n  if (!severity(level)) errors.push(error(at + '.severity', 'unknown severity'));\n  const tags = readTags(raw.tags, at + '.tags');\n  if (!tags.ok) errors.push(...tags.errors);\n  if (errors.length || !eventKind(kind) || !severity(level) || !tags.ok) {\n    return { ok: false, errors };\n  }\n  return { ok: true, value: { id, tenantId, subject, kind, severity: level, tags: tags.value } };\n}\n\nfunction parseSelector(raw: unknown, at = 'selector'): Parsed<Selector> {\n  if (!rawObject(raw)) return { ok: false, errors: [error(at, 'must be an object')] };\n  switch (raw.kind) {\n    case 'all':\n      return { ok: true, value: { kind: 'all' } };\n    case 'eventKind':\n      return eventKind(raw.value)\n        ? { ok: true, value: { kind: 'eventKind', value: raw.value } }\n        : { ok: false, errors: [error(at + '.value', 'unknown event kind')] };\n    case 'tag':\n      return nonempty(raw.value)\n        ? { ok: true, value: { kind: 'tag', value: raw.value.trim() } }\n        : { ok: false, errors: [error(at + '.value', 'must be nonempty text')] };\n    case 'minimumSeverity':\n      return severity(raw.value)\n        ? { ok: true, value: { kind: 'minimumSeverity', value: raw.value } }\n        : { ok: false, errors: [error(at + '.value', 'unknown severity')] };\n    default:\n      return { ok: false, errors: [error(at + '.kind', 'unknown selector kind')] };\n  }\n}\n\nfunction parseSubscription(raw: unknown, at = 'subscription'): Parsed<Subscription> {\n  if (!rawObject(raw)) return { ok: false, errors: [error(at, 'must be an object')] };\n  const errors: ParseError[] = [];\n  const id = readText(raw, 'id', at, errors);\n  const tenantId = readText(raw, 'tenantId', at, errors);\n  const destination = readText(raw, 'destination', at, errors);\n  if (typeof raw.enabled !== 'boolean') errors.push(error(at + '.enabled', 'must be boolean'));\n  const routeChannel = raw.channel;\n  if (!channel(routeChannel)) errors.push(error(at + '.channel', 'unknown channel'));\n  const selector = parseSelector(raw.selector, at + '.selector');\n  if (!selector.ok) errors.push(...selector.errors);\n  if (errors.length || !channel(routeChannel) || !selector.ok) return { ok: false, errors };\n  return {\n    ok: true,\n    value: { id, tenantId, destination, enabled: raw.enabled as boolean, channel: routeChannel, selector: selector.value },\n  };\n}\n\nfunction selectorMatches(selector: Selector, event: EventRecord): boolean {\n  switch (selector.kind) {\n    case 'all':\n      return true;\n    case 'eventKind':\n      return selector.value === event.kind;\n    case 'tag':\n      return event.tags.includes(selector.value);\n    case 'minimumSeverity':\n      return SEVERITY_ORDER[event.severity] >= SEVERITY_ORDER[selector.value];\n  }\n}\n\nfunction selectorDescription(selector: Selector): string {\n  switch (selector.kind) {\n    case 'all':\n      return 'all events';\n    case 'eventKind':\n      return 'event kind: ' + selector.value;\n    case 'tag':\n      return 'tag: ' + selector.value;\n    case 'minimumSeverity':\n      return 'minimum severity: ' + selector.value;\n  }\n}\n\nfunction eventKey(event: Pick<EventRecord, 'tenantId' | 'id'>): string {\n  return JSON.stringify([event.tenantId, event.id]);\n}\n\nfunction deliveryKey(event: EventRecord, subscription: Subscription): string {\n  return JSON.stringify([event.tenantId, event.id, subscription.id]);\n}\n\nfunction subjectPrefix(kind: EventKind): string {\n  switch (kind) {\n    case 'ticket.opened': return 'New ticket';\n    case 'ticket.closed': return 'Closed ticket';\n    case 'invoice.issued': return 'Invoice';\n    case 'account.changed': return 'Account change';\n  }\n}\n\nfunction makeDelivery(event: EventRecord, subscription: Subscription): Delivery {\n  return {\n    deliveryId: deliveryKey(event, subscription),\n    eventId: event.id,\n    tenantId: event.tenantId,\n    subscriptionId: subscription.id,\n    channel: subscription.channel,\n    destination: subscription.destination,\n    subject: subjectPrefix(event.kind) + ': ' + event.subject,\n    description: selectorDescription(subscription.selector),\n  };\n}\n\n// Output follows event order, then subscription order. No destination is called.\n// Replayed input is classified before routing; it cannot emit another delivery.\n// Seen identity is tenant plus event id, never the bare source id.\nfunction planEvents(events: readonly EventRecord[], subscriptions: readonly Subscription[], previousSeen: readonly string[]): Plan {\n  const seen = new Set(previousSeen);\n  const deliveries: Delivery[] = [];\n  const unmatched: string[] = [];\n  let duplicates = 0;\n  for (const event of events) {\n    const key = eventKey(event);\n    if (seen.has(key)) {\n      duplicates++;\n      continue;\n    }\n    seen.add(key);\n    let matched = false;\n    for (const subscription of subscriptions) {\n      if (!subscription.enabled) continue;\n      if (subscription.tenantId !== event.tenantId) continue;\n      if (!selectorMatches(subscription.selector, event)) continue;\n      deliveries.push(makeDelivery(event, subscription));\n      matched = true;\n    }\n    if (!matched) unmatched.push(key);\n  }\n  return { deliveries, unmatched, duplicates, nextSeen: Array.from(seen) };\n}\n\nfunction parseMany<T>(values: unknown, name: string, reader: (raw: unknown, at: string) => Parsed<T>): Parsed<T[]> {\n  if (!Array.isArray(values)) return { ok: false, errors: [error(name, 'must be a list')] };\n  const errors: ParseError[] = [];\n  const out: T[] = [];\n  values.forEach((raw, index) => {\n    const result = reader(raw, name + '[' + index + ']');\n    if (result.ok) out.push(result.value);\n    else errors.push(...result.errors);\n  });\n  return errors.length ? { ok: false, errors } : { ok: true, value: out };\n}\n\nfunction previewJson(rawEvents: unknown, rawSubscriptions: unknown): Parsed<Plan> {\n  const events = parseMany(rawEvents, 'events', parseEvent);\n  const subscriptions = parseMany(rawSubscriptions, 'subscriptions', parseSubscription);\n  if (!events.ok || !subscriptions.ok) {\n    return { ok: false, errors: [...(!events.ok ? events.errors : []), ...(!subscriptions.ok ? subscriptions.errors : [])] };\n  }\n  return { ok: true, value: planEvents(events.value, subscriptions.value, []) };\n}\n\nfunction channelCounts(plan: Plan): Record<Channel, number> {\n  const counts: Record<Channel, number> = { email: 0, webhook: 0, audit: 0 };\n  for (const delivery of plan.deliveries) counts[delivery.channel]++;\n  return counts;\n}\n\nfunction tenantCounts(plan: Plan): { tenantId: string; deliveries: number }[] {\n  const counts = new Map<string, number>();\n  for (const delivery of plan.deliveries) {\n    counts.set(delivery.tenantId, (counts.get(delivery.tenantId) ?? 0) + 1);\n  }\n  return Array.from(counts, ([tenantId, deliveries]) => ({ tenantId, deliveries }));\n}\n\nfunction auditLines(plan: Plan): string[] {\n  const lines = plan.deliveries.map(delivery =>\n    delivery.tenantId + ' / ' + delivery.eventId + ' -> ' + delivery.subscriptionId + ' [' + delivery.channel + ']');\n  lines.push('duplicates: ' + plan.duplicates);\n  lines.push('unmatched: ' + plan.unmatched.length);\n  return lines;\n}\n\nconst SAMPLE_EVENT: EventRecord = {\n  id: 'EV-17', tenantId: 'TEN-NORTH', kind: 'ticket.opened',\n  severity: 'warn', tags: ['customer', 'priority'], subject: 'Delivery queue stalled',\n};\nconst SAMPLE_SUBSCRIPTION: Subscription = {\n  id: 'SUB-4', tenantId: 'TEN-NORTH', enabled: true, channel: 'audit',\n  destination: 'support-log', selector: { kind: 'minimumSeverity', value: 'warn' },\n};\n\n// A scratch call is optional and is not a separately recorded result.\n// console.log(auditLines(planEvents([SAMPLE_EVENT], [SAMPLE_SUBSCRIPTION], [])));\n\n\n// Version 2: actor-scoped event pages, before any selector is evaluated.\ntype ActorPage = { ok: false; errors: string[] } | ({ ok: true; remaining: number } & Plan);\nfunction planActorPage(actorTenantId: string, events: readonly EventRecord[], subscriptions: readonly Subscription[], previousSeen: readonly string[], eventLimit: number): ActorPage {\n  if (!Number.isInteger(eventLimit) || eventLimit < 1 || eventLimit > 50) {\n    return { ok: false, errors: ['event-limit:1-to-50'] };\n  }\n  const owned = events.filter(event => event.tenantId === actorTenantId);\n  const page = owned.slice(0, eventLimit);\n  const plan = planEvents(page, subscriptions, previousSeen);\n  return { ok: true, remaining: owned.length - page.length, ...plan };\n}\n";
const TENANT_LEDGER_FIXED = "// Westmere Equipment: an in-memory asset-change ledger.\n// Every tenant, asset and CSV row is an invented reading fixture.\n// There is no database, file access, network or actual asset operation.\n// The CSV dialect is deliberately small: exactly six unquoted fields.\n// A whole batch either produces a new snapshot or returns errors.\n\ntype AssetStatus = 'active' | 'retired';\ninterface AssetRecord {\n  tenantId: string;\n  itemId: string;\n  revision: number;\n  location: string;\n  label: string;\n  status: AssetStatus;\n  lastChange: string;\n}\n\ninterface CommandBase {\n  tenantId: string;\n  itemId: string;\n  revision: number;\n}\ninterface CreateCommand extends CommandBase {\n  kind: 'create';\n  location: string;\n  label: string;\n}\ninterface MoveCommand extends CommandBase {\n  kind: 'move';\n  location: string;\n}\ninterface RetireCommand extends CommandBase {\n  kind: 'retire';\n}\ntype Command = CreateCommand | MoveCommand | RetireCommand;\n\ninterface RowError {\n  row: number;\n  code: string;\n}\ninterface Counts {\n  applied: number;\n  stale: number;\n  duplicate: number;\n}\ninterface AppliedBatch {\n  ok: true;\n  records: AssetRecord[];\n  counts: Counts;\n  changes: string[];\n}\ninterface RejectedBatch {\n  ok: false;\n  errors: RowError[];\n}\ntype BatchResult = AppliedBatch | RejectedBatch;\ntype ReadResult<T> = { ok: true; value: T } | { ok: false; errors: RowError[] };\n\nconst INPUT_HEADER = 'tenant_id,item_id,revision,kind,location,label';\nconst OUTPUT_HEADER = 'tenant_id,item_id,revision,location,label,status';\nconst FIELD_LIMIT = 100;\n\nfunction issue(row: number, code: string): RowError {\n  return { row, code };\n}\n\nfunction token(value: unknown): value is string {\n  return typeof value === 'string' && value.trim().length > 0\n    && value.trim().length <= FIELD_LIMIT && !/[,\\r\\n]/.test(value);\n}\n\nfunction positiveRevision(value: unknown): value is number {\n  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;\n}\n\nfunction recordKey(value: Pick<CommandBase, 'tenantId' | 'itemId'>): string {\n  return JSON.stringify([value.tenantId, value.itemId]);\n}\n\n// JSON arrays preserve the boundary between values that may contain dashes.\n// Fingerprints identify a normalized command, not an untrusted raw CSV row.\nfunction changeKey(command: Command): string {\n  switch (command.kind) {\n    case 'create':\n      return JSON.stringify([command.kind, command.tenantId, command.itemId, command.revision, command.location, command.label]);\n    case 'move':\n      return JSON.stringify([command.kind, command.tenantId, command.itemId, command.revision, command.location]);\n    case 'retire':\n      return JSON.stringify([command.kind, command.tenantId, command.itemId, command.revision]);\n  }\n}\n\nfunction describeCommand(command: Command): string {\n  const who = command.tenantId + '/' + command.itemId;\n  switch (command.kind) {\n    case 'create': return who + ': create at ' + command.location;\n    case 'move': return who + ': move to ' + command.location;\n    case 'retire': return who + ': retire';\n  }\n}\n\nfunction readRevision(value: string, row: number): ReadResult<number> {\n  // The dialect accepts decimal digits only: no exponent, sign or fraction.\n  if (!/^[0-9]+$/.test(value)) {\n    return { ok: false, errors: [issue(row, 'revision:decimal-integer-required')] };\n  }\n  const revision = Number(value);\n  return positiveRevision(revision)\n    ? { ok: true, value: revision }\n    : { ok: false, errors: [issue(row, 'revision:positive-safe-integer-required')] };\n}\n\nfunction parseCommand(cells: string[], row: number): ReadResult<Command> {\n  if (cells.length !== 6) return { ok: false, errors: [issue(row, 'row:exactly-six-fields')] };\n  const [tenantId, itemId, revisionText, kind, location, label] = cells.map(value => value.trim());\n  const errors: RowError[] = [];\n  if (!token(tenantId)) errors.push(issue(row, 'tenant:invalid'));\n  if (!token(itemId)) errors.push(issue(row, 'item:invalid'));\n  const revision = readRevision(revisionText, row);\n  if (!revision.ok) errors.push(...revision.errors);\n  if (errors.length || !revision.ok) return { ok: false, errors };\n  const base: CommandBase = { tenantId, itemId, revision: revision.value };\n  switch (kind) {\n    case 'create':\n      if (!token(location)) errors.push(issue(row, 'location:invalid'));\n      if (!token(label)) errors.push(issue(row, 'label:invalid'));\n      if (errors.length) return { ok: false, errors };\n      return { ok: true, value: { ...base, kind: 'create', location, label } };\n    case 'move':\n      if (!token(location)) errors.push(issue(row, 'location:invalid'));\n      if (label !== '') errors.push(issue(row, 'label:must-be-empty'));\n      if (errors.length) return { ok: false, errors };\n      return { ok: true, value: { ...base, kind: 'move', location } };\n    case 'retire':\n      if (location !== '') errors.push(issue(row, 'location:must-be-empty'));\n      if (label !== '') errors.push(issue(row, 'label:must-be-empty'));\n      if (errors.length) return { ok: false, errors };\n      return { ok: true, value: { ...base, kind: 'retire' } };\n    default:\n      return { ok: false, errors: [issue(row, 'kind:unknown')] };\n  }\n}\n\nfunction readCsv(text: string): ReadResult<{ command: Command; row: number }[]> {\n  const lines = text.split(/\\r?\\n/);\n  if (lines[0] !== INPUT_HEADER) {\n    return { ok: false, errors: [issue(1, 'header:invalid')] };\n  }\n  const commands: { command: Command; row: number }[] = [];\n  const errors: RowError[] = [];\n  for (let index = 1; index < lines.length; index++) {\n    if (lines[index].trim() === '') continue;\n    const row = index + 1;\n    const parsed = parseCommand(lines[index].split(','), row);\n    if (parsed.ok) commands.push({ command: parsed.value, row });\n    else errors.push(...parsed.errors);\n  }\n  return errors.length ? { ok: false, errors } : { ok: true, value: commands };\n}\n\nfunction recordProblems(record: AssetRecord, row: number): RowError[] {\n  const out: RowError[] = [];\n  if (!token(record.tenantId)) out.push(issue(row, 'snapshot:tenant-invalid'));\n  if (!token(record.itemId)) out.push(issue(row, 'snapshot:item-invalid'));\n  if (!positiveRevision(record.revision)) out.push(issue(row, 'snapshot:revision-invalid'));\n  if (!token(record.location)) out.push(issue(row, 'snapshot:location-invalid'));\n  if (!token(record.label)) out.push(issue(row, 'snapshot:label-invalid'));\n  if (record.status !== 'active' && record.status !== 'retired') out.push(issue(row, 'snapshot:status-invalid'));\n  if (typeof record.lastChange !== 'string' || record.lastChange === '') out.push(issue(row, 'snapshot:change-invalid'));\n  return out;\n}\n\nfunction copyRecord(record: AssetRecord): AssetRecord {\n  return {\n    tenantId: record.tenantId,\n    itemId: record.itemId,\n    revision: record.revision,\n    location: record.location,\n    label: record.label,\n    status: record.status,\n    lastChange: record.lastChange,\n  };\n}\n\nfunction readSnapshot(records: readonly AssetRecord[]): ReadResult<Map<string, AssetRecord>> {\n  const index = new Map<string, AssetRecord>();\n  const errors: RowError[] = [];\n  records.forEach((record, position) => {\n    errors.push(...recordProblems(record, position + 1));\n    const key = recordKey(record);\n    if (index.has(key)) errors.push(issue(position + 1, 'snapshot:duplicate-identity'));\n    else index.set(key, copyRecord(record));\n  });\n  return errors.length ? { ok: false, errors } : { ok: true, value: index };\n}\n\nfunction applyCommand(previous: AssetRecord | undefined, command: Command, row: number): ReadResult<AssetRecord> {\n  switch (command.kind) {\n    case 'create':\n      if (previous) return { ok: false, errors: [issue(row, 'create:already-exists')] };\n      return {\n        ok: true,\n        value: { tenantId: command.tenantId, itemId: command.itemId, revision: command.revision,\n          location: command.location, label: command.label, status: 'active', lastChange: changeKey(command) },\n      };\n    case 'move':\n      if (!previous) return { ok: false, errors: [issue(row, 'move:not-found')] };\n      if (previous.status === 'retired') return { ok: false, errors: [issue(row, 'move:retired')] };\n      return { ok: true, value: { ...previous, revision: command.revision, location: command.location, lastChange: changeKey(command) } };\n    case 'retire':\n      if (!previous) return { ok: false, errors: [issue(row, 'retire:not-found')] };\n      if (previous.status === 'retired') return { ok: false, errors: [issue(row, 'retire:retired')] };\n      return { ok: true, value: { ...previous, revision: command.revision, status: 'retired', lastChange: changeKey(command) } };\n  }\n}\n\n// Parse the entire CSV before changing the staged snapshot.\n// Any application conflict also rejects the entire staged result.\n// The caller's snapshot remains unchanged even when a later row fails.\nfunction applyCsv(snapshot: readonly AssetRecord[], csv: string): BatchResult {\n  const read = readCsv(csv);\n  const initial = readSnapshot(snapshot);\n  if (!read.ok || !initial.ok) {\n    return { ok: false, errors: [...(!read.ok ? read.errors : []), ...(!initial.ok ? initial.errors : [])] };\n  }\n  const staged = initial.value;\n  const counts: Counts = { applied: 0, stale: 0, duplicate: 0 };\n  const changes: string[] = [];\n  for (const { command, row } of read.value) {\n    const key = recordKey(command);\n    const previous = staged.get(key);\n    if (previous && command.revision < previous.revision) {\n      counts.stale++;\n      continue;\n    }\n    if (previous && command.revision === previous.revision) {\n      if (previous.lastChange !== changeKey(command)) {\n        return { ok: false, errors: [issue(row, 'revision:conflict')] };\n      }\n      counts.duplicate++;\n      continue;\n    }\n    const applied = applyCommand(previous, command, row);\n    if (!applied.ok) return { ok: false, errors: applied.errors };\n    staged.set(key, applied.value);\n    counts.applied++;\n    changes.push(describeCommand(command));\n  }\n  return { ok: true, records: Array.from(staged.values()), counts, changes };\n}\n\nfunction recordsForTenant(records: readonly AssetRecord[], tenantId: string): AssetRecord[] {\n  return records.filter(record => record.tenantId === tenantId).map(copyRecord);\n}\n\nfunction activeByLocation(records: readonly AssetRecord[], tenantId: string): { location: string; count: number }[] {\n  const counts = new Map<string, number>();\n  for (const record of records) {\n    if (record.tenantId !== tenantId || record.status !== 'active') continue;\n    counts.set(record.location, (counts.get(record.location) ?? 0) + 1);\n  }\n  return Array.from(counts, ([location, count]) => ({ location, count }));\n}\n\n// The operator uses these counts when reconciling a tenant export.\nfunction tenantAudit(records: readonly AssetRecord[], tenantId: string): {\n  active: number;\n  retired: number;\n  latestRevision: number | null;\n} {\n  let active = 0;\n  let retired = 0;\n  let latestRevision: number | null = null;\n  for (const record of records) {\n    if (record.tenantId !== tenantId) continue;\n    if (record.status === 'active') active++;\n    else retired++;\n    latestRevision = latestRevision === null ? record.revision : Math.max(latestRevision, record.revision);\n  }\n  return { active, retired, latestRevision };\n}\n\nfunction snapshotCsv(records: readonly AssetRecord[], tenantId: string): string {\n  const rows = recordsForTenant(records, tenantId).map(record => [\n    record.tenantId, record.itemId, String(record.revision), record.location, record.label, record.status,\n  ].join(','));\n  return [OUTPUT_HEADER, ...rows].join('\\n');\n}\n\nfunction summarize(result: BatchResult): string[] {\n  if (!result.ok) return result.errors.map(problem => 'row ' + problem.row + ': ' + problem.code);\n  return [\n    'applied: ' + result.counts.applied,\n    'stale: ' + result.counts.stale,\n    'duplicate: ' + result.counts.duplicate,\n    ...result.changes,\n  ];\n}\n\nconst SAMPLE_CSV = [\n  INPUT_HEADER,\n  'TEN-WEST,EQ-8,1,create,Depot-A,Pressure gauge',\n  'TEN-WEST,EQ-8,2,move,Depot-B,',\n  'TEN-EAST,EQ-8,1,create,Depot-C,Spare gauge',\n].join('\\n');\n\n// Optional scratch call; it records no separate result.\n// console.log(summarize(applyCsv([], SAMPLE_CSV)).join(' | '));\n\n\n// Version 2: explicit actor authority and preview versus committed local output.\ntype ApplyMode = 'preview' | 'commit';\nfunction applyTenantCsv(actorTenantId: string, snapshot: readonly AssetRecord[], csv: string, mode: ApplyMode): BatchResult {\n  const parsed = readCsv(csv);\n  if (!parsed.ok) return { ok: false, errors: parsed.errors };\n  const foreign = parsed.value.filter(entry => entry.command.tenantId !== actorTenantId);\n  if (foreign.length > 0) return { ok: false, errors: foreign.map(entry => issue(entry.row, 'tenant:forbidden')) };\n  const result = applyCsv(snapshot, csv);\n  if (!result.ok) return result;\n  const records = mode === 'preview' ? snapshot.map(copyRecord) : result.records;\n  return { ...result, records };\n}\n";
export const FDE_IP02_SOLUTIONS: Record<string, PathCodeSolution> = {
  "fde-v1-ip02-tenant-quotes": {
    "solution": TENANT_QUOTES_FIXED,
    "hiddenTests": [
      {
        "call": "__quotePlan([__quoteRequest({tenantId:'TEN-SOUTH'})],[__tenantCard('TEN-SOUTH',900),__tenantCard('TEN-NORTH',100)])",
        "expected": {
          "ok": false,
          "errors": [
            "request:REQ-1:wrong-tenant"
          ]
        },
        "criterion": "tenant-boundary",
        "label": "the request itself must belong to the actor"
      },
      {
        "call": "__quotePlan([__quoteRequest()],[__tenantCard('TEN-NORTH',100),__tenantCard('TEN-NORTH',200)])",
        "expected": {
          "ok": false,
          "errors": [
            "request:REQ-1:ambiguous-card"
          ]
        },
        "criterion": "tenant-boundary",
        "label": "ambiguous own-tenant cards refuse"
      },
      {
        "call": "(() => { var one=__quoteRequest(); var two=__quoteRequest({shipment:{flags:[],declaredValueCents:0,weightGrams:1000,zone:'local',id:'S-1'}}); return __quotePlan([one,two],[__tenantCard('TEN-NORTH',100)]).duplicates; })()",
        "expected": 1,
        "criterion": "request-identity",
        "label": "object property order does not change a request payload"
      },
      {
        "call": "__quotePlan([__quoteRequest(),__quoteRequest({cardId:'C-2'})],[__tenantCard('TEN-NORTH',100),__tenantCard('TEN-NORTH',200,'C-2')])",
        "expected": {
          "ok": false,
          "errors": [
            "request:REQ-1:conflict"
          ]
        },
        "criterion": "request-identity",
        "label": "card choice belongs to the operation identity"
      },
      {
        "call": "__quotePlan([__quoteRequest({shipment:{id:'S-1',zone:'local',weightGrams:0,declaredValueCents:0,flags:[]}})],[__tenantCard('TEN-NORTH',100)])",
        "expected": {
          "ok": false,
          "errors": [
            "request:REQ-1:shipment: weight must be positive whole grams"
          ]
        },
        "criterion": "all-or-nothing",
        "label": "an underlying price validation error is not successful output"
      },
      {
        "call": "__quotePlan([__quoteRequest({requestId:'A',cardId:'missing'}),__quoteRequest({requestId:'B',tenantId:'TEN-SOUTH'})],[])",
        "expected": {
          "ok": false,
          "errors": [
            "request:A:unknown-card",
            "request:B:wrong-tenant"
          ]
        },
        "criterion": "all-or-nothing",
        "label": "errors preserve request order"
      },
      {
        "call": "(() => { var request=__quoteRequest(); Object.freeze(request.shipment.flags);Object.freeze(request.shipment);Object.freeze(request);var card=__tenantCard('TEN-NORTH',100);Object.freeze(card.card.rules[0]);Object.freeze(card.card.rules);Object.freeze(card.card);Object.freeze(card);return __quotePlan(Object.freeze([request]),Object.freeze([card])); })()",
        "expected": {
          "ok": true,
          "quotes": [
            {
              "requestId": "REQ-1",
              "cardId": "C-1",
              "currency": "EUR",
              "total": 100
            }
          ],
          "duplicates": 0
        },
        "criterion": "all-or-nothing",
        "label": "frozen caller input remains valid"
      },
      {
        "call": "__quotePlan([],[])",
        "expected": {
          "ok": true,
          "quotes": [],
          "duplicates": 0
        },
        "criterion": "all-or-nothing",
        "label": "an empty plan has no hidden effect"
      },
      {
        "call": "['id','zone','weightGrams','declaredValueCents','flags'].map(function(field){var one=__quoteRequest();var shipment=Object.assign({},one.shipment);var changed={id:'S-2',zone:'regional',weightGrams:2000,declaredValueCents:100,flags:['fragile']};shipment[field]=changed[field];return __quotePlan([one,__quoteRequest({shipment:shipment})],[__tenantCard('TEN-NORTH',100)]);})",
        "expected": [
          {
            "ok": false,
            "errors": [
              "request:REQ-1:conflict"
            ]
          },
          {
            "ok": false,
            "errors": [
              "request:REQ-1:conflict"
            ]
          },
          {
            "ok": false,
            "errors": [
              "request:REQ-1:conflict"
            ]
          },
          {
            "ok": false,
            "errors": [
              "request:REQ-1:conflict"
            ]
          },
          {
            "ok": false,
            "errors": [
              "request:REQ-1:conflict"
            ]
          }
        ],
        "criterion": "request-identity",
        "label": "every shipment field participates in request identity"
      },
      {
        "call": "__quotePlan([__quoteRequest({shipment:{id:'S-1',zone:'local',weightGrams:1000,declaredValueCents:0,flags:['fragile','hazmat']}}),__quoteRequest({shipment:{id:'S-1',zone:'local',weightGrams:1000,declaredValueCents:0,flags:['hazmat','fragile']}})],[__tenantCard('TEN-NORTH',100)])",
        "expected": {
          "ok": false,
          "errors": [
            "request:REQ-1:conflict"
          ]
        },
        "criterion": "request-identity",
        "label": "flag input order belongs to the exact payload"
      },
      {
        "call": "__quotePlan([__quoteRequest({shipment:{id:'S-1',zone:'local',weightGrams:0,declaredValueCents:0,flags:[]}}),__quoteRequest()],[__tenantCard('TEN-NORTH',100)])",
        "expected": {
          "ok": false,
          "errors": [
            "request:REQ-1:shipment: weight must be positive whole grams",
            "request:REQ-1:conflict"
          ]
        },
        "criterion": "request-identity",
        "label": "a pricing failure still claims the operation id"
      },
      {
        "call": "__quotePlan([__quoteRequest({tenantId:'TEN-SOUTH',cardId:'missing'}),__quoteRequest()],[__tenantCard('TEN-NORTH',100)])",
        "expected": {
          "ok": false,
          "errors": [
            "request:REQ-1:wrong-tenant"
          ]
        },
        "criterion": "tenant-boundary",
        "label": "an unauthorized request cannot claim an authorized operation id"
      },
      {
        "call": "(() => {var r=__quoteRequest({shipment:SAMPLE_SHIPMENT});return __quotePlan([r],[{tenantId:'TEN-NORTH',card:Object.assign({},SAMPLE_CARD,{id:'C-1'})}]);})()",
        "expected": {
          "ok": true,
          "quotes": [
            {
              "requestId": "REQ-1",
              "cardId": "C-1",
              "currency": "EUR",
              "total": 2419
            }
          ],
          "duplicates": 0
        },
        "criterion": "core",
        "label": "existing discounts and all original pricing rules survive batching"
      }
    ]
  },
  "fde-v1-ip02-actor-page": {
    "solution": ACTOR_PAGE_FIXED,
    "hiddenTests": [
      {
        "call": "__page([__ev()],[__sub()],[eventKey(__ev())],1).deliveries.length",
        "expected": 0,
        "criterion": "replay-state",
        "label": "a replay emits no deliveries"
      },
      {
        "call": "__view(__page([__ev(\"E1\"),__ev(\"E2\",\"TEN-NORTH\",[\"urgent\"])],[__sub(\"TEN-NORTH\",{kind:\"tag\",value:\"urgent\"})]))",
        "expected": {
          "ok": true,
          "remaining": 1,
          "events": [],
          "duplicates": 0,
          "unmatched": [
            "[\"TEN-NORTH\",\"E1\"]"
          ],
          "seen": [
            "[\"TEN-NORTH\",\"E1\"]"
          ]
        },
        "criterion": "page-boundary",
        "label": "unmatched first event consumes the slot"
      },
      {
        "call": "__page([__ev(\"E1\"),__ev(\"E2\")],[__sub()],[eventKey(__ev())],1).remaining",
        "expected": 1,
        "criterion": "page-boundary",
        "label": "a duplicate also consumes a slot"
      },
      {
        "call": "__page([__ev(\"other\",\"TEN-SOUTH\")],[__sub(\"TEN-SOUTH\")],[],50).nextSeen",
        "expected": [],
        "criterion": "tenant-boundary",
        "label": "an all-foreign batch consumes no seen identity"
      },
      {
        "call": "__page([],[],[eventKey(__ev(\"historic\",\"TEN-SOUTH\"))],50).nextSeen",
        "expected": [
          "[\"TEN-SOUTH\",\"historic\"]"
        ],
        "criterion": "replay-state",
        "label": "unrelated persisted identities survive"
      },
      {
        "call": "[1,50].map(function(n){return __page([],[],[],n).ok;})",
        "expected": [
          true,
          true
        ],
        "criterion": "page-boundary",
        "label": "both size endpoints are valid"
      },
      {
        "call": "[1.5,51,-1].map(function(n){return __page([],[],[],n).ok;})",
        "expected": [
          false,
          false,
          false
        ],
        "criterion": "page-boundary",
        "label": "fractional and outside limits refuse"
      },
      {
        "call": "(() => {var e=__ev();Object.freeze(e.tags);Object.freeze(e);return __page(Object.freeze([e]),Object.freeze([__sub()]),Object.freeze([]),1).deliveries.length;})()",
        "expected": 1,
        "criterion": "tenant-boundary",
        "label": "frozen caller data remains valid"
      },
      {
        "call": "(() => {var events=Array.from({length:51},function(_,i){return __ev('E'+i);});var p=__page(events,[__sub()],[],50);return [p.ok,p.remaining,p.deliveries.length,p.deliveries[0].eventId,p.deliveries[49].eventId,p.nextSeen.length];})()",
        "expected": [
          true,
          1,
          50,
          "E0",
          "E49",
          50
        ],
        "criterion": "page-boundary",
        "label": "a full fifty-event page preserves the requested size and order"
      },
      {
        "call": "__view(__page([__ev('E1'),__ev('E2')],[__sub()],[eventKey(__ev())],1))",
        "expected": {
          "ok": true,
          "remaining": 1,
          "events": [],
          "duplicates": 1,
          "unmatched": [],
          "seen": [
            "[\"TEN-NORTH\",\"E1\"]"
          ]
        },
        "criterion": "page-boundary",
        "label": "a consumed replay does not advance to the next fresh event"
      }
    ]
  },
  "fde-v1-ip02-tenant-ledger": {
    "solution": TENANT_LEDGER_FIXED,
    "hiddenTests": [
      {
        "call": "__ledger([\"TEN-SOUTH,A1,1,create,R1,Monitor\",\"TEN-EAST,A2,1,create,R2,Screen\"])",
        "expected": {
          "ok": false,
          "errors": [
            {
              "row": 2,
              "code": "tenant:forbidden"
            },
            {
              "row": 3,
              "code": "tenant:forbidden"
            }
          ]
        },
        "criterion": "tenant-boundary",
        "label": "all unauthorized rows retain CSV order"
      },
      {
        "call": "__ledger([\"TEN-NORTH,A1,1,create,R1,Monitor\"],\"preview\").counts.applied",
        "expected": 1,
        "criterion": "preview-output",
        "label": "preview counts hypothetical work"
      },
      {
        "call": "(() => {var a=__ledger([\"TEN-NORTH,A1,2,create,R1,Monitor\"]);return __ledger([\"TEN-NORTH,A1,1,move,R2,\"],\"commit\",a.records).counts;})()",
        "expected": {
          "applied": 0,
          "stale": 1,
          "duplicate": 0
        },
        "criterion": "revision-identity",
        "label": "strictly lower revision stays stale"
      },
      {
        "call": "(() => {var a=__ledger([\"TEN-NORTH,A1,1,create,R1,Monitor\"]);return __ledger([\"TEN-NORTH,A1,1,move,R2,\"],\"preview\",a.records).ok;})()",
        "expected": false,
        "criterion": "revision-identity",
        "label": "preview does not hide a conflict"
      },
      {
        "call": "(() => {var a=__ledger([\"TEN-NORTH,A1,1,create,R1,Monitor\"]);Object.freeze(a.records[0]);Object.freeze(a.records);var b=__ledger([\"TEN-NORTH,A1,2,move,R2,\"],\"preview\",a.records);return [b.records[0].location,b.counts.applied,b.records[0]!==a.records[0],a.records[0].location];})()",
        "expected": [
          "R1",
          1,
          true,
          "R1"
        ],
        "criterion": "preview-output",
        "label": "preview copies frozen original records without applying changes"
      },
      {
        "call": "__ledger([\"TEN-NORTH,A1,1,create,R1,Monitor\",\"TEN-NORTH,missing,2,move,R2,\"]).ok",
        "expected": false,
        "criterion": "preview-output",
        "label": "later failure refuses the whole batch"
      },
      {
        "call": "(() => {var other={tenantId:\"TEN-SOUTH\",itemId:\"A1\",revision:1,location:\"R9\",label:\"Other\",status:\"active\",lastChange:\"old\"};return __ledger([\"TEN-NORTH,A1,1,create,R1,Monitor\"],\"commit\",[other]).records.map(function(x){return [x.tenantId,x.location];});})()",
        "expected": [
          [
            "TEN-SOUTH",
            "R9"
          ],
          [
            "TEN-NORTH",
            "R1"
          ]
        ],
        "criterion": "tenant-boundary",
        "label": "foreign snapshot records remain unchanged"
      },
      {
        "call": "__ledger(['TEN-SOUTH,A1,1,create,R1,Monitor','TEN-NORTH,A2,1,move,R2,unexpected'])",
        "expected": {
          "ok": false,
          "errors": [
            {
              "row": 3,
              "code": "label:must-be-empty"
            }
          ]
        },
        "criterion": "tenant-boundary",
        "label": "whole-file parse errors precede authority checks"
      },
      {
        "call": "__ledger(['TEN-NORTH,A1,1,create,R1,Monitor','TEN-NORTH,missing,2,move,R2,'])",
        "expected": {
          "ok": false,
          "errors": [
            {
              "row": 3,
              "code": "move:not-found"
            }
          ]
        },
        "criterion": "preview-output",
        "label": "application failure returns only the exact rejection without staged records"
      },
      {
        "call": "__ledger(['TEN-NORTH,A1,2,move,R2,'],'preview',[__record()])",
        "expected": {
          "ok": true,
          "records": [
            {
              "tenantId": "TEN-NORTH",
              "itemId": "A1",
              "revision": 1,
              "location": "R1",
              "label": "Monitor",
              "status": "active",
              "lastChange": "[\"create\",\"TEN-NORTH\",\"A1\",1,\"R1\",\"Monitor\"]"
            }
          ],
          "counts": {
            "applied": 1,
            "stale": 0,
            "duplicate": 0
          },
          "changes": [
            "TEN-NORTH/A1: move to R2"
          ]
        },
        "criterion": "preview-output",
        "label": "preview returns original records but hypothetical changes and counts"
      }
    ]
  }
};
