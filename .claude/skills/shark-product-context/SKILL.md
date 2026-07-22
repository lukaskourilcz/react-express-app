---
name: shark-product-context
description: Protect StudyShark/devShark product architecture, business rules, terminology, scope, localization, and integrity. Use for any feature, route, API, copy, settings, or data-flow change.
---

# Shark Product Context

Read `docs/product-architecture.md`, `client/product-catalog.ts`, `shared/subject-catalog.ts`, and `docs/design/brand-system.md` before changing product behavior.

## Product model

- StudyShark is one general-learning ecosystem containing geoShark, mathShark, historyShark, bioShark, chessShark, and pokerShark.
- devShark is the standalone `webdev` developer-learning sibling. It is never a StudyShark subject.
- Both deployments share this repository and infrastructure. Resolve identity and links through environment-backed registries.
- Preserve the shared Shark-family footer: general brands link to StudyShark contexts; devShark remains the sibling product.

## Protected rules

- All learning is free. Support and cosmetics never change access, questions, explanations, paths, AI availability, XP, scores, streaks, ranks, leaderboards, or matchmaking.
- The server owns product scope, subject scope, answers, grading, scores, XP, admin roles, and one-time claims. Never expose correct answers before submission.
- Keep exactly 12 physical TypeScript handlers under `api/`; extend typed multiplexing rather than adding a handler.
- Keep Supabase service-role isolation, RLS, request IDs, schema/method validation, rate limiting, and safe errors.
- Keep EN/CS parity. Public `DevQuiz` copy is stale, but storage keys, migrations, package/repository names, fixtures, and history may remain for compatibility.
- Native/Expo work is out of scope.

## Reuse order

Search registries, `client/src/components/ui/`, `client/src/components/landing/`, shared hooks/helpers, translation keys, dialogs, toasts, and tests before creating an abstraction. Validate product and subject behavior with `npm run test:launch`.
