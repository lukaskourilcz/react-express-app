// Billing in the browser (#221). The browser never talks to Stripe: it asks
// the server for a hosted Checkout or Customer Portal URL and goes there. Only
// the signed webhook and the server's session lookup change a plan, so nothing
// here can open Premium by itself.
import { apiFetch } from './api';
import { useGameConfigStatus } from './gameConfig';
import type { EntitlementResponse } from '../../../shared/tiers';

export type BillingPlan = 'monthly' | 'annual';
export type CancelAction = 'cancel' | 'withdraw';

const USER = (op: string) => `/api/user/${op}`;

/** Whether checkout sells Premium, whether cancellation can reach Stripe,
 * whether the cancellation page can email its link, and who sells it. All read
 * false or null until the server's settings arrive; `known` says they have,
 * `failed` that they could not be read. */
export function useBilling(): {
  enabled: boolean;
  cancellable: boolean;
  cancelByEmail: boolean;
  seller: 'link' | 'trader' | null;
  known: boolean;
  failed: boolean;
  retry: () => void;
} {
  const { config, fromServer, failed, retry } = useGameConfigStatus();
  const { enabled, cancellable, cancelByEmail, seller } = config.billing;
  return {
    enabled,
    cancellable,
    cancelByEmail: cancelByEmail === true,
    seller: seller === 'link' || seller === 'trader' ? seller : null,
    known: fromServer,
    failed: failed && !fromServer,
    retry,
  };
}

/** Stripe's hosted pages, and nothing else, may receive the learner. */
export function isStripeHostedUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  try {
    const url = new URL(raw);
    const host = url.hostname;
    return url.protocol === 'https:'
      && (host === 'stripe.com' || host.endsWith('.stripe.com') || host === 'link.com' || host.endsWith('.link.com'));
  } catch {
    return false;
  }
}

function leaveFor(url: unknown): void {
  if (!isStripeHostedUrl(url)) throw new Error('The payment provider returned an unexpected address.');
  window.location.assign(url);
}

/** Start Checkout for a plan and leave for Stripe's hosted page. */
export async function startCheckout(plan: BillingPlan): Promise<void> {
  const { url } = await apiFetch<{ url: string }>(USER('billing-checkout'), {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
  leaveFor(url);
}

/** Open the Customer Portal: card, invoices, plan switch, cancel at period end. */
export async function openBillingPortal(): Promise<void> {
  const { url } = await apiFetch<{ url: string }>(USER('billing-portal'), { method: 'POST' });
  leaveFor(url);
}

export interface CheckoutLookup {
  status: 'complete' | 'pending' | 'expired';
  entitlement: EntitlementResponse;
}

/** The success page's question: did this checkout open Premium? */
export function lookupCheckout(sessionId: string, signal?: AbortSignal): Promise<CheckoutLookup> {
  return apiFetch<CheckoutLookup>(`${USER('billing-checkout')}?session_id=${encodeURIComponent(sessionId)}`, { signal });
}

/** What changed, once the address was proven: a signed-in owner of it, or
 * the link emailed to it. */
export interface CancelReceipt {
  received: true;
  confirmed: true;
  action: CancelAction;
  email: string;
  /** When the request was made on the page; the receipt names this time. */
  receivedAt: string;
  emailed: boolean;
  details: Array<{ withdrawn: boolean; refunded: boolean; endsAt: string | null }>;
}

/** Nothing changed yet: a link went to the address, or the page cannot send
 * one and the owner of the address has to sign in. */
export type CancelPending =
  | { received: true; confirmBy: 'email'; action: CancelAction; email: string; receivedAt: string; expiresInMinutes: number }
  | { received: false; confirmBy: 'sign-in'; action: CancelAction; email: string };

export type CancelAnswer = CancelReceipt | CancelPending;

export const isCancelReceipt = (answer: CancelAnswer): answer is CancelReceipt => 'confirmed' in answer && answer.confirmed === true;

/** Step one checks the form; step two asks for the cancellation. */
export function requestCancellation(email: string, action: CancelAction, step: 'request'): Promise<{ step: 'confirm' }>;
export function requestCancellation(email: string, action: CancelAction, step: 'confirm'): Promise<CancelAnswer>;
export function requestCancellation(email: string, action: CancelAction, step: 'request' | 'confirm') {
  return apiFetch(USER('billing-cancel'), {
    method: 'POST',
    body: JSON.stringify({ email, action, step }),
    timeoutMs: 20_000,
  });
}

export interface CancelLink {
  action: CancelAction;
  email: string;
  requestedAt: string;
  expiresAt: string;
}

/** What the emailed link asks for, without using it. */
export function reviewCancelLink(token: string): Promise<CancelLink> {
  return apiFetch<CancelLink>(USER('billing-cancel'), { method: 'POST', body: JSON.stringify({ step: 'review', token }) });
}

/** Use the emailed link: the request is carried out. */
export function confirmCancelLink(token: string): Promise<CancelReceipt> {
  return apiFetch<CancelReceipt>(USER('billing-cancel'), {
    method: 'POST',
    body: JSON.stringify({ step: 'execute', token }),
    timeoutMs: 20_000,
  });
}

/** The token of a confirmation link, read from `#confirm=…`. */
export function cancelLinkToken(hash: string): string | null {
  const match = /^#confirm=([A-Za-z0-9_-]{43})$/.exec(hash);
  return match ? match[1] : null;
}

/** A plausible email address; the server checks again. */
export const looksLikeEmail = (value: string): boolean => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/.test(value.trim());
