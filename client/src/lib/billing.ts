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
 * and who sells it. All read false or null until the server's settings
 * arrive; `known` says they have. */
export function useBilling(): { enabled: boolean; cancellable: boolean; seller: 'link' | 'trader' | null; known: boolean } {
  const { config, fromServer } = useGameConfigStatus();
  const { enabled, cancellable, seller } = config.billing;
  return { enabled, cancellable, seller: seller === 'link' || seller === 'trader' ? seller : null, known: fromServer };
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

export interface CancelReceipt {
  received: true;
  action: CancelAction;
  email: string;
  receivedAt: string;
  emailed: boolean;
  /** Only for a signed-in owner of the address. */
  details?: Array<{ withdrawn: boolean; refunded: boolean; endsAt: string | null }>;
}

/** Step one checks the form; step two cancels or withdraws. */
export function requestCancellation(email: string, action: CancelAction, step: 'request'): Promise<{ step: 'confirm' }>;
export function requestCancellation(email: string, action: CancelAction, step: 'confirm'): Promise<CancelReceipt>;
export function requestCancellation(email: string, action: CancelAction, step: 'request' | 'confirm') {
  return apiFetch(USER('billing-cancel'), {
    method: 'POST',
    body: JSON.stringify({ email, action, step }),
    timeoutMs: 20_000,
  });
}

/** A plausible email address; the server checks again. */
export const looksLikeEmail = (value: string): boolean => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/.test(value.trim());
