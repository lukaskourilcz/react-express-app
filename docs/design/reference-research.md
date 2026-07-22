# Design reference research

Research date: 22 July 2026. References were inspected directly and used for transferable principles, not composition copying.

## Selected Refero references

| Reference | Category and problem | Transferable principle | Deep End adaptation | Do not copy | Accessibility / responsive implication | Candidate surfaces |
|---|---|---|---|---|---|---|
| [Busuu](https://styles.refero.design/style/72b85d0a-1ff8-4dd3-b33a-f55aad6df5c9) | Subject/language discovery | Make category choice a first-class moment; keep one dominant identity color and readable body hierarchy. | Replace flags/characters with subject glyphs, real counts, and field-journal plates; keep ocean ink and restrained accents. | Gradient hero, character illustration, flag-circle carousel, social proof. | Choice cards need visible selection, real button semantics, and a stacked mobile model without hidden carousel content. | `/subjects`, subject home. |
| [Eight Sleep](https://styles.refero.design/style/e4e8fe86-47ed-4ddd-a6c6-2c28eae9aabe) | Quiz/onboarding options | Full-width, stable option rows with limited visual noise improve decision speed. | Use Deep End answer cards, genuine radio semantics, compact metadata and fixed reading width. | Lifestyle photography, lead-capture split, product-specific palette. | Maintain 44px targets, high-contrast selected state, and no answer-position shift. | Quiz setup, active Quiz, Challenge. |
| [Notion](https://styles.refero.design/style/2bf4c61f-de10-4614-ba1b-20c0453bd2a9) | Editorial content and surfaces | Warm canvas + paper surfaces + hairline borders create depth without card theater; one primary action per screen. | Existing paper grain, ocean-ink lines, card-stock edge, and restrained accent fulfil the same role. | Notion composition, illustrations, typography, and exact card blocks. | Border-led hierarchy remains legible in reflow; avoid relying on shadow alone. | Public pages, topic pages, support/legal. |
| [Dub](https://styles.refero.design/style/b0d80806-b724-4ed1-a1d1-074edd3c9bc9) | Dense dashboard and status systems | Use flat border-defined panels, compact rows, one chromatic status per component, and 14–16px operational type. | Apply ocean-ink tables, semantic status tokens and compact density to `/dev` and leaderboards. | SaaS mockups, blue brand system, excessive pills. | Status requires text/icon plus color; desktop table must become readable cards or horizontal tools on mobile. | `/dev`, Leaderboard, Profile. |

## Collect UI inspection

Collect UI's current category and designer pages were inspected directly, including [leaderboard inspiration](https://collectui.com/designs/leaderboard-ui-design-inspiration), [Racine Davis' interaction archive](https://collectui.com/designers/racine), [Jan Losert's dashboard/admin archive](https://collectui.com/designers/JanLosert), and [Goutham's admin panels](https://collectui.com/designers/goutham-aj/admin-panel).

The current site frequently returned empty or sparse category/designer states. Those states were still useful evidence: the layout makes absence explicit, keeps one recovery action, and does not fabricate content. Individual gallery images were not treated as authoritative design systems and were not copied.

| Category | Principle adopted | Pattern rejected | Deep End application |
|---|---|---|---|
| Subject discovery / onboarding | One obvious choice goal; selection and next action are distinct. | Decorative carousel with hidden options or flag-heavy tiles. | Six StudyShark subject cards remain visible and keyboard reachable. |
| Learning paths | Ordered nodes need state labels and a visible next step. | Game-map spectacle or identical tiled connectors. | Varied waves, explicit prerequisites, current/complete/ahead labels. |
| Quiz / timers | Stable vertical choice rhythm; progress and time are separate signals. | Centered novelty cards and shifting feedback. | Anchored answer region with overlay feedback and threshold-only announcements. |
| Multiplayer / classroom | Host and join are separate jobs; room code is the primary share artifact. | Fake activity dashboards and ornamental charts. | Authentic room ticket, QR, connection status, labelled distribution. |
| Profile / leaderboard | Put identity, rank, evidence, and next action in one scan path. | Trophy overload, podium spectacle, decorative metrics. | Calm rank discs, subject scope, contextual empty state. |
| Flashcards | Reveal should be obvious and reversible; empty state should lead to collection. | 3D card flipping and gesture-only interaction. | Press-to-reveal button with text state, remove action, Quiz CTA. |
| Public education | Editorial intro followed by a concrete practice bridge. | Generic benefits grids, testimonials, partner walls. | Authored topic/context copy, real paths, real question counts. |
| Admin | Dense navigation, filters, explicit statuses, compact rows. | Marketing-scale whitespace, bright decorative cards, ambiguous icon-only actions. | Product-related but operational `/dev` control room. |

## Research outcome

The adopted pattern is not a gallery aesthetic. It is a set of operating rules: one primary decision, border-led hierarchy, stable answer geometry, explicit progress/status, real-data imagery, honest empty states, and subject recognition through content and diagrammatic marks. Deep End supplies the distinctive expression through ocean ink, paper, waterlines, fins, glyphs, and disciplined subject accents.

