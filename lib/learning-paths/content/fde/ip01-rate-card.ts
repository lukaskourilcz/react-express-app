/** IP01 drill A fixture: a freight rate-card engine the learner extends.
 *
 * The starter of `fde-v1-ip01-rate-card` is this file's `RATE_CARD_FIXTURE`,
 * unchanged. It is deliberately foreign: its own naming, a parser, a
 * validator and two exhaustive switches the new rule kind has to reach.
 * Harrowgate Freight, its carriers and every amount are invented for this
 * drill. Nothing in it does I/O. */

export const RATE_CARD_FIXTURE = String.raw`// Harrowgate Freight: quoting service, rate-card engine.
//
// Owned by the pricing team. Carriers send rate cards as JSON. Ops loads a
// card with cardFromJson, validateCard refuses anything malformed, and quote()
// prices one shipment against one card. Money is integer cents and weight is
// integer grams everywhere in this file. Nothing here does I/O.

type Cents = number;
type Grams = number;
type Currency = 'EUR' | 'GBP' | 'USD';
type ZoneId = 'local' | 'regional' | 'national';
type ShipmentFlag = 'fragile' | 'residential' | 'hazmat' | 'liftgate';

const ZONES: readonly ZoneId[] = ['local', 'regional', 'national'];
const FLAGS: readonly ShipmentFlag[] = ['fragile', 'residential', 'hazmat', 'liftgate'];
const CURRENCIES: readonly Currency[] = ['EUR', 'GBP', 'USD'];

interface Shipment {
  id: string;
  zone: ZoneId;
  weightGrams: Grams;
  declaredValueCents: Cents;
  flags: ShipmentFlag[];
}

/* ── rules ─────────────────────────────────────────────────────────────── */

interface FlatRule {
  kind: 'flat';
  id: string;
  label: string;
  amount: Cents;
  zones?: ZoneId[];
}

interface PerKgRule {
  kind: 'perKg';
  id: string;
  label: string;
  centsPerKg: Cents;
  minimum?: Cents;
  zones?: ZoneId[];
}

interface ValueRule {
  kind: 'percentOfValue';
  id: string;
  label: string;
  basisPoints: number;
  cap?: Cents;
}

interface FlagRule {
  kind: 'flagSurcharge';
  id: string;
  label: string;
  flag: ShipmentFlag;
  amount: Cents;
}

type Rule = FlatRule | PerKgRule | ValueRule | FlagRule;
type RuleKind = Rule['kind'];

/** Base charges take the card's discount; surcharges never do (contract
 * clause 4.2 with every carrier). */
const DISCOUNTABLE: Record<RuleKind, boolean> = {
  flat: true,
  perKg: true,
  percentOfValue: false,
  flagSurcharge: false,
};

interface RateCard {
  id: string;
  carrier: string;
  currency: Currency;
  version: number;
  discountBasisPoints: number;
  rules: Rule[];
}

interface LineItem {
  ruleId: string;
  label: string;
  amount: Cents;
  discountable: boolean;
}

interface Quote {
  shipmentId: string;
  cardId: string;
  currency: Currency;
  lines: LineItem[];
  subtotal: Cents;
  discount: Cents;
  total: Cents;
}

type QuoteResult = { ok: true; quote: Quote } | { ok: false; errors: string[] };
type LoadResult = { ok: true; card: RateCard } | { ok: false; errors: string[] };

/* ── helpers ───────────────────────────────────────────────────────────── */

const isWholeCents = (value: unknown): value is Cents =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const isZone = (value: unknown): value is ZoneId =>
  typeof value === 'string' && (ZONES as readonly string[]).includes(value);

const isFlag = (value: unknown): value is ShipmentFlag =>
  typeof value === 'string' && (FLAGS as readonly string[]).includes(value);

/** Billed per started kilogram: 1 g is 1 kg, 1000 g is 1 kg, 1001 g is 2. */
const startedKg = (grams: Grams): number => Math.ceil(grams / 1000);

/** Basis points of an amount, rounded half up to the cent. */
const basisPointsOf = (amount: Cents, basisPoints: number): Cents =>
  Math.floor((amount * basisPoints + 5000) / 10000);

const appliesToZone = (zones: ZoneId[] | undefined, zone: ZoneId): boolean =>
  zones === undefined || zones.includes(zone);

const zoneSuffix = (zones: ZoneId[] | undefined): string =>
  zones === undefined ? '' : ' (' + zones.join(', ') + ')';

const formatCents = (amount: Cents, currency: Currency): string => {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return sign + currency + ' ' + Math.floor(abs / 100) + '.' + String(abs % 100).padStart(2, '0');
};

const assertNever = (value: never, where: string): never => {
  throw new Error('unhandled ' + where + ': ' + JSON.stringify(value));
};

/* ── pricing ───────────────────────────────────────────────────────────── */

/** One rule's charge for one shipment, or null when the rule does not apply.
 * A rule that applies and comes to zero returns 0, so its line still shows. */
function priceRule(rule: Rule, shipment: Shipment): Cents | null {
  switch (rule.kind) {
    case 'flat':
      return appliesToZone(rule.zones, shipment.zone) ? rule.amount : null;
    case 'perKg': {
      if (!appliesToZone(rule.zones, shipment.zone)) return null;
      const charge = startedKg(shipment.weightGrams) * rule.centsPerKg;
      return rule.minimum !== undefined && charge < rule.minimum ? rule.minimum : charge;
    }
    case 'percentOfValue': {
      const charge = basisPointsOf(shipment.declaredValueCents, rule.basisPoints);
      return rule.cap !== undefined && charge > rule.cap ? rule.cap : charge;
    }
    case 'flagSurcharge':
      return shipment.flags.includes(rule.flag) ? rule.amount : null;
    default:
      return assertNever(rule, 'rule kind');
  }
}

/** The one-line summary ops sees next to each rule in the admin console. */
function describeRule(rule: Rule): string {
  switch (rule.kind) {
    case 'flat':
      return rule.label + ': flat ' + rule.amount + 'c' + zoneSuffix(rule.zones);
    case 'perKg':
      return rule.label + ': ' + rule.centsPerKg + 'c per started kg'
        + (rule.minimum !== undefined ? ', minimum ' + rule.minimum + 'c' : '') + zoneSuffix(rule.zones);
    case 'percentOfValue':
      return rule.label + ': ' + rule.basisPoints + ' bp of declared value'
        + (rule.cap !== undefined ? ', capped at ' + rule.cap + 'c' : '');
    case 'flagSurcharge':
      return rule.label + ': ' + rule.amount + 'c when ' + rule.flag;
    default:
      return assertNever(rule, 'rule kind');
  }
}

/* ── validation ────────────────────────────────────────────────────────── */

function ruleProblems(rule: Rule): string[] {
  const at = 'rule ' + rule.id + ': ';
  const out: string[] = [];
  if (rule.label.trim() === '') out.push(at + 'label must not be empty');
  switch (rule.kind) {
    case 'flat':
      if (!isWholeCents(rule.amount)) out.push(at + 'amount must be whole cents');
      if (rule.zones !== undefined && rule.zones.length === 0) out.push(at + 'zones must not be empty');
      break;
    case 'perKg':
      if (!isWholeCents(rule.centsPerKg)) out.push(at + 'centsPerKg must be whole cents');
      if (rule.minimum !== undefined && !isWholeCents(rule.minimum)) out.push(at + 'minimum must be whole cents');
      if (rule.zones !== undefined && rule.zones.length === 0) out.push(at + 'zones must not be empty');
      break;
    case 'percentOfValue':
      if (!Number.isInteger(rule.basisPoints) || rule.basisPoints < 0 || rule.basisPoints > 10000) {
        out.push(at + 'basisPoints must be 0 to 10000');
      }
      if (rule.cap !== undefined && !isWholeCents(rule.cap)) out.push(at + 'cap must be whole cents');
      break;
    case 'flagSurcharge':
      if (!isFlag(rule.flag)) out.push(at + 'unknown flag');
      if (!isWholeCents(rule.amount)) out.push(at + 'amount must be whole cents');
      break;
    default:
      return assertNever(rule, 'rule kind');
  }
  return out;
}

/** Every problem with a card, in rule order. An empty list means quote() may
 * price against it. */
function validateCard(card: RateCard): string[] {
  const problems: string[] = [];
  if (!CURRENCIES.includes(card.currency)) problems.push('card: unknown currency');
  if (!Number.isInteger(card.discountBasisPoints) || card.discountBasisPoints < 0 || card.discountBasisPoints > 5000) {
    problems.push('card: discount must be 0 to 5000 bp');
  }
  if (card.rules.length === 0) problems.push('card: no rules');
  const seen = new Set<string>();
  for (const rule of card.rules) {
    if (seen.has(rule.id)) problems.push('rule ' + rule.id + ': duplicate id');
    seen.add(rule.id);
    problems.push(...ruleProblems(rule));
  }
  return problems;
}

function shipmentProblems(shipment: Shipment): string[] {
  const out: string[] = [];
  if (!Number.isSafeInteger(shipment.weightGrams) || shipment.weightGrams <= 0) {
    out.push('shipment: weight must be positive whole grams');
  }
  if (!isZone(shipment.zone)) out.push('shipment: unknown zone');
  if (!isWholeCents(shipment.declaredValueCents)) out.push('shipment: declared value must be whole cents');
  for (const flag of shipment.flags) if (!isFlag(flag)) out.push('shipment: unknown flag ' + flag);
  return out;
}

/* ── quoting ───────────────────────────────────────────────────────────── */

function quote(shipment: Shipment, card: RateCard): QuoteResult {
  const errors = [...shipmentProblems(shipment), ...validateCard(card)];
  if (errors.length > 0) return { ok: false, errors };
  const lines: LineItem[] = [];
  for (const rule of card.rules) {
    const amount = priceRule(rule, shipment);
    if (amount === null) continue;
    lines.push({ ruleId: rule.id, label: rule.label, amount, discountable: DISCOUNTABLE[rule.kind] });
  }
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const base = lines.filter((line) => line.discountable).reduce((sum, line) => sum + line.amount, 0);
  const discount = basisPointsOf(base, card.discountBasisPoints);
  return {
    ok: true,
    quote: {
      shipmentId: shipment.id,
      cardId: card.id,
      currency: card.currency,
      lines,
      subtotal,
      discount,
      total: subtotal - discount,
    },
  };
}

/** The plain-text breakdown the support desk pastes into replies. */
function explainQuote(result: QuoteResult): string[] {
  if (!result.ok) return result.errors.map((error) => 'cannot quote: ' + error);
  const { quote: q } = result;
  const out = q.lines.map((line) => line.label + ' ' + formatCents(line.amount, q.currency));
  if (q.discount > 0) out.push('Discount -' + formatCents(q.discount, q.currency));
  out.push('Total ' + formatCents(q.total, q.currency));
  return out;
}

/* ── loading cards from carrier JSON ───────────────────────────────────── */

type Raw = Record<string, unknown>;

const isRaw = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads shape only: the right fields with the right JSON types. Value checks
 * (ranges, whole cents) belong to validateCard, which runs on every quote. */
function readRule(raw: unknown, at: string, errors: string[]): Rule | null {
  if (!isRaw(raw)) {
    errors.push(at + ': not an object');
    return null;
  }
  const str = (key: string): string => {
    const value = raw[key];
    if (typeof value === 'string') return value;
    errors.push(at + ': ' + key + ' must be a string');
    return '';
  };
  const num = (key: string): number => {
    const value = raw[key];
    if (typeof value === 'number') return value;
    errors.push(at + ': ' + key + ' must be a number');
    return 0;
  };
  const optNum = (key: string): number | undefined => (raw[key] === undefined ? undefined : num(key));
  const optZones = (): ZoneId[] | undefined => {
    const value = raw.zones;
    if (value === undefined) return undefined;
    if (Array.isArray(value) && value.every(isZone)) return value;
    errors.push(at + ': zones must be a list of zones');
    return undefined;
  };
  const before = errors.length;
  const id = str('id');
  const label = str('label');
  let rule: Rule;
  switch (raw.kind) {
    case 'flat':
      rule = { kind: 'flat', id, label, amount: num('amount'), zones: optZones() };
      break;
    case 'perKg':
      rule = { kind: 'perKg', id, label, centsPerKg: num('centsPerKg'), minimum: optNum('minimum'), zones: optZones() };
      break;
    case 'percentOfValue':
      rule = { kind: 'percentOfValue', id, label, basisPoints: num('basisPoints'), cap: optNum('cap') };
      break;
    case 'flagSurcharge': {
      const flag = raw.flag;
      if (!isFlag(flag)) errors.push(at + ': flag must be a known flag');
      rule = { kind: 'flagSurcharge', id, label, flag: isFlag(flag) ? flag : 'fragile', amount: num('amount') };
      break;
    }
    default:
      errors.push(at + ': unknown kind ' + JSON.stringify(raw.kind));
      return null;
  }
  // Optional fields the JSON left out stay absent, not undefined-valued.
  for (const key of Object.keys(rule) as (keyof Rule)[]) {
    if (rule[key] === undefined) delete rule[key];
  }
  return errors.length === before ? rule : null;
}

function cardFromJson(raw: unknown): LoadResult {
  const errors: string[] = [];
  if (!isRaw(raw)) return { ok: false, errors: ['card: not an object'] };
  const currency = raw.currency;
  if (typeof currency !== 'string' || !(CURRENCIES as readonly string[]).includes(currency)) {
    errors.push('card: unknown currency');
  }
  for (const key of ['id', 'carrier'] as const) {
    if (typeof raw[key] !== 'string') errors.push('card: ' + key + ' must be a string');
  }
  for (const key of ['version', 'discountBasisPoints'] as const) {
    if (typeof raw[key] !== 'number') errors.push('card: ' + key + ' must be a number');
  }
  const rawRules = Array.isArray(raw.rules) ? raw.rules : [];
  if (!Array.isArray(raw.rules)) errors.push('card: rules must be a list');
  const rules: Rule[] = [];
  rawRules.forEach((one: unknown, index: number) => {
    const rule = readRule(one, 'rules[' + index + ']', errors);
    if (rule) rules.push(rule);
  });
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    card: {
      id: raw.id as string,
      carrier: raw.carrier as string,
      currency: currency as Currency,
      version: raw.version as number,
      discountBasisPoints: raw.discountBasisPoints as number,
      rules,
    },
  };
}

/* ── fixtures the pricing team tests against ───────────────────────────── */

const SAMPLE_CARD: RateCard = {
  id: 'HGF-2026-Q4',
  carrier: 'Harrowgate Freight',
  currency: 'EUR',
  version: 7,
  discountBasisPoints: 1000,
  rules: [
    { kind: 'flat', id: 'pickup', label: 'Pickup', amount: 450 },
    { kind: 'perKg', id: 'linehaul', label: 'Linehaul', centsPerKg: 85, minimum: 900, zones: ['regional', 'national'] },
    { kind: 'percentOfValue', id: 'cover', label: 'Cover', basisPoints: 150, cap: 2500 },
    { kind: 'flagSurcharge', id: 'fragile', label: 'Fragile handling', flag: 'fragile', amount: 300 },
  ],
};

const SAMPLE_SHIPMENT: Shipment = {
  id: 'SHP-1042',
  zone: 'regional',
  weightGrams: 12400,
  declaredValueCents: 48000,
  flags: ['fragile'],
};

// Pricing team's smoke check. Prints the breakdown for the sample shipment.
// console.log(explainQuote(quote(SAMPLE_SHIPMENT, SAMPLE_CARD)).join(' | '));
`;
