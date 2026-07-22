---
name: shark-screen-implementation
description: Implement or refactor a complete StudyShark/devShark web screen with reuse, Deep End v2, EN/CS parity, responsive behavior, accessibility, states, and repository validation.
---

# Shark Screen Implementation

Use `shark-product-context` and `deep-end-design-system` with this workflow.

1. Inspect Git state and preserve unrelated changes.
2. Trace the route from `client/src/App.tsx`; read its component, CSS, data hooks, API client, and both translation dictionaries.
3. Search for reusable Astryx/UI/landing primitives, state components, dialogs, glyphs, tokens, and sibling layouts.
4. State the user goal, primary action, product/auth/subject scope, and real data authority.
5. Implement the complete flow, including relevant loading, delayed, empty, partial error, offline/reconnect, signed-out/permission, disabled, success, destructive, expired/stale, long-content, and narrow states.
6. Preserve stable quiz answer positions, keyboard behavior, route focus, visible focus, semantic headings/landmarks, accessible names/errors/status, touch targets, reduced motion, and non-color cues.
7. Add natural EN and CS copy together. Do not invent users, counts, testimonials, legal conclusions, partners, or product claims.
8. Review the diff for duplicate registries/components, hard-coded URLs/counts/subject colors, public DevQuiz copy, nested-card noise, and answer-integrity regressions.
9. Run focused checks, then `npm run typecheck:api`, `npm run test:launch`, `npm run build`, and `git diff --check`. Use the real browser/responsive harness for visual changes.

Update existing authoritative documentation only when a reusable contract changes. Do not add a new UI library, state system, runtime media generator, API handler, or native app.
