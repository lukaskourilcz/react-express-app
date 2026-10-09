/** The locale-sensitive built-in methods, the same in Run and Submit (owner
 * decision, 9 October 2026).
 *
 * The browser backs `toLocaleString` and `localeCompare` with `Intl`; QuickJS
 * has no `Intl`, so on Submit `(1234.5).toLocaleString()` read "1234.5" while
 * Run printed "1,234.5", and names sorted with `localeCompare` came back in a
 * different order. Both runners now replace these methods with the ones
 * below, which print and compare the way an en-US browser does for the inputs
 * learners use:
 *
 *  - `Number.prototype.toLocaleString` and `BigInt.prototype.toLocaleString`:
 *    grouping, fraction and significant digits, percent, currency (symbol,
 *    narrow symbol, code and name), compact notation and sign display.
 *  - `String.prototype.localeCompare`: the root collation order for Latin
 *    text (punctuation, then digits, then letters; accents, then case, decide
 *    ties, lowercase first), with the `sensitivity`, `numeric`,
 *    `ignorePunctuation` and `caseFirst` options.
 *  - `String.prototype.toLocaleUpperCase` and `toLocaleLowerCase`, and
 *    `Array.prototype.toLocaleString` and the typed arrays', which pass the
 *    locale and options on to each element.
 *
 * The locale argument is not read: en-US is the only locale, as in an engine
 * built without other locale data. An option outside this list throws a
 * RangeError that says so, in both runners. Dates are formatted by
 * shared/coding-prague-time.ts. Plain ES2019 source text, evaluated by
 * QuickJS (lib/coding/sandbox.ts) and compiled in the Run worker
 * (shared/coding-run-realm.ts). */

