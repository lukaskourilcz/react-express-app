# Stripe integration status — 12 October 2026

The owner selected Stripe Managed Payments as merchant of record. Production resources and Vercel settings are prepared. **Sales remain disabled (`BILLING_ENABLED=false`), at the owner's request, until account identity verification can be completed.** This file is the single source of truth for the remaining Stripe setup.

## Values to Replace

There are no placeholder prices, payment modes or credentials in the production implementation. Credentials are stored in Vercel, never in this repository. The illustrative values in [client/.env.example](client/.env.example) are only for local configuration.

| Field | Current value | Action before enabling sales |
|---|---|---|
| `BILLING_ENABLED` | `false` | Set to `true` only after the remaining gates below pass; redeploy. |
| `RESEND_API_KEY`, `RESEND_FROM` | Unconfigured, deferred by owner | Cancellation requires sign-in for this release. Resend is optional future work, not a sales activation gate. |

## Prepared production resources

Account `acct_1UKkgmLHhj5o2i3U`; Product `prod_VQcECN8jl8SIFW`, tax code `txcd_20060058` (self-study web-based training).

| Resource | Configured value |
|---|---|
| Monthly Price | `price_1UPl0CLHhj5o2i3U1gzQpP7l` — EUR 4.99/month, tax exclusive |
| Annual Price | `price_1UPlhYLHhj5o2i3Ua2DWxpmZ` — EUR 59.88/year, tax exclusive |
| Coupon | `launch55-2026nov30` — 55%, forever, restricted to this Product, `redeem_by=1796079599` |
| Offer window | Through 30 November 2026 23:59:59 Prague; EUR 2.25/month or EUR 26.95/year before VAT |
| Webhook | `we_1UPlhxLHhj5o2i3UaVjZ52R1` — `https://devshark.app/api/user/billing-webhook`, API `2026-08-26.dahlia` |
| Customer Portal | `bpc_1UPlj0LHhj5o2i3UNZptHbTj` — default, monthly/yearly switch, card update, invoice history, cancellation at period end |
| Managed Payments | Dashboard “Ready to use”; enabled per Checkout Session, not account-wide by default |

Vercel Production has the restricted live server key, webhook signing secret, matching **public** `pk_live_` key, both Price IDs, coupon, `STRIPE_MANAGED_PAYMENTS=true`, `PUBLIC_ORIGIN=https://devshark.app` and `BILLING_ENABLED=false`. No test secrets were placed in Production. No real payments were made.

## Configured Parameters

Files: [handlers.ts](lib/billing/handlers.ts), [stripe.ts](lib/billing/stripe.ts), [Stripe.js loader](client/src/lib/stripeCheckoutForm.ts), [checkout page](client/src/components/PremiumBillingPages.tsx).

| Parameter | Value |
|---|---|
| `mode` | `subscription` |
| `ui_mode` | `embedded_page` for Managed Payments; optional plain-Stripe branch uses `form` |
| `managed_payments.enabled` | `true` for the selected seller model |
| `line_items` | Server selects configured monthly/yearly Price; quantity 1 |
| `return_url` | `/premium/success?session_id={CHECKOUT_SESSION_ID}` on `PUBLIC_ORIGIN` |
| `integration_identifier` | `custom_embedded_web_0001` |
| `billing_address_collection` | `auto` |
| `phone_number_collection.enabled` | `false` |
| `submit_type`, `locale` | `auto` |
| `automatic_tax`, `payment_method_collection`, `customer_update` | Omitted for Managed Payments, which controls tax/address handling |
| Consent | Required devShark checkbox before POST; server-versioned waiver and timestamp in session metadata |
| API header | `2026-09-30.endive; custom_checkout_payment_form_preview=v1`, verified in Checkout Studio |
| Stripe.js | Managed: direct `https://js.stripe.com/endive/stripe.js`, `createEmbeddedCheckoutPage({fetchClientSecret})`; plain form: direct `https://js.stripe.com/dahlia/stripe.js`, beta `custom_checkout_payment_form_1` |
| Form appearance (plain branch) | Stripe theme; auto labels; spaced inputs; Roboto 16px; spacing 4px; radius 4px; background `#ffffff`, danger `#df1b41`, primary `#0570de`, success `#00c853`, text `#30313d` |
| Form layout/confirmation (plain branch) | `expanded`; `loadActions()`; confirm event → `actions.confirm({formConfirmEvent})` |

**Compatibility:** Stripe's actual API rejected `ui_mode: form` with Managed Payments: only `hosted_page` and `embedded_page` are supported. The selected embedded mode keeps payment on devShark and card fields inside Stripe. Do not switch to plain Stripe to bypass this restriction; that changes the merchant/tax responsibility selected by the owner.

