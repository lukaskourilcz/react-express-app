# Product, brand, and deployment architecture

The web repository implements two public products on shared technology:

```text
devShark
└── developer learning (`webdev` only)

StudyShark
├── geoShark (`geography`)
├── mathShark (`math`)
├── historyShark (`history`)
├── bioShark (`biology`)
├── chessShark (`chess`)
└── pokerShark (`poker`)
```

devShark is a sibling product, not a StudyShark subject. The StudyShark picker
therefore never includes `webdev`. Authentication and infrastructure may be
shared, while every scored server flow validates one deployment and subject
scope before selecting questions or writing progress.

## Sources of truth

- `client/product-catalog.ts` owns product names, relationships, localized SEO
  copy, support variant, brand ordering, and deterministic product resolution.
- `client/src/lib/products.ts` attaches deployment URLs and presentation data to
  that catalog. Footer and cross-brand discovery render this registry rather
  than maintaining separate brand lists.
- `shared/subject-catalog.ts` owns the security-sensitive subject-to-topic and
  subject-to-category mapping shared by browser and server code.
- `client/src/lib/subjects.ts` adds subject presentation tokens and persisted
  selection behavior without redefining category ownership.
- `lib/product-scope.ts` resolves the server deployment allow-list from
  `PRODUCT_ID`/`PRODUCT_SUBJECT` (with build-variable fallbacks).

Do not introduce another brand array, URL map, category ownership map, or footer
list. Extend these sources instead.

## Daily-habit layer

The spaced-mastery, Today queue, forgiving-streak, Sharkira-hint, badge, Shark
Card, study-advisor, and adaptive-placement additions are additive and change no
product or subject scope. Their shared sources of truth are `shared/mastery.ts`
(cleared/mastered state and spaced-review scheduling), `shared/badges.ts` (the
server-verifiable badge catalog), and `shared/cards.ts` (a finite per-subject
collectible catalog with deterministic packs). Every new endpoint is a
`resource=`/`op=` branch inside an existing handler, so the twelve-handler budget
is unchanged, and all new storage lives in `supabase/supabase-schema-024.sql` (additive,
idempotent; see `NEEDED.md` to apply it). Cards, freezes, and badges are cosmetic
retention only and never affect access, content, XP, scores, streaks, ranks, or
AI availability.

## Deployment matrix

| Deployment | Identity | Subjects | Footer |
|---|---|---|---|
| devShark | devShark | webdev only | devShark plus StudyShark subject links |
| StudyShark | StudyShark | all non-development subjects | devShark plus every internal subject brand |

Set matching client and server identity values on every deployment. For
devShark, use `VITE_PRODUCT=devshark`, `VITE_LOCK_SUBJECT=webdev`,
`PRODUCT_ID=devshark`, and `PRODUCT_SUBJECT=webdev`. For the StudyShark portal,
use `studyshark` product values and leave both subject locks unset. General
subject lock/product values are intentionally ignored so stale configuration
cannot split StudyShark into separate sites.

Only `VITE_STUDYSHARK_URL` and `VITE_DEVSHARK_URL` are public product URLs.
geoShark, mathShark, historyShark, bioShark, chessShark, and pokerShark are
branded subject contexts linking to `/subjects?subject=…` on StudyShark. The
shared footer marks the active context accessibly; “Coming soon” is reserved
for an unconfigured devShark link.

## Adding a future subject

1. Add the subject's unique topics/categories to `shared/subject-catalog.ts`.
2. Add presentation metadata to `client/src/lib/subjects.ts` and product metadata
   to `client/product-catalog.ts`.
3. Add its internal brand mapping in `client/src/lib/products.ts`, its question
   chunk in `lib/question-bank-loader.ts`, and its localized UI labels.
4. Extend the database subject checks in a new forward migration; never rewrite
   previously applied migration files in production.
5. Add resolver, picker, footer, scope, leaderboard, roadmap, and build tests.

The shared footer, picker, product resolver, metadata generator, and backend
scope guard then consume the registries automatically; unrelated components do
not need new product conditionals.

## Compatibility and rollback

Existing DevQuiz/web-development records remain `webdev`. Migration 022 assigns
that subject to legacy daily and challenge rows, while keeping legacy total XP
alongside the subject map. Server-verified receipts and attempts make new
progress idempotent. Rolling application code back should leave migrations
021/022 in place: their new columns are backward-compatible and their revoked
browser writes are security controls.

## AI features by product

StudyShark keeps the dormant AI wiring (deeper explanations, Sharkira hints) behind the provider and budget gates in `lib/ai-provider.ts`. devShark ships none of it: `aiFeaturesAllowed()` in `lib/product-scope.ts` is false for the `webdev` deployment, so `api/quiz/submit.ts` refuses the `explanation` and `hint` resources with `feature_disabled`, `api/settings.ts` reports explanations as unavailable, and the quiz never renders the affordances. Coding-challenge hints are authored content whose last rung before the reference solution is a documentation link (`shared/coding-docs.ts`).
