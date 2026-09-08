import { en } from '../../client/src/i18n/translations';
import { cs } from '../../client/src/i18n/translations.cs';
const enKeys = Object.keys(en as Record<string, string>);
const csMap = cs as unknown as Record<string, string>;
const csKeys = new Set(Object.keys(csMap));
const missing = enKeys.filter((k) => !csKeys.has(k));
const extra = [...csKeys].filter((k) => !(enKeys as string[]).includes(k));
console.log('en keys', enKeys.length, 'cs keys', csKeys.size);
console.log('MISSING IN CS:', missing.length, missing.slice(0, 80));
console.log('EXTRA IN CS:', extra.length, extra.slice(0, 80));
const empty = [...csKeys].filter((k) => typeof csMap[k] === 'string' && csMap[k].trim() === '');
console.log('EMPTY CS:', empty.length, empty.slice(0, 40));
// placeholder parity
const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
const mismatched = enKeys.filter((k) => csKeys.has(k) && ph((en as Record<string,string>)[k]) !== ph(csMap[k]));
console.log('PLACEHOLDER MISMATCH:', mismatched.length, mismatched.slice(0, 40));