## Structure and flow

Only [stripeCheckoutForm.ts](client/src/lib/stripeCheckoutForm.ts) is a new implementation module. Existing billing handlers, components and shared pricing registries are extended; the twelve physical API handlers remain.

1. Signed-in free learner chooses a plan and opens `/premium/checkout`.
2. The page states the price before VAT, renewal/cancellation terms and required consent.
3. Server validates identity, consent, entitlement and duplicate/open sessions, then creates a real subscription session. JSON includes `client_secret`, session ID, expiry and UI mode; no caching.
4. Stripe.js loads after consent and mounts Stripe's payment iframe. Errors, expiry and unmount clean up the instance; retries require renewed consent. Card data never reaches devShark.
5. Signed webhook or the account-owned success lookup verifies payment and updates entitlements through existing service-role routines. The browser cannot grant Premium.
6. Existing subscribers use the Portal or cancellation page. Premium changes content access only, never grading or XP.

## Setup and remaining activation gates

- [ ] Owner: complete Stripe's **Verify Lukas Kouril's identity** task and confirm payments/payouts are no longer paused. API-key security verification is already complete; it is a separate task.
- [ ] Confirm Managed Payments remains eligible/approved and test supported subscription/Portal behavior, including tax added by billing location, monthly/yearly switching and retained lifetime discount.
- [x] Dashboard configuration: cancel the subscription after all retries fail; the first failed renewal remains overdue and active status requires the latest invoice to be settled. Failed-card-payment and card-expiry notification emails are enabled and saved. Actual failure/delivery behavior still belongs to the isolated sandbox test below.
- [x] Managed Payments receipt configuration: Stripe always sends payment receipts, invoices, refund and credit-note emails from Link, independently of the general receipt switches. Confirm actual delivery during the isolated transaction test. See [official Managed Payments behavior](https://docs.stripe.com/payments/managed-payments/how-it-works).
- [x] Owner decision on 12 October: cancellation stays available after sign-in only. Logged-out confirmation emails and Resend provisioning are deferred; `cancelByEmail=false` remains intentional.
- [ ] Complete the existing trader/legal and hosting readiness gates referenced in [NEEDED.md](NEEDED.md); do not invent legal identity details.
- [ ] Complete an isolated sandbox purchase, actual webhook delivery, failed renewal/grace/cancellation and refund. Preview currently shares production data: do **not** enable test-card sales against real learner accounts.
- [ ] After all gates: enable sales in Production and redeploy. Verify EUR, prices before VAT, automatic 55% coupon until the window ends, signup → payment → Premium, and cancellation with a dedicated authorized account.

Dependencies: official `stripe` package already installed (22.6.2); Stripe.js loads directly from Stripe, without another client package. Public configuration may use `VITE_`; server/signing secrets must never use that prefix or appear in client builds, source, logs or chat.

For price updates, create immutable Prices under this Product and update environment IDs. Keep any previously subscribed Price IDs in `STRIPE_PRICE_PREMIUM_LEGACY`; do not reprice existing subscriptions or remove their discounts. Keep the existing nine webhook event types: Checkout completed; subscription created/updated/deleted; invoice paid/payment failed; charge refunded/dispute created; early fraud warning created.

## Test modes and evidence

Use sandbox account `acct_1UKjRALFC1za5WgX`, matching `pk_test_`/`sk_test_` or `rk_test_`, and an isolated data fixture. Success card `4242 4242 4242 4242`, any future expiry/CVC; decline `4000 0000 0000 0002`; authentication `4000 0025 0000 3155`. Never use test cards in live mode.

Actual sandbox API verified Managed Payments `embedded_page`, exclusive EUR 4.99 monthly price, 55% forever coupon and total EUR 2.25 before billing-location tax. Contract tests separately verify signed fulfillment, duplicates, consent and ownership; this is not proof of a completed external payment. An initial older SDK call failed to mount; the current Endive `createEmbeddedCheckoutPage` API was then verified in Chrome and headless Chromium. Actual Checkout displayed EUR 4.99, a EUR 2.74 discount, EUR 0.47 Czech VAT and EUR 2.72 due. No purchase was confirmed; complete the sandbox purchase/webhook gate before enabling sales. See [release acceptance](docs/release-acceptance.md) for final check outcomes and checks that could not run.

Resources: [Stripe support](https://support.stripe.com), [Stripe MCP](https://docs.stripe.com/mcp), [Managed Payments integration](https://docs.stripe.com/payments/managed-payments/update-checkout), [Checkout form](https://docs.stripe.com/checkout/form/quickstart).
