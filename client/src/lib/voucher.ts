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
