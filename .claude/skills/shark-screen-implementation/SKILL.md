---
name: shark-screen-implementation
description: Implement or refactor a complete devShark web screen with reuse, Deep End v2, English copy, responsive behavior, accessibility, states, and repository validation.
---

# Shark Screen Implementation

Use `shark-product-context` and `deep-end-design-system` with this workflow.

1. Inspect Git state and preserve unrelated changes.
2. Trace the route from `client/src/App.tsx`; read its component, CSS, data hooks, API client, and `client/src/i18n/translations.ts`.
3. Search for reusable Astryx/UI/landing primitives, state components, dialogs, glyphs, tokens, and sibling layouts. Start from the catalogue in `docs/design/design-system.md` and the "Build a new screen" checklist in `deep-end-design-system`: the route width from `pageWidth.ts`, `PageHeader` (or `Page`, `LearnPageHeader`), 44px controls with 36px only in `.ss-compact`, one `SwimCta` md, `StatePanel` for every empty, gate and signed-out state, the `components/question/` parts, the coding workbench and `BriefZone`, `.ss-panel` cards, settings rows and hairline list rows.
4. State the user goal, primary action, product/auth/subject scope, and real data authority.
5. Implement the complete flow, including relevant loading, delayed, empty, partial error, offline/reconnect, signed-out/permission, disabled, success, destructive, expired/stale, long-content, and narrow states.
6. Preserve stable quiz answer positions, keyboard behavior, route focus, visible focus, semantic headings/landmarks, accessible names/errors/status, touch targets, reduced motion, and non-color cues.
7. Add natural copy to `translations.ts`. devShark ships English only: write all copy in English and add no second language, translation overlay or language switch. Do not invent users, counts, testimonials, legal conclusions, partners, or product claims.
8. Review the diff for duplicate registries/components, hard-coded URLs/counts/accent colors, public DevQuiz copy, nested-card noise, and answer-integrity regressions.
9. Run focused checks, then `npm run check:design` (or `npm run check:public`), `npm run typecheck:api`, `npm run test:launch`, `npm run build`, and `git diff --check`. For visual changes serve the build (`npm run preview --prefix client`), run `npm run check:responsive` and the area's browser spec (`npm run test:browser -- tests/browser/<spec>.spec.ts`).

Update existing authoritative documentation only when a reusable contract changes. Do not add a new UI library, state system, runtime media generator, API handler, or native app.
