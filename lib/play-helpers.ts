import { randomInt } from 'node:crypto';
import { createServiceClient } from './http';

// Generic HTTP/Supabase helpers live in http.ts; re-exported here so the
// play handler can import everything it needs from one place.
export { jsonError, logEvent, withTimeout } from './http';

// Live matches read/write rows on behalf of the verified host or player, so
// they use the service-role client (see http.ts for why that is safe).
export const supabase = createServiceClient();

// Crockford base32 alphabet — no I/L/O/U so codes are easy to read aloud.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateMatchCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

export function isShortString(v: unknown, max = 256): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}