export const LOCALE_SOURCE = String.raw`(global) => {
  'use strict';
  const apply = Reflect.apply, defineProperty = Object.defineProperty;
  const NativeString = String, NativeObject = Object, NativeRangeError = RangeError, NativeTypeError = TypeError;
  const numberValue = global.Number.prototype.valueOf;
  const bigintValue = global.BigInt && global.BigInt.prototype.valueOf;
  const toUpper = NativeString.prototype.toUpperCase, toLower = NativeString.prototype.toLowerCase;
  const normalize = NativeString.prototype.normalize;
  const isFiniteNumber = Number.isFinite;

  const pick = (from, name, allowed, fallback) => {
    const value = from[name];
    if (value === undefined) return fallback;
    const text = NativeString(value);
    if (allowed.indexOf(text) < 0) throw new NativeRangeError('Value ' + text + ' out of range for Intl.NumberFormat options property ' + name);
    return text;
  };
  const digitsOption = (from, name, low, high, fallback) => {
    const value = from[name];
    if (value === undefined) return fallback;
    const number = +value;
    if (!(number >= low && number <= high)) throw new NativeRangeError(name + ' value is out of range.');
    return Math.floor(number);
  };
  const unsupported = (name, value) => new NativeRangeError('The checker formats numbers without ' + name + ': \'' + value + '\'. Run and Submit both refuse it.');

  // A non-negative decimal: its digits with no leading zero, and where the
  // point goes (the number of integer digits; negative when the digits start
  // after zeros past the point). JavaScript's shortest round-trip text is
  // what Intl rounds from, so 1.005 rounds to 1.01.
  const decimal = (text) => {
    let mantissa = text, exponent = 0;
    const e = text.indexOf('e');
    if (e >= 0) { mantissa = text.slice(0, e); exponent = +text.slice(e + 1); }
    const dot = mantissa.indexOf('.');
    let digits = dot >= 0 ? mantissa.slice(0, dot) + mantissa.slice(dot + 1) : mantissa;
    let point = (dot >= 0 ? dot : mantissa.length) + exponent;
    let lead = 0;
    while (lead < digits.length - 1 && digits[lead] === '0') { lead++; point--; }
    digits = digits.slice(lead).replace(/0+$/, '');
    return digits === '' ? { digits: '0', point: 1 } : { digits: digits, point: point };
  };
  // Keeps the first so many digits, rounding half away from zero.
  const round = (value, keep) => {
    if (value.digits === '0' || keep >= value.digits.length) return value;
    if (keep < 0) return { digits: '0', point: 1 };
    const up = value.digits.charCodeAt(keep) >= 53;
    const kept = value.digits.slice(0, keep).split('');
    let point = value.point;
    if (up) {
      let i = kept.length - 1;
      while (i >= 0 && kept[i] === '9') { kept[i] = '0'; i--; }
      if (i < 0) { kept.unshift('1'); point++; } else kept[i] = NativeString(+kept[i] + 1);
    }
    const digits = kept.join('').replace(/0+$/, '');
    return digits === '' ? { digits: '0', point: 1 } : { digits: digits, point: point };
  };
  const group = (whole, mode) => {
    if (mode === 'none' || (mode === 'min2' && whole.length < 5)) return whole;
    let out = '';
    for (let i = 0; i < whole.length; i++) {
      if (i > 0 && (whole.length - i) % 3 === 0) out += ',';
      out += whole[i];
    }
    return out;
  };
  const render = (value, minFraction, minInteger, grouping) => {
    const digits = value.digits, point = value.point;
    let whole, fraction;
    if (digits === '0') { whole = '0'; fraction = ''; }
    else if (point <= 0) { whole = '0'; fraction = '0'.repeat(-point) + digits; }
    else if (point >= digits.length) { whole = digits + '0'.repeat(point - digits.length); fraction = ''; }
    else { whole = digits.slice(0, point); fraction = digits.slice(point); }
    while (fraction.length < minFraction) fraction += '0';
    while (whole.length < minInteger) whole = '0' + whole;
    whole = group(whole, grouping);
    return fraction ? whole + '.' + fraction : whole;
  };

  const SYMBOLS = { USD: '$', EUR: '\u20ac', GBP: '\u00a3', JPY: '\u00a5', INR: '\u20b9', CNY: 'CN\u00a5', KRW: '\u20a9', ILS: '\u20aa', BRL: 'R$', CAD: 'CA$', AUD: 'A$', MXN: 'MX$', NZD: 'NZ$', HKD: 'HK$', TWD: 'NT$', VND: '\u20ab', PHP: '\u20b1', XAF: 'FCFA' };
  const NARROW = { CAD: '$', AUD: '$', MXN: '$', NZD: '$', HKD: '$', TWD: '$', CNY: '\u00a5', CZK: 'K\u010d', PLN: 'z\u0142', SEK: 'kr', NOK: 'kr', DKK: 'kr', RUB: '\u20bd', TRY: '\u20ba', UAH: '\u20b4', CHF: 'CHF', HUF: 'Ft' };
  const NAMES = { USD: ['US dollar', 'US dollars'], EUR: ['euro', 'euros'], GBP: ['British pound', 'British pounds'], JPY: ['Japanese yen', 'Japanese yen'], CZK: ['Czech koruna', 'Czech korunas'], CHF: ['Swiss franc', 'Swiss francs'], CAD: ['Canadian dollar', 'Canadian dollars'], AUD: ['Australian dollar', 'Australian dollars'], INR: ['Indian rupee', 'Indian rupees'], PLN: ['Polish zloty', 'Polish zlotys'] };
  const ZERO_DIGITS = ['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'UGX', 'PYG', 'XAF', 'XOF', 'XPF', 'KMF', 'RWF', 'VUV', 'BIF', 'DJF', 'GNF'];
  const THREE_DIGITS = ['BHD', 'KWD', 'OMR', 'JOD', 'TND', 'IQD', 'LYD'];
  const COMPACT = [['', ''], ['K', ' thousand'], ['M', ' million'], ['B', ' billion'], ['T', ' trillion']];

  // Formats a finite magnitude given as text (a number's or a bigint's), with
  // its sign, the way Intl.NumberFormat('en-US', options) does.
  const formatNumber = (negative, magnitude, given, special) => {
    if (given === null) throw new NativeTypeError('Cannot convert undefined or null to object');
    const o = given === undefined ? {} : NativeObject(given);
    const style = pick(o, 'style', ['decimal', 'percent', 'currency', 'unit'], 'decimal');
    if (style === 'unit') throw unsupported('style', 'unit');
    let currency = o.currency;
    if (currency !== undefined) {
      currency = NativeString(currency);
      if (!/^[A-Za-z]{3}$/.test(currency)) throw new NativeRangeError('Invalid currency code : ' + currency);
      currency = apply(toUpper, currency, []);
    }
    if (style === 'currency' && currency === undefined) throw new NativeTypeError('Currency code is required with currency style.');
    const display = pick(o, 'currencyDisplay', ['symbol', 'narrowSymbol', 'code', 'name'], 'symbol');
    const notation = pick(o, 'notation', ['standard', 'scientific', 'engineering', 'compact'], 'standard');
    if (notation === 'scientific' || notation === 'engineering') throw unsupported('notation', notation);
    const compactDisplay = pick(o, 'compactDisplay', ['short', 'long'], 'short');
    const signDisplay = pick(o, 'signDisplay', ['auto', 'never', 'always', 'exceptZero', 'negative'], 'auto');
    const groupingValue = o.useGrouping;
    const grouping = groupingValue === undefined ? (notation === 'compact' ? 'min2' : 'always')
      : groupingValue === 'min2' ? 'min2' : !groupingValue ? 'none' : 'always';
    const minInteger = digitsOption(o, 'minimumIntegerDigits', 1, 21, 1);
    const currencyDigits = style !== 'currency' ? 0 : ZERO_DIGITS.indexOf(currency) >= 0 ? 0 : THREE_DIGITS.indexOf(currency) >= 0 ? 3 : 2;
    const defaultMin = style === 'currency' && notation !== 'compact' ? currencyDigits : 0;
    const defaultMax = style === 'currency' && notation !== 'compact' ? currencyDigits : style === 'percent' ? 0 : notation === 'compact' ? 0 : 3;
    const minSignificant = o.minimumSignificantDigits, maxSignificant = o.maximumSignificantDigits;
    const significant = minSignificant !== undefined || maxSignificant !== undefined;
    const minS = digitsOption(o, 'minimumSignificantDigits', 1, 21, 1);
    const maxS = digitsOption(o, 'maximumSignificantDigits', minS, 21, 21);
    const fractionGiven = o.minimumFractionDigits !== undefined || o.maximumFractionDigits !== undefined;
    let minF = digitsOption(o, 'minimumFractionDigits', 0, 100, undefined);
    let maxF = digitsOption(o, 'maximumFractionDigits', 0, 100, undefined);
    if (minF === undefined) minF = maxF === undefined ? defaultMin : Math.min(defaultMin, maxF);
    if (maxF === undefined) maxF = Math.max(defaultMax, minF);
    else if (minF > maxF) throw new NativeRangeError('maximumFractionDigits value is out of range.');

    let value = decimal(special ? '0' : magnitude);
    if (style === 'percent' && value.digits !== '0') value = { digits: value.digits, point: value.point + 2 };
    let suffix = '';
    if (notation === 'compact') {
      let scale = value.digits === '0' ? 0 : Math.min(4, Math.max(0, Math.floor((value.point - 1) / 3)));
      const shrink = (v, s) => ({ digits: v.digits, point: v.point - 3 * s });
      let scaled = shrink(value, scale);
      const roundCompact = (v) => (significant ? round(v, maxS) : fractionGiven ? round(v, v.point + maxF) : round(v, v.point >= 2 ? v.point : 2));
      scaled = roundCompact(scaled);
      if (scaled.digits !== '0' && scaled.point > 3 && scale < 4) { scale++; scaled = roundCompact(shrink(value, scale)); }
      value = scaled;
      suffix = compactDisplay === 'long' ? COMPACT[scale][1] : COMPACT[scale][0];
    } else value = significant ? round(value, maxS) : round(value, value.point + maxF);
    // With significant digits, at least minS of them show; zero shows minS - 1 decimals.
    const fractionShown = !significant ? (notation === 'compact' && !fractionGiven ? 0 : minF)
      : value.digits === '0' ? minS - 1 : Math.max(0, Math.max(value.digits.length, minS) - value.point);
    const text = special || render(value, fractionShown, minInteger, grouping) + suffix;

    const zero = !special && value.digits === '0';
    let sign = '';
    if (signDisplay === 'auto') sign = negative ? '-' : '';
    else if (signDisplay === 'always') sign = negative ? '-' : '+';
    else if (signDisplay === 'exceptZero') sign = zero || special === 'NaN' ? '' : negative ? '-' : '+';
    else if (signDisplay === 'negative') sign = negative && !zero ? '-' : '';
    if (style === 'percent') return sign + text + '%';
    if (style !== 'currency') return sign + text;
    if (display === 'name') {
      const names = NAMES[currency];
      return sign + text + ' ' + (names ? names[text === '1' ? 0 : 1] : currency);
    }
    const symbol = display === 'code' ? currency : display === 'narrowSymbol' ? (NARROW[currency] || SYMBOLS[currency] || currency) : (SYMBOLS[currency] || currency);
    return sign + symbol + (/[A-Za-z\u00c0-\u024f]$/.test(symbol) && /^\d/.test(text) ? '\u00a0' : '') + text;
  };

  const numberToLocaleString = function toLocaleString(locales, given) {
    const x = apply(numberValue, this, []);
    const negative = x < 0 || (x === 0 && 1 / x < 0);
    if (x !== x) return formatNumber(false, '0', given, 'NaN');
    if (!isFiniteNumber(x)) return formatNumber(negative, '0', given, '\u221e');
    return formatNumber(negative, NativeString(negative ? -x : x), given);
  };
  const bigintToLocaleString = function toLocaleString(locales, given) {
    const x = apply(bigintValue, this, []);
    const text = NativeString(x);
    const negative = text[0] === '-';
    return formatNumber(negative, negative ? text.slice(1) : text, given);
  };

  // Collation.
  // Whitespace and punctuation in the order the root collation gives them.
  const PUNCTUATION = '\t\n\u000b\f\r \u00a0_-\u2013\u2014,;:!\u00a1?\u00bf.\u2026\u00b7\'\u2018\u2019"\u201c\u201d\u00ab\u00bb()[]{}\u00a7@*/\\&#%\u0060^\u00b0+\u00f7\u00d7<=>|~$\u00a3\u20ac';
  const SPECIAL = { '\u00e6': ['ae', ''], '\u0153': ['oe', ''], '\u00df': ['ss', ''], '\u0133': ['ij', ''], '\u00f8': ['o', '\u0338'], '\u0111': ['d', '\u0335'], '\u0142': ['l', '\u0337'], '\u0127': ['h', '\u0335'], '\u0131': ['i', '\u0307'] };
  const MARK = /\p{M}/u, LETTER = /\p{L}/u, IGNORABLE = /[\p{P}\p{Z}\p{Cc}]/u;
  // Accents in the order the root collation ranks them; others after, by code.
  const ACCENTS = '\u0301\u0300\u0306\u0302\u030c\u030a\u0308\u030b\u0303\u0307\u0338\u0335\u0337\u0328\u0327\u0304';
  const accentOrder = (a, b) => {
    for (let i = 0; i < a.length && i < b.length; i++) {
      if (a[i] === b[i]) continue;
      const x = ACCENTS.indexOf(a[i]), y = ACCENTS.indexOf(b[i]);
      const left = x >= 0 ? x : 100 + a.charCodeAt(i), right = y >= 0 ? y : 100 + b.charCodeAt(i);
      return left < right ? -1 : 1;
    }
    return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
  };
  // One collation element per character: a primary weight (what letter, digit
  // or sign it is), its accents and its case.
  const elements = (text, numeric, ignorePunctuation) => {
    const out = [];
    const source = apply(normalize, text, ['NFD']);
    for (let i = 0; i < source.length;) {
      const code = source.codePointAt(i);
      const char = NativeString.fromCodePoint(code);
      i += char.length;
      if (MARK.test(char)) { if (out.length) out[out.length - 1].accents += char; continue; }
      if (code >= 48 && code <= 57) {
        if (numeric) {
          let run = char;
          while (i < source.length && source.charCodeAt(i) >= 48 && source.charCodeAt(i) <= 57) run += source[i++];
          out.push({ primary: 3e7, number: run.replace(/^0+(?=\d)/, ''), accents: '', case: 0 });
        } else out.push({ primary: 3e7 + code - 48, accents: '', case: 0 });
        continue;
      }
      if (LETTER.test(char)) {
        const lower = apply(toLower, char, []);
        const upper = lower !== char ? 2 : 0;
        const special = SPECIAL[lower];
        if (special) {
          // An expansion (æ as ae) differs from the letters it expands to as an accent would.
          for (let k = 0; k < special[0].length; k++) out.push({ primary: 4e7 + special[0].charCodeAt(k), accents: k === 0 ? special[1] || '\u0000' : '', case: upper });
          continue;
        }
        out.push({ primary: (lower >= 'a' && lower <= 'z' ? 4e7 : 5e7) + lower.codePointAt(0), accents: '', case: upper });
        continue;
      }
      if (ignorePunctuation && IGNORABLE.test(char)) continue;
      const index = PUNCTUATION.indexOf(char);
      out.push({ primary: index >= 0 ? 1e7 + index : 2e7 + code, accents: '', case: 0 });
    }
    return out;
  };
  const comparePrimary = (a, b) => {
    if (a.number !== undefined && b.number !== undefined) {
      if (a.number.length !== b.number.length) return a.number.length < b.number.length ? -1 : 1;
      return a.number < b.number ? -1 : a.number > b.number ? 1 : 0;
    }
    return a.primary < b.primary ? -1 : a.primary > b.primary ? 1 : 0;
  };
  const SENSITIVITY = ['base', 'accent', 'case', 'variant'];
  const localeCompare = function localeCompare(that, locales, given) {
    if (this === null || this === undefined) throw new NativeTypeError('String.prototype.localeCompare called on null or undefined');
    const o = given === undefined ? {} : NativeObject(given);
    const usage = o.usage === undefined ? 'sort' : NativeString(o.usage);
    if (usage !== 'sort' && usage !== 'search') throw new NativeRangeError('Value ' + usage + ' out of range for Intl.Collator options property usage');
    const sensitivity = o.sensitivity === undefined ? 'variant' : NativeString(o.sensitivity);
    if (SENSITIVITY.indexOf(sensitivity) < 0) throw new NativeRangeError('Value ' + sensitivity + ' out of range for Intl.Collator options property sensitivity');
    const caseFirst = o.caseFirst === undefined ? 'false' : NativeString(o.caseFirst);
    const a = elements(NativeString(this), !!o.numeric, !!o.ignorePunctuation);
    const b = elements(NativeString(that), !!o.numeric, !!o.ignorePunctuation);
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
      const order = comparePrimary(a[i], b[i]);
      if (order) return order;
    }
    if (a.length !== b.length) return a.length < b.length ? -1 : 1;
    if (sensitivity === 'variant' || sensitivity === 'accent') {
      for (let i = 0; i < length; i++) {
        const order = accentOrder(a[i].accents, b[i].accents);
        if (order) return order;
      }
    }
    if (sensitivity === 'variant' || sensitivity === 'case') {
      for (let i = 0; i < length; i++) {
        if (a[i].case === b[i].case) continue;
        const order = a[i].case < b[i].case ? -1 : 1;
        return caseFirst === 'upper' && (a[i].case >> 1) !== (b[i].case >> 1) ? -order : order;
      }
    }
    return 0;
  };

  const coerce = (value, name) => {
    if (value === null || value === undefined) throw new NativeTypeError('String.prototype.' + name + ' called on null or undefined');
    return NativeString(value);
  };
  const toLocaleUpperCase = function toLocaleUpperCase() { return apply(toUpper, coerce(this, 'toLocaleUpperCase'), []); };
  const toLocaleLowerCase = function toLocaleLowerCase() { return apply(toLower, coerce(this, 'toLocaleLowerCase'), []); };
  // Array.prototype.toLocaleString as the internationalization API defines
  // it: each element's own toLocaleString, given the same locale and options.
  const listToLocaleString = function toLocaleString(locales, given) {
    const list = NativeObject(this);
    const length = Math.min(Math.max(Math.floor(+list.length) || 0, 0), Number.MAX_SAFE_INTEGER);
    let out = '';
    for (let i = 0; i < length; i++) {
      if (i > 0) out += ',';
      const item = list[i];
      if (item !== null && item !== undefined) out += NativeString(item.toLocaleString(locales, given));
    }
    return out;
  };

  const define = (target, name, method, length) => {
    if (!target) return;
    defineProperty(method, 'length', { value: length, configurable: true });
    defineProperty(target, name, { value: method, writable: true, enumerable: false, configurable: true });
  };
  define(global.Number.prototype, 'toLocaleString', numberToLocaleString, 0);
  if (bigintValue) define(global.BigInt.prototype, 'toLocaleString', bigintToLocaleString, 0);
  define(global.String.prototype, 'localeCompare', localeCompare, 1);
  define(global.String.prototype, 'toLocaleUpperCase', toLocaleUpperCase, 0);
  define(global.String.prototype, 'toLocaleLowerCase', toLocaleLowerCase, 0);
  define(global.Array.prototype, 'toLocaleString', listToLocaleString, 0);
  define(Object.getPrototypeOf(global.Uint8Array.prototype), 'toLocaleString', listToLocaleString, 0);
}`;
