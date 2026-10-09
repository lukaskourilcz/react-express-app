/** The web APIs the grader adds to QuickJS (owner decision, 9 October 2026):
 * `URL`, `URLSearchParams`, `TextEncoder`, `TextDecoder`, `atob` and `btoa`.
 *
 * Learners reach for these in ordinary exercises (`new URLSearchParams(query)`
 * to read a query string), the browser's Run has them, and QuickJS does not,
 * so such code passed on Run and failed on Submit with "'URLSearchParams' is
 * not defined". They behave as the browser's do for the inputs learners use.
 *
 * `URLSearchParams`, the encoders and base64 are plain JavaScript, below, as
 * the WHATWG URL and Encoding standards and the HTML standard's forgiving
 * base64 define them. Parsing a URL is the one part done on the host: the
 * VM's `URL` asks `hostURL` (Node's WHATWG parser) to read or change a URL.
 * That function takes strings only, at most MAX_URL_TEXT characters each, and
 * answers with one string of JSON, or null for a URL that does not parse, so
 * no host object ever reaches the VM. The program hands it to the source
 * below and removes it from the global object before learner code runs.
 *
 * The source is evaluated in QuickJS only, so it may use classes and
 * WeakMaps; Run uses the browser's own APIs. */

/** Longest string the host URL parser is given. A longer one makes `URL`
 * throw a TypeError that says so. */
export const MAX_URL_TEXT = 65_536;

const URL_PARTS = ['href', 'origin', 'protocol', 'username', 'password', 'host', 'hostname', 'port', 'pathname', 'search', 'hash'] as const;
const URL_SETTERS: ReadonlySet<string> = new Set(['protocol', 'username', 'password', 'host', 'hostname', 'port', 'pathname', 'search', 'hash']);

const urlParts = (url: URL): string => JSON.stringify(Object.fromEntries(URL_PARTS.map((name) => [name, url[name]])));

/**
 * The host side of the VM's `URL`. `parse` reads `first` against the base
 * `second`; `set` gives the URL `first` the part `second` set to `third`.
 * Answers the URL's parts as JSON, or null when it does not parse.
 */
export function hostURL(operation: unknown, first: unknown, second: unknown, third: unknown): string | null {
  const text = (value: unknown) => typeof value === 'string' && value.length <= MAX_URL_TEXT;
  try {
    if (operation === 'parse' && text(first) && (second === undefined || text(second))) {
      return urlParts(second === undefined ? new URL(first as string) : new URL(first as string, second as string));
    }
    if (operation === 'set' && text(first) && typeof second === 'string' && URL_SETTERS.has(second) && text(third)) {
      const url = new URL(first as string);
      (url as unknown as Record<string, string>)[second] = third as string;
      return urlParts(url);
    }
  } catch {
    // An input that does not parse.
  }
  return null;
}

