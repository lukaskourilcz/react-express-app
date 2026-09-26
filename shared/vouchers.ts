/** Premium vouchers: the code format and the wire shapes, shared by the
 * browser and the server (migration 045).
 *
 * A voucher is a code the owner creates in /dev → Vouchers and hands to a
 * learner. Redeemed on /premium by a signed-in account, it opens Premium for
 * that account: a promo grant in `entitlement_grants` for the voucher's days,
 * or with no end. Premium changes which content a learner may start and
 * nothing else, so a voucher does too.
 *
 * The server stores only the SHA-256 of the normalised code and its first four
 * characters. This module is pure: the hashing and the random codes live in
 * `lib/vouchers.ts`, on the server. */

/** Crockford's base32: digits and upper-case letters without I, L, O and U,
 * so a code read aloud or copied by hand has no look-alike characters. */
export const VOUCHER_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** A generated code: twelve characters, shown as XXXX-XXXX-XXXX. */
export const VOUCHER_CODE_LENGTH = 12;
/** A code the owner chooses for a campaign: letters and digits. */
export const CUSTOM_VOUCHER_CODE = { min: 6, max: 32 } as const;
/** What a code may be when it is typed, before normalising. */
const MAX_TYPED_LENGTH = 64;

/** Upper case, without spaces or hyphens (any dash a copy may carry), in
 * Unicode's compatibility form, so "k7q2-abcd 1234" and "K7Q2ABCD1234" are
 * the same code. Null when what is left is not 6 to 32 letters and digits. */
export function normalizeVoucherCode(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > MAX_TYPED_LENGTH) return null;
  const code = raw.normalize('NFKC').toUpperCase().replace(/[\s\-‐-―−]/g, '');
  const { min, max } = CUSTOM_VOUCHER_CODE;
  return new RegExp(`^[A-Z0-9]{${min},${max}}$`).test(code) ? code : null;
}

/** The first four characters of a normalised code: all the owner's list
 * shows, and all a grant's note names. */
export const voucherHint = (code: string): string => code.slice(0, 4);

/** A normalised code in groups of four: K7Q2-ABCD-1234. */
export const formatVoucherCode = (code: string): string => code.match(/.{1,4}/g)?.join('-') ?? code;

/* ── the wire ──────────────────────────────────────────────────────────── */

/** POST /api/user/voucher `{ code }`, answered 200. A refusal is an error
 * envelope instead: 400 `voucher_invalid` for an unknown, expired, used-up or
 * revoked code (one answer for all four), 409 `voucher_already_redeemed`,
 * 429 `rate_limited`, 503 `voucher_unavailable` before migration 045. */
export interface VoucherRedeemResponse {
  status: 'redeemed';
  /** When the Premium this voucher opened ends; null: it has no end. */
  validUntil: string | null;
}

export const VOUCHER_INVALID = 'voucher_invalid';
export const VOUCHER_ALREADY_REDEEMED = 'voucher_already_redeemed';
export const VOUCHER_UNAVAILABLE = 'voucher_unavailable';

/** What a code does if a learner types it now. */
export type VoucherState = 'open' | 'used' | 'expired' | 'revoked';

/** One voucher in /dev → Vouchers. Never the code or its hash. */
export interface AdminVoucher {
  id: string;
  /** The code's first four characters. */
  hint: string;
  note: string;
  /** Days of Premium from the redemption; null: no end. */
  premiumDays: number | null;
  maxRedemptions: number;
  redeemedCount: number;
  /** The code cannot be redeemed from this moment; null: no such date. */
  redeemableUntil: string | null;
  active: boolean;
  createdAt: string;
  revokedAt: string | null;
  state: VoucherState;
}

/** The state the owner's list shows. Revoked wins over the others, then used
 * up, then expired, the order in which a learner would be told no. */
export function voucherState(
  voucher: Pick<AdminVoucher, 'active' | 'redeemedCount' | 'maxRedemptions' | 'redeemableUntil'>,
  now: number = Date.now(),
): VoucherState {
  if (!voucher.active) return 'revoked';
  if (voucher.redeemedCount >= voucher.maxRedemptions) return 'used';
  if (voucher.redeemableUntil !== null && Date.parse(voucher.redeemableUntil) <= now) return 'expired';
  return 'open';
}

/** POST /api/admin/vouchers `{ action: 'create', ... }`: the new voucher and
 * its code, formatted. The only answer that ever carries a code. */
export interface CreatedVoucher {
  voucher: AdminVoucher;
  code: string;
}
