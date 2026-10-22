# Stripe billing: what selling Premium needs

Premium billing (#221) is built and configured but not selling: Production runs with `BILLING_ENABLED=false`. Whether and when to take payments is the owner's decision. This file is the single place that lists the configured Stripe resources and the gates before sales open. Until then, Premium opens only through vouchers (`/dev` → Vouchers, migration 045) and manual grants (the admin `op=entitlements`).

Credentials live in Vercel, never in this repository. [client/.env.example](client/.env.example) shows the variable names for local work, and the header of [lib/billing/config.ts](lib/billing/config.ts) explains each one.

## Configured Stripe resources

Account `acct_1UKkgmLHhj5o2i3U`; Product `prod_VQcECN8jl8SIFW`, tax code `txcd_20060058` (self-study web-based training).

| Resource | Value |
|---|---|
| Monthly Price | `price_1UPl0CLHhj5o2i3U1gzQpP7l`: EUR 4.99 a month, tax exclusive |
| Annual Price | `price_1UPlhYLHhj5o2i3Ua2DWxpmZ`: EUR 59.88 a year, tax exclusive |
| Launch coupon | `launch55-2026nov30`: 55 % off, forever, restricted to this Product, `redeem_by=1796079599` (30 November 2026 23:59:59 Prague). Checkout applies it only inside the window in `shared/launch-offer.ts`: EUR 2.25 a month or EUR 26.95 a year before VAT |
| Webhook | `we_1UPlhxLHhj5o2i3UaVjZ52R1`: `https://devshark.app/api/user/billing-webhook`, API version `2026-08-26.dahlia`, the nine event types below |
| Customer Portal | `bpc_1UPlj0LHhj5o2i3UNZptHbTj`: monthly/yearly switch, card update, invoice history, cancellation at period end |
| Failed payments | The subscription cancels after all retries fail; failed-card and card-expiry emails are on |
| Managed Payments | "Ready to use" in the Dashboard; the server turns it on per Checkout Session. Stripe sends receipts, invoices and refund emails from Link |

Vercel Production holds the restricted live server key, the webhook signing secret, the matching `pk_live_` publishable key, both Price IDs, the coupon, `STRIPE_MANAGED_PAYMENTS=true`, `PUBLIC_ORIGIN=https://devshark.app` and `BILLING_ENABLED=false`. Production holds no test keys. No real payment has been made.

The webhook subscribes to nine events: `checkout.session.completed`; `customer.subscription.created`, `.updated` and `.deleted`; `invoice.paid` and `invoice.payment_failed`; `charge.refunded`; `charge.dispute.created`; `radar.early_fraud_warning.created`. Keep that set.

## How checkout works

Code: [lib/billing/handlers.ts](lib/billing/handlers.ts), [lib/billing/stripe.ts](lib/billing/stripe.ts), [lib/billing/sync.ts](lib/billing/sync.ts), [lib/billing/cancel.ts](lib/billing/cancel.ts), [client/src/lib/stripeCheckoutForm.ts](client/src/lib/stripeCheckoutForm.ts), [client/src/components/PremiumBillingPages.tsx](client/src/components/PremiumBillingPages.tsx). Every route is an `op` of `api/user/[op].ts`, so the handler count stays at twelve.

1. A signed-in free learner picks a plan on `/premium/checkout`. The page states the price before VAT, renewal and cancellation terms, and asks for the withdrawal-waiver consent.
2. The server checks identity, consent, the current entitlement and any open session, then creates a subscription Checkout Session: `ui_mode: embedded_page`, `managed_payments.enabled: true`, the configured Price, `return_url` `/premium/success?session_id={CHECKOUT_SESSION_ID}`, `billing_address_collection: auto`, `submit_type` and `locale` `auto`, no phone number. The consent version and timestamp go into the session metadata. The server pins API version `2026-09-30.endive; custom_checkout_payment_form_preview=v1`.
3. Stripe.js (`https://js.stripe.com/endive/stripe.js`, `createEmbeddedCheckoutPage`) loads after consent and mounts Stripe's payment iframe. Card data never reaches devShark.
4. Only the signed webhook or the account-owned success-page lookup changes an entitlement, through the service-role routines of migration 039. The browser cannot grant Premium.
5. Subscribers manage billing in the Customer Portal or on `/premium/cancel`. Cancellation there requires sign-in: without `RESEND_API_KEY` and `RESEND_FROM` the page cannot email a confirmation link (owner decision, 12 October 2026).

Managed Payments accepts only `hosted_page` and `embedded_page`; Stripe rejected `ui_mode: form` with it. Do not switch to plain Stripe to get around that: plain Stripe makes the owner the seller of record and the taxable person. The plain-Stripe branch (`STRIPE_MANAGED_PAYMENTS=false`, `ui_mode: form`, `dahlia` Stripe.js) stays in the code but is not the chosen setup.

## Gates before sales open

- [ ] Owner: complete Stripe's identity verification for the account and confirm payments and payouts are no longer paused.
- [ ] Confirm Managed Payments stays approved, then test tax by billing location, the monthly/yearly switch and the retained launch discount in the Portal.
- [ ] Have a lawyer check the Terms, the checkout consent text and the order-button wording (§ 1826a of the Czech Civil Code, § 312k BGB), and confirm the trader details in `TRADER` (`client/product-catalog.ts`).
- [ ] Run an isolated sandbox purchase with real webhook delivery, a failed renewal through grace to cancellation, and a refund. Preview deployments share the production database, so never run test-card sales there against real learner accounts.
- [ ] Set `BILLING_ENABLED=true` in Production and redeploy. With a dedicated account, verify EUR prices before VAT, the coupon inside its window, sign-up → payment → Premium, and cancellation. Record the results in [docs/release-acceptance.md](docs/release-acceptance.md).

## Sandbox testing

Use the sandbox account `acct_1UKjRALFC1za5WgX` with matching `pk_test_` and `sk_test_`/`rk_test_` keys and isolated data. Cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines, `4000 0025 0000 3155` asks for authentication. Never use test cards in live mode.

The sandbox has shown an embedded Managed Payments Checkout with EUR 4.99, a EUR 2.74 discount, EUR 0.47 Czech VAT and EUR 2.72 due. Nobody has confirmed a purchase. `npm run test:billing` runs the real handlers against a fake Stripe API and covers signed fulfilment, duplicates, consent and ownership; it proves no external payment.

## Changing prices

Create new Prices under the same Product and update the environment IDs. List every earlier Price that live subscriptions still bill in `STRIPE_PRICE_PREMIUM_LEGACY`. Never reprice existing subscriptions or remove their discounts.

Secrets never take the `VITE_` prefix and never appear in client builds, source, logs or chat. The server uses the `stripe` package (22.x); the browser loads Stripe.js straight from Stripe.
