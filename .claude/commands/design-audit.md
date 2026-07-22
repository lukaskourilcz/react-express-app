---
description: Audit one route or workflow against Shark product rules and Deep End v2, then record evidence-based decisions.
argument-hint: <route-or-workflow> [--document]
allowed-tools: Read, Grep, Glob, Bash, Edit
---

Audit `$ARGUMENTS` as a real StudyShark/devShark surface.

1. Read `git status --short` and `git diff`; do not modify or stage unrelated work.
2. Resolve the route in `client/src/App.tsx`, then read the complete rendered component, its CSS, hooks/API helpers, and both EN/CS translation entries.
3. Read `docs/product-architecture.md`, `DESIGN_RULES.md`, `docs/design/product-ux-audit.md`, `docs/design/design-system.md`, `client/product-catalog.ts`, and `shared/subject-catalog.ts` as applicable.
4. Search `client/src/components/ui/`, `client/src/components/landing/`, and sibling screens for reusable patterns before identifying anything new.
5. State the user, primary goal/action, product applicability, auth and subject sensitivity. Walk loading, empty, error, offline/reconnect, signed-out/permission, disabled, success, destructive, long EN/CS, and narrow-screen states.
6. Review hierarchy, density, next-action clarity, copy, keyboard/focus/semantics, touch targets, reduced motion, light/dark contrast, fixed-shell clearance, and the 360/390/430/768/1024/1280/1440 transformations.
7. Trace data-affecting interactions to their existing `api/` handler. Flag any recommendation that could threaten answer secrecy, verified scoring, product/subject scope, or the exact 12-handler budget.
8. Produce a prioritized report with strengths, verified defects (`path:line`), reuse targets, smallest file-level corrections, and a concrete validation matrix. Separate facts from assumptions.
9. If `--document` is present, update the relevant existing section in `docs/design/product-ux-audit.md`; do not create a second audit source. Run `git diff --check` after the documentation edit.

Do not invent metrics or imagery, recommend another registry/library, place `webdev` in StudyShark, or treat a static review as a rendered browser check.