export const WEB_APIS_SOURCE = String.raw`(global, hostURL) => {
  'use strict';
  const apply = Reflect.apply, defineProperty = Object.defineProperty, getPrototypeOf = Object.getPrototypeOf;
  const NativeString = String, NativeTypeError = TypeError, NativeRangeError = RangeError, NativeError = Error;
  const NativeUint8Array = Uint8Array, NativeArrayBuffer = ArrayBuffer, NativeWeakMap = WeakMap, NativeSymbol = Symbol;
  const parseJSON = JSON.parse, fromCharCode = String.fromCharCode, isView = ArrayBuffer.isView;
  const toWellFormed = String.prototype.toWellFormed;
  const bufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
  const sharedBufferLength = global.SharedArrayBuffer ? Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, 'byteLength').get : null;
  const iteratorPrototype = getPrototypeOf(getPrototypeOf([][Symbol.iterator]()));
  const weakGet = WeakMap.prototype.get, weakSet = WeakMap.prototype.set;
  const MAX_URL_TEXT = ${MAX_URL_TEXT};

  // A string the way Web IDL's USVString is: lone surrogates become U+FFFD.
  const usv = (value) => apply(toWellFormed, NativeString(value), []);
  const required = (count, given, interfaceName, method) => {
    if (given < count) throw new NativeTypeError('Failed to ' + (method ? 'execute \'' + method + '\' on' : 'construct') + ' \'' + interfaceName + '\': ' + count + ' argument' + (count > 1 ? 's' : '') + ' required, but only ' + given + ' present.');
  };
  // Web IDL places operations and attributes on the prototype, enumerable.
  const expose = (target, members) => {
    for (const name of Reflect.ownKeys(members)) {
      const descriptor = Object.getOwnPropertyDescriptor(members, name);
      descriptor.enumerable = true;
      defineProperty(target, name, descriptor);
    }
  };
  const tag = (target, name) => defineProperty(target, NativeSymbol.toStringTag, { value: name, configurable: true });
  const state = () => {
    const map = new NativeWeakMap();
    return {
      get: (self) => {
        const found = apply(weakGet, map, [self]);
        if (found === undefined) throw new NativeTypeError('Illegal invocation');
        return found;
      },
      set: (self, value) => { apply(weakSet, map, [self, value]); },
    };
  };
  // Code units to a string, a block at a time, so a long text costs no deep recursion.
  const stringOf = (units) => {
    let out = '';
    for (let i = 0; i < units.length; i += 8192) out += apply(fromCharCode, null, units.slice(i, i + 8192));
    return out;
  };

  // UTF-8, as the Encoding standard defines it.
  const utf8Length = (text) => {
    let bytes = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c < 0x80) bytes += 1;
      else if (c < 0x800) bytes += 2;
      else if (c >= 0xd800 && c <= 0xdbff) { bytes += 4; i++; }
      else bytes += 3;
    }
    return bytes;
  };
  // Writes well-formed text into bytes from offset 0; returns the count written.
  const utf8Write = (text, bytes) => {
    let at = 0;
    for (let i = 0; i < text.length; i++) {
      let c = text.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff) { c = 0x10000 + ((c - 0xd800) << 10) + (text.charCodeAt(i + 1) - 0xdc00); i++; }
      if (c < 0x80) bytes[at++] = c;
      else if (c < 0x800) { bytes[at++] = 0xc0 | (c >> 6); bytes[at++] = 0x80 | (c & 63); }
      else if (c < 0x10000) { bytes[at++] = 0xe0 | (c >> 12); bytes[at++] = 0x80 | ((c >> 6) & 63); bytes[at++] = 0x80 | (c & 63); }
      else { bytes[at++] = 0xf0 | (c >> 18); bytes[at++] = 0x80 | ((c >> 12) & 63); bytes[at++] = 0x80 | ((c >> 6) & 63); bytes[at++] = 0x80 | (c & 63); }
    }
    return at;
  };
  const utf8Encode = (text) => {
    const bytes = new NativeUint8Array(utf8Length(text));
    utf8Write(text, bytes);
    return bytes;
  };
  // Decodes bytes[from, to). Returns [text, the index where an unfinished
  // sequence starts (to when there is none)]. An invalid sequence becomes
  // U+FFFD, or throws when fatal; an unfinished one at the end does the same
  // unless the caller keeps it for the next chunk.
  const utf8Decode = (bytes, from, to, fatal, keepTail) => {
    const units = [];
    let needed = 0, seen = 0, point = 0, lower = 0x80, upper = 0xbf, start = from;
    const bad = () => {
      if (fatal) throw new NativeTypeError('The encoded data was not valid for encoding utf-8');
      units.push(0xfffd);
    };
    for (let i = from; i < to; i++) {
      const byte = bytes[i];
      if (needed === 0) {
        start = i;
        if (byte <= 0x7f) units.push(byte);
        else if (byte >= 0xc2 && byte <= 0xdf) { needed = 1; point = byte & 0x1f; }
        else if (byte >= 0xe0 && byte <= 0xef) { if (byte === 0xe0) lower = 0xa0; if (byte === 0xed) upper = 0x9f; needed = 2; point = byte & 0xf; }
        else if (byte >= 0xf0 && byte <= 0xf4) { if (byte === 0xf0) lower = 0x90; if (byte === 0xf4) upper = 0x8f; needed = 3; point = byte & 0x7; }
        else bad();
        continue;
      }
      if (byte < lower || byte > upper) {
        needed = seen = point = 0; lower = 0x80; upper = 0xbf;
        bad();
        i--;
        continue;
      }
      lower = 0x80; upper = 0xbf;
      point = (point << 6) | (byte & 0x3f);
      if (++seen === needed) {
        if (point > 0xffff) { point -= 0x10000; units.push(0xd800 + (point >> 10), 0xdc00 + (point & 0x3ff)); }
        else units.push(point);
        needed = seen = point = 0;
      }
    }
    if (needed !== 0) {
      if (keepTail) return [stringOf(units), start];
      bad();
    }
    return [stringOf(units), to];
  };
  const bytesOf = (input, interfaceName, method) => {
    if (input === undefined) return new NativeUint8Array(0);
    if (isView(input)) return new NativeUint8Array(input.buffer, input.byteOffset, input.byteLength);
    try { apply(bufferLength, input, []); return new NativeUint8Array(input); } catch (error) { /* not an ArrayBuffer */ }
    if (sharedBufferLength) {
      try { apply(sharedBufferLength, input, []); return new NativeUint8Array(input); } catch (error) { /* not a SharedArrayBuffer */ }
    }
    throw new NativeTypeError('Failed to execute \'' + method + '\' on \'' + interfaceName + '\': The provided value is not of type \'(ArrayBuffer or ArrayBufferView)\'.');
  };

  // TextEncoder and TextDecoder (UTF-8 only, the encoding the web uses).
  class TextEncoder {
    encode(input = '') { return utf8Encode(usv(input)); }
    encodeInto(source, destination) {
      required(2, arguments.length, 'TextEncoder', 'encodeInto');
      if (!(destination instanceof NativeUint8Array)) throw new NativeTypeError('Failed to execute \'encodeInto\' on \'TextEncoder\': parameter 2 is not of type \'Uint8Array\'.');
      const text = usv(source);
      let read = 0, written = 0;
      for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        const pair = c >= 0xd800 && c <= 0xdbff;
        const size = c < 0x80 ? 1 : c < 0x800 ? 2 : pair ? 4 : 3;
        if (written + size > destination.length) break;
        const one = new NativeUint8Array(size);
        utf8Write(pair ? text.slice(i, i + 2) : text[i], one);
        destination.set(one, written);
        written += size;
        read += pair ? 2 : 1;
        if (pair) i++;
      }
      return { read: read, written: written };
    }
  }
  expose(TextEncoder.prototype, {
    get encoding() { return 'utf-8'; },
    encode: TextEncoder.prototype.encode,
    encodeInto: TextEncoder.prototype.encodeInto,
  });
  tag(TextEncoder.prototype, 'TextEncoder');

  const UTF8_LABELS = ['unicode-1-1-utf-8', 'unicode11utf8', 'unicode20utf8', 'utf-8', 'utf8', 'x-unicode20utf8'];
  const decoders = state();
  class TextDecoder {
    constructor(label = 'utf-8', options = undefined) {
      const name = NativeString(label).replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').toLowerCase();
      if (UTF8_LABELS.indexOf(name) < 0) throw new NativeRangeError('Failed to construct \'TextDecoder\': The encoding label provided (\'' + NativeString(label) + '\') is not available in the checker, which decodes utf-8 only.');
      const settings = options === undefined || options === null ? {} : options;
      decoders.set(this, { fatal: !!settings.fatal, ignoreBOM: !!settings.ignoreBOM, pending: null, started: false });
    }
    decode(input = undefined, options = undefined) {
      const self = decoders.get(this);
      let bytes = bytesOf(input, 'TextDecoder', 'decode');
      const stream = !!(options !== undefined && options !== null && options.stream);
      if (self.pending) {
        const joined = new NativeUint8Array(self.pending.length + bytes.length);
        joined.set(self.pending);
        joined.set(bytes, self.pending.length);
        bytes = joined;
        self.pending = null;
      }
      let from = 0;
      if (!self.started && !self.ignoreBOM) {
        if (bytes.length < 3 && stream && bytes.length > 0 && bytes[0] === 0xef && (bytes.length < 2 || bytes[1] === 0xbb)) {
          self.pending = bytes.slice(0);
          return '';
        }
        if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) from = 3;
      }
      if (bytes.length > 0) self.started = true;
      let result;
      try {
        result = utf8Decode(bytes, from, bytes.length, self.fatal, stream);
      } catch (error) {
        self.started = false;
        throw new NativeTypeError('Failed to execute \'decode\' on \'TextDecoder\': ' + error.message);
      }
      if (result[1] < bytes.length) self.pending = bytes.slice(result[1]);
      if (!stream) self.started = false;
      return result[0];
    }
  }
  expose(TextDecoder.prototype, {
    get encoding() { decoders.get(this); return 'utf-8'; },
    get fatal() { return decoders.get(this).fatal; },
    get ignoreBOM() { return decoders.get(this).ignoreBOM; },
    decode: TextDecoder.prototype.decode,
  });
  tag(TextDecoder.prototype, 'TextDecoder');

  // atob and btoa: the HTML standard's forgiving base64.
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const invalidCharacter = (message) => {
    const error = new NativeError(message);
    defineProperty(error, 'name', { value: 'InvalidCharacterError', writable: true, configurable: true });
    return error;
  };
  const btoa = function btoa(data) {
    required(1, arguments.length, 'Window', 'btoa');
    const text = NativeString(data);
    const out = [];
    for (let i = 0; i < text.length; i += 3) {
      const a = text.charCodeAt(i), b = text.charCodeAt(i + 1), c = text.charCodeAt(i + 2);
      if (a > 255 || b > 255 || c > 255) throw invalidCharacter('Failed to execute \'btoa\' on \'Window\': The string to be encoded contains characters outside of the Latin1 range.');
      const triple = (a << 16) | ((b || 0) << 8) | (c || 0);
      out.push(ALPHABET[triple >> 18], ALPHABET[(triple >> 12) & 63], i + 1 < text.length ? ALPHABET[(triple >> 6) & 63] : '=', i + 2 < text.length ? ALPHABET[triple & 63] : '=');
    }
    return out.join('');
  };
  const atob = function atob(data) {
    required(1, arguments.length, 'Window', 'atob');
    let text = NativeString(data).replace(/[\t\n\f\r ]/g, '');
    if (text.length % 4 === 0) text = text.replace(/==?$/, '');
    if (text.length % 4 === 1 || /[^A-Za-z0-9+/]/.test(text)) throw invalidCharacter('Failed to execute \'atob\' on \'Window\': The string to be decoded is not correctly encoded.');
    const units = [];
    let buffer = 0, bits = 0;
    for (let i = 0; i < text.length; i++) {
      buffer = ((buffer << 6) | ALPHABET.indexOf(text[i])) & 0xffffff;
      bits += 6;
      if (bits >= 8) { bits -= 8; units.push((buffer >> bits) & 0xff); }
    }
    return stringOf(units);
  };

  // URLSearchParams, as the URL standard defines it.
  const HEX = '0123456789ABCDEF';
  const formEncode = (text) => {
    const bytes = utf8Encode(text);
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 0x20) out += '+';
      else if ((b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a) || b === 0x2a || b === 0x2d || b === 0x2e || b === 0x5f) out += fromCharCode(b);
      else out += '%' + HEX[b >> 4] + HEX[b & 15];
    }
    return out;
  };
  const isHex = (b) => (b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x46) || (b >= 0x61 && b <= 0x66);
  const formDecode = (text) => {
    const plain = text.replace(/\+/g, ' ');
    if (plain.indexOf('%') < 0) return plain;
    const bytes = utf8Encode(plain);
    const out = new NativeUint8Array(bytes.length);
    let at = 0;
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0x25 && i + 2 < bytes.length && isHex(bytes[i + 1]) && isHex(bytes[i + 2])) {
        out[at++] = parseInt(fromCharCode(bytes[i + 1], bytes[i + 2]), 16);
        i += 2;
      } else out[at++] = bytes[i];
    }
    return utf8Decode(out, 0, at, false, false)[0];
  };
  const parseQuery = (text) => {
    const list = [];
    const pieces = text.split('&');
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      if (!piece) continue;
      const eq = piece.indexOf('=');
      list.push(eq >= 0 ? [formDecode(piece.slice(0, eq)), formDecode(piece.slice(eq + 1))] : [formDecode(piece), '']);
    }
    return list;
  };
  const serialize = (list) => {
    let out = '';
    for (let i = 0; i < list.length; i++) out += (i ? '&' : '') + formEncode(list[i][0]) + '=' + formEncode(list[i][1]);
    return out;
  };

  const searchParams = state();
  const urls = state();
  // A URL's search params changed: write them back into the URL.
  const updateURL = (params) => {
    if (!params.url) return;
    const url = urls.get(params.url);
    const changed = changeURL(url.parts.href, 'search', serialize(params.list));
    if (changed) url.parts = changed;
  };
  // An iterator over the live list, as the browser's "URLSearchParams Iterator".
  const ParamsIterator = Object.create(iteratorPrototype);
  const iterators = state();
  defineProperty(ParamsIterator, 'next', {
    value: function next() {
      const at = iterators.get(this);
      const list = searchParams.get(at.params).list;
      if (at.index >= list.length) return { value: undefined, done: true };
      const pair = list[at.index++];
      return { value: at.kind === 'keys' ? pair[0] : at.kind === 'values' ? pair[1] : [pair[0], pair[1]], done: false };
    },
    writable: true, enumerable: true, configurable: true,
  });
  tag(ParamsIterator, 'URLSearchParams Iterator');
  const iterate = (params, kind) => {
    searchParams.get(params);
    const iterator = Object.create(ParamsIterator);
    iterators.set(iterator, { params: params, kind: kind, index: 0 });
    return iterator;
  };

  class URLSearchParams {
    constructor(init = undefined) {
      let list = [];
      if (init !== undefined && init !== null && (typeof init === 'object' || typeof init === 'function')) {
        const method = init[NativeSymbol.iterator];
        if (method !== undefined && method !== null) {
          if (typeof method !== 'function') throw new NativeTypeError('Failed to construct \'URLSearchParams\': The object must have a callable @@iterator property.');
          for (const pair of init) {
            if (pair === null || (typeof pair !== 'object' && typeof pair !== 'function') || typeof pair[NativeSymbol.iterator] !== 'function') {
              throw new NativeTypeError('Failed to construct \'URLSearchParams\': The provided value cannot be converted to a sequence.');
            }
            const items = [];
            for (const item of pair) items.push(item);
            if (items.length !== 2) throw new NativeTypeError('Failed to construct \'URLSearchParams\': Sequence initializer must only contain pair elements');
            list.push([usv(items[0]), usv(items[1])]);
          }
        } else {
          for (const key of Reflect.ownKeys(init)) {
            if (typeof key !== 'string') continue;
            const descriptor = Reflect.getOwnPropertyDescriptor(init, key);
            if (descriptor && descriptor.enumerable) list.push([usv(key), usv(init[key])]);
          }
        }
      } else if (init !== undefined) {
        const text = usv(init);
        list = parseQuery(text[0] === '?' ? text.slice(1) : text);
      }
      searchParams.set(this, { list: list, url: null });
    }
  }
  const paramsMembers = {
    get size() { return searchParams.get(this).list.length; },
    append(name, value) {
      const self = searchParams.get(this);
      required(2, arguments.length, 'URLSearchParams', 'append');
      self.list.push([usv(name), usv(value)]);
      updateURL(self);
    },
    delete(name, value = undefined) {
      const self = searchParams.get(this);
      required(1, arguments.length, 'URLSearchParams', 'delete');
      const key = usv(name), match = value === undefined ? undefined : usv(value);
      self.list = self.list.filter((pair) => pair[0] !== key || (match !== undefined && pair[1] !== match));
      updateURL(self);
    },
    get(name) {
      const self = searchParams.get(this);
      required(1, arguments.length, 'URLSearchParams', 'get');
      const key = usv(name);
      for (let i = 0; i < self.list.length; i++) if (self.list[i][0] === key) return self.list[i][1];
      return null;
    },
    getAll(name) {
      const self = searchParams.get(this);
      required(1, arguments.length, 'URLSearchParams', 'getAll');
      const key = usv(name), out = [];
      for (let i = 0; i < self.list.length; i++) if (self.list[i][0] === key) out.push(self.list[i][1]);
      return out;
    },
    has(name, value = undefined) {
      const self = searchParams.get(this);
      required(1, arguments.length, 'URLSearchParams', 'has');
      const key = usv(name), match = value === undefined ? undefined : usv(value);
      for (let i = 0; i < self.list.length; i++) if (self.list[i][0] === key && (match === undefined || self.list[i][1] === match)) return true;
      return false;
    },
    set(name, value) {
      const self = searchParams.get(this);
      required(2, arguments.length, 'URLSearchParams', 'set');
      const key = usv(name), text = usv(value), kept = [];
      let found = false;
      for (let i = 0; i < self.list.length; i++) {
        if (self.list[i][0] !== key) kept.push(self.list[i]);
        else if (!found) { found = true; kept.push([key, text]); }
      }
      if (!found) kept.push([key, text]);
      self.list = kept;
      updateURL(self);
    },
    sort() {
      const self = searchParams.get(this);
      const units = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
      self.list = self.list.map((pair, index) => [pair, index]).sort((a, b) => units(a[0], b[0]) || a[1] - b[1]).map((entry) => entry[0]);
      updateURL(self);
    },
    toString() { return serialize(searchParams.get(this).list); },
    forEach(callback, thisArg = undefined) {
      const self = searchParams.get(this);
      required(1, arguments.length, 'URLSearchParams', 'forEach');
      if (typeof callback !== 'function') throw new NativeTypeError('Failed to execute \'forEach\' on \'URLSearchParams\': The callback provided as parameter 1 is not a function.');
      for (let i = 0; i < self.list.length; i++) apply(callback, thisArg, [self.list[i][1], self.list[i][0], this]);
    },
    entries() { return iterate(this, 'entries'); },
    keys() { return iterate(this, 'keys'); },
    values() { return iterate(this, 'values'); },
  };
  expose(URLSearchParams.prototype, paramsMembers);
  defineProperty(URLSearchParams.prototype, NativeSymbol.iterator, { value: URLSearchParams.prototype.entries, writable: true, configurable: true });
  tag(URLSearchParams.prototype, 'URLSearchParams');

  // URL, parsed by the host (see the comment above).
  const textForURL = (value, what) => {
    const text = usv(value);
    if (text.length > MAX_URL_TEXT) throw new NativeTypeError(what + ': the URL is longer than the checker reads (' + MAX_URL_TEXT + ' characters).');
    return text;
  };
  const parseURL = (input, base) => {
    const answer = hostURL('parse', input, base);
    return typeof answer === 'string' ? parseJSON(answer) : null;
  };
  const changeURL = (href, part, value) => {
    const answer = hostURL('set', href, part, value);
    return typeof answer === 'string' ? parseJSON(answer) : null;
  };
  const linkParams = (url, self) => {
    const params = new URLSearchParams(self.parts.search);
    searchParams.get(params).url = url;
    self.params = params;
  };
  class URL {
    constructor(url, base = undefined) {
      required(1, arguments.length, 'URL');
      const input = textForURL(url, 'Failed to construct \'URL\'');
      const parts = parseURL(input, base === undefined ? undefined : textForURL(base, 'Failed to construct \'URL\''));
      if (!parts) throw new NativeTypeError('Failed to construct \'URL\': Invalid URL');
      const self = { parts: parts, params: null };
      urls.set(this, self);
      linkParams(this, self);
    }
    static canParse(url, base = undefined) {
      required(1, arguments.length, 'URL', 'canParse');
      const input = usv(url), from = base === undefined ? undefined : usv(base);
      if (input.length > MAX_URL_TEXT || (from !== undefined && from.length > MAX_URL_TEXT)) return false;
      return parseURL(input, from) !== null;
    }
    static parse(url, base = undefined) {
      required(1, arguments.length, 'URL', 'parse');
      try { return base === undefined ? new URL(url) : new URL(url, base); } catch (error) { return null; }
    }
  }
  const part = (name) => ({
    get: function () { return urls.get(this).parts[name]; },
    set: function (value) {
      const self = urls.get(this);
      const text = textForURL(value, 'Failed to set the \'' + name + '\' property on \'URL\'');
      const changed = changeURL(self.parts.href, name, text);
      if (!changed) return;
      self.parts = changed;
      if (name === 'search') searchParams.get(self.params).list = parseQuery(changed.search.slice(1));
    },
  });
  const urlMembers = {
    get href() { return urls.get(this).parts.href; },
    set href(value) {
      const self = urls.get(this);
      const parts = parseURL(textForURL(value, 'Failed to set the \'href\' property on \'URL\''), undefined);
      if (!parts) throw new NativeTypeError('Failed to set the \'href\' property on \'URL\': Invalid URL \'' + usv(value) + '\'');
      self.parts = parts;
      searchParams.get(self.params).list = parseQuery(parts.search.slice(1));
    },
    get origin() { return urls.get(this).parts.origin; },
    get searchParams() { return urls.get(this).params; },
    toString() { return urls.get(this).parts.href; },
    toJSON() { return urls.get(this).parts.href; },
  };
  for (const name of ['protocol', 'username', 'password', 'host', 'hostname', 'port', 'pathname', 'search', 'hash']) {
    const accessors = part(name);
    defineProperty(accessors.get, 'name', { value: 'get ' + name });
    defineProperty(accessors.set, 'name', { value: 'set ' + name });
    defineProperty(urlMembers, name, { get: accessors.get, set: accessors.set, enumerable: true, configurable: true });
  }
  expose(URL.prototype, urlMembers);
  tag(URL.prototype, 'URL');

  const install = (name, value) => defineProperty(global, name, { value: value, writable: true, enumerable: false, configurable: true });
  install('URL', URL);
  install('URLSearchParams', URLSearchParams);
  install('TextEncoder', TextEncoder);
  install('TextDecoder', TextDecoder);
  install('atob', atob);
  install('btoa', btoa);
}`;
