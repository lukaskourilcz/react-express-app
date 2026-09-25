---
name: shark-product-context
description: Protect devShark product architecture, business rules, terminology, scope, localization, and integrity. Use for any feature, route, API, copy, settings, or data-flow change.
---

# Shark Product Context

Read `docs/product-architecture.md`, `client/product-catalog.ts`, `shared/subject-catalog.ts`, and `docs/design/brand-system.md` before changing product behavior.

## Product model

- devShark is a developer-learning product with one subject, `webdev`. Progress, XP, tokens, and the database stay keyed by that subject.
- This repository builds devShark alone. `resolveCatalogProductId` throws for any other product or subject lock, so a misconfigured build fails. StudyShark moved to its own repository, `lukaskourilcz/studyshark`, on 2026-09-24. Add no other product, subject, brand, or cross-link here.
- The footer carries the legal links and the appearance and sound controls. It promotes no other product.

## Protected rules

- devShark is freemium. `shared/tiers.ts` is the only place that says what the free tier includes and what Premium opens; the server refuses locked content with 402 and the client only mirrors it with a text "Premium" lock and the upgrade sheet. Premium, coins and cosmetics change which content a learner may start and nothing else: never questions, explanations, AI availability, XP amounts, scores, streaks, ranks, leaderboards or matchmaking. Streak protection keeps its four bounds (see `shared/rewards.ts`). Merchandise is printed and shipped by Spreadshop; coins redeem items, never discounts.
- devShark ships no AI feature. Coding hints are authored and end in documentation links.
- The server owns product scope, subject scope, answers, grading, scores, XP, admin roles, and one-time claims. Never expose correct answers before submission.
- Keep exactly 12 physical TypeScript handlers under `api/`; extend typed multiplexing rather than adding a handler.
- Keep Supabase service-role isolation, RLS, request IDs, schema/method validation, rate limiting, and safe errors.
- The app ships English only (`ENABLED_LANGS`). Write no Czech copy and add no Czech keys; the existing Czech files are retained work, neither extended nor deleted. Public `DevQuiz` copy is stale, but storage keys (the `studyshark:*` keys among them), migrations, package/repository names, fixtures, and history may remain for compatibility.
- Native/Expo work is out of scope.

## Reuse order

Search registries, `client/src/components/ui/`, `client/src/components/landing/`, shared hooks/helpers, translation keys, dialogs, toasts, and tests before creating an abstraction. Validate product and subject behavior with `npm run test:launch`.
