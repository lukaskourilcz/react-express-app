# StudyShark + devShark — monetization

StudyShark is a learning/quiz product; devShark is a companion. Revenue options
centre on a freemium model for an education audience.

| Option | Likelihood of income | Possible earnings | Pros | Cons |
|---|---|---|---|---|
| **Freemium subscription / premium tier** | Medium | $0–800/mo | Recurring; fits a learning tool | Needs a clear premium value |
| **Voluntary support (already wired via `SUPPORT_ENABLED`)** | Low–Medium | $0–200/mo | Easy; goodwill | Small; needs legal/accounting review |
| **Paid AI explanations add-on** | Low | $0–150/mo | Uses existing feature flags | AI cost must stay under revenue |
| **Ads** | Low | $0–100/mo | Passive | Risky for a student/edu audience |
| **School / classroom licenses** | Low | project-based | Larger deals | Long sales cycle; support |

**Recommendation:** lead with a freemium subscription; keep voluntary support;
avoid ads for the edu audience.

## Merchandise is a cost line, not one of these

The shop and the path-completion package look like revenue and are not. The
package is earned by finishing a learning path, nobody pays for it, and each one
is a t-shirt, a mug and a sticker set that somebody has to buy, print, pack and
post. It is the only part of the product whose cost rises when learners do well,
so it is bounded rather than forecast: `packagesPerMonth` caps how many leave in
a calendar month, and migration 040 enforces that inside the claiming
transaction.

Read the month's worst case off `packageMonthlyCeilingMinor` — every slot filled
at the cap, plus the print-on-demand plan's monthly fee — and treat it as a
marketing cost against the options above, not as a product line. Neither the
quotes nor the cap has a default; both are owner-entered, and
`docs/rewards-launch.md` is what they need.

The cheap end is where the supporter reward lives. The crown is an SVG this
repository draws, priced in tokens earned by learning; it ships nothing and
costs nothing to honour, which is why it is the tier that can scale with the
audience while the package cannot.
