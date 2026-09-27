// Premium vouchers in the browser (migration 045). The learner types a code on
// /premium and the server decides everything: whether the code exists, is
// still open, and whether this account redeemed it before. The browser sends
// the code as typed and reads one of four answers; nothing here can open
// Premium by itself.
import { apiFetch, ApiError } from './api';
import {
  normalizeVoucherCode,
  VOUCHER_ALREADY_REDEEMED,
  VOUCHER_INVALID,
  VOUCHER_UNAVAILABLE,
  type VoucherRedeemResponse,
} from '../../../shared/vouchers';

/** The id of the voucher section on /premium; the upgrade sheet links to it. */
export const VOUCHER_SECTION_ID = 'voucher';
export const VOUCHER_PATH = `/premium#${VOUCHER_SECTION_ID}`;

/** Redeem a code for the signed-in account. */
export function redeemVoucher(code: string): Promise<VoucherRedeemResponse> {
  return apiFetch<VoucherRedeemResponse>('/api/user/voucher', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

/* ── /premium?voucher=<code> (#239) ────────────────────────────────────── *
 * A campaign post links to /premium?voucher=<code>. The page fills the field
 * with the code and takes it out of the address bar at once, so the code does
 * not stay in the history, a copied link or a Referer. Nothing is redeemed
 * until the learner presses the button. A visitor who still has to sign in
 * keeps the code in this tab's session storage until they come back signed
 * in; the prefill is dropped as soon as the field shows it. */

export const VOUCHER_PARAM = 'voucher';
const PREFILL_KEY = 'devshark:voucher-prefill';

/** The code a link carries, as the field shows it, or null when the link has
 * none or carries something that cannot be a code. */
export function voucherFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get(VOUCHER_PARAM);
  if (raw === null) return null;
  const typed = raw.trim().slice(0, 64);
  return voucherLooksValid(typed) ? typed.toUpperCase() : null;
}

export function rememberVoucherPrefill(code: string): void {
  try {
    sessionStorage.setItem(PREFILL_KEY, code);
  } catch {
    // Storage blocked: the field is still filled on this visit.
  }
}

export function readVoucherPrefill(): string | null {
  try {
    const code = sessionStorage.getItem(PREFILL_KEY);
    return code && voucherLooksValid(code) ? code : null;
  } catch {
    return null;
  }
}

export function forgetVoucherPrefill(): void {
  try {
    sessionStorage.removeItem(PREFILL_KEY);
  } catch {
    // ignore
  }
}

/** Why a redemption did not open Premium, in the words the page uses. */
export type VoucherRefusal = 'empty' | 'invalid' | 'already' | 'rate-limited' | 'offline' | 'unavailable' | 'failed' | 'signed-out';

/** A code that cannot exist is refused here with the server's own answer, so
 * it costs no attempt; the server checks everything again. */
export const voucherLooksValid = (typed: string): boolean => normalizeVoucherCode(typed) !== null;

export function voucherRefusal(error: unknown): VoucherRefusal {
  if (!(error instanceof ApiError)) return 'failed';
  if (error.code === VOUCHER_INVALID) return 'invalid';
  if (error.code === VOUCHER_ALREADY_REDEEMED) return 'already';
  if (error.status === 429) return 'rate-limited';
  if (error.code === VOUCHER_UNAVAILABLE || error.status === 503) return 'unavailable';
  if (error.status === 401) return 'signed-out';
  if (error.status === 0) return 'offline';
  return 'failed';
}
