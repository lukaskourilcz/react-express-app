# devShark — monetization

devShark is freemium. Every account gets HTML, CSS, JavaScript, React levels 1 to 12 and the opening stages of the coding projects; Premium opens the rest. `shared/tiers.ts` holds the split and the prices. Stripe checkout is built but switched off (`BILLING_ENABLED=false`), so devShark earns nothing today. Whether and when to take payments is the owner's decision (#221); [STRIPE_INTEGRATION_TODO.md](STRIPE_INTEGRATION_TODO.md) lists what selling needs.

| Option | Likelihood of income | Possible earnings | Pros | Cons |
|---|---|---|---|---|
| **Premium subscription** (built, not selling): 4.99 EUR a month or 59.88 EUR a year before VAT, through Stripe Checkout with Managed Payments | Medium | €0–800/mo | Recurring; Stripe acts as merchant of record, so it collects and remits VAT, handles disputes and sends receipts; the annual plan pays Stripe's fixed per-charge fee once a year | Stripe takes per-charge fees plus the Managed Payments fee; sales wait on the owner's Stripe identity verification |
| **Launch offer** (inside the subscription) | Depends on Premium | 2.25 EUR a month or 26.95 EUR a year before VAT, for the life of each subscription started by 30 November 2026 | Lowers the first barrier (`shared/launch-offer.ts`, 55 % forever coupon) | Each launch subscriber pays less than half the regular price for as long as they stay; it applies only if sales open before the window ends |
| **Premium vouchers** | None directly | — | The owner opens Premium for a learner without billing (`/dev` → Vouchers, migration 045) | Gives Premium away |
| **Merchandise through Spreadshop** (paused) | Low | The margin above Spreadshop's base prices on cash sales | No stock or checkout to run; sprd.net AG is the seller of record | Paused behind `MERCH_ENABLED` until the owner turns it back on; coin redemptions cost the owner the base price plus shipping |
| **Ads** | Low | $0–100/mo | Passive | Risky for a learner audience; the plan table promises no ads on either tier |
| **School / classroom licences** | Low | Project-based | Larger deals | Long sales cycle; support load |

Voluntary support ended when Premium arrived: `/support` redirects to `/premium`.

**Recommendation:** sell Premium monthly and yearly once the owner opens sales, keep merchandise a capped reward, and run no ads.
