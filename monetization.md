# devShark — monetization

devShark has been freemium since 25 September 2026: every account learns HTML, CSS, JavaScript and half of React, and Premium opens the rest. The subscription is the decision; the other rows are what could sit beside it. Fee figures come from `SECOND-HANDOFF-25-9-2026.md` (section 1, read 2026-09-25).

| Option | Likelihood of income | Possible earnings | Pros | Cons |
|---|---|---|---|---|
| **Premium subscription (the decision)**: 3.99 EUR a month or 39.99 EUR a year, VAT included, through Stripe Checkout with Managed Payments | Medium | €0–800/mo; the owner keeps about 2.72–2.80 EUR of each 3.99 charge, so 800 a month needs roughly 290 monthly subscribers | Recurring; Stripe (as Link) is the merchant of record and collects and remits VAT, handles disputes and sends receipts; the annual plan cuts the fee share by more than half | Fixed fees take 7–11 % of a 3.99 charge; Stripe's eligibility review may decline a sole trader (Paddle, the runner-up, leaves about 2.66); plain Stripe with Stripe Tax costs about 9.5–11.5 % and makes the owner the taxable person |
| **Merchandise through Spreadshop** | Low | The margin set above Spreadshop's base prices, paid monthly (SEPA, EUR, minimum 10) | No stock or checkout to run; sprd.net AG is the seller of record for cash sales | Coin redemptions cost the owner the base price plus shipping (a mug is 13.49 plus shipping, more than several months of one subscriber's net); a retention reward, not a margin line |
| **Voluntary support** | None: retired on 25 September 2026 (#222) | — | — | Premium replaced it; `/support` redirects to `/premium` |
| **Ads** | Low | $0–100/mo | Passive | Risky for a student audience, and the plan table promises no ads on either tier |
| **School / classroom licenses** | Low | project-based | Larger deals | Long sales cycle; support |

**Recommendation:** sell Premium monthly and annually (the annual plan pays the fixed fee once a year), keep merchandise a capped retention reward, and run no ads.
