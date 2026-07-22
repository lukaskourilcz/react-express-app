# Deep End design system

The runtime source of truth is `client/src/styles/astryx-theme.css`, layered over Astryx. `DESIGN_RULES.md` is the behavioral contract.

## Semantic layers

- Canvas: body, elevated, surface, muted.
- Text: primary, secondary, disabled, on-accent.
- Structure: border, strong border, card line, tactile card edge.
- Interaction: focus, hover, selected, disabled.
- Feedback: success, warning, error, info, each with strong and soft variants where needed.
- Brand: accent, accent-soft, accent-contrast, waterline, grain, wave.
- Depth: low/medium/high elevation, overlay scrim.

Do not use a semantic name that is not defined. Do not move unique, factual visualization colors into the subject accent system.

## Typography roles

| Role | Intent |
|---|---|
| Display hero | Public positioning only; compact line length. |
| Page title | One `h1` per route. |
| Section / card title | Scannable editorial hierarchy. |
| Question / answer | High-legibility body scale; stable wrapping. |
| Body / compact body | Reading and operational density. |
| Metadata / kicker / label | Short context; not long copy. |
| Numeric score | Tabular or stable-width numerals where possible. |
| Code | Monospace, labelled language, horizontal scroll. |

## Layout and density

- Mobile gutter: 16px; tablet: 24px; desktop: 24–32px.
- Narrow task width: ~560–800px; standard content: 1000px; wide/operational: 1200px.
- Page sections: 32–64px according to public vs operational context.
- Preserve fixed header, internal main scroll, persistent waterline, and at least 44px bottom-ocean clearance.
- Quiz answers remain in a stable region; long question/answer content scrolls without moving actions unpredictably.

## Shapes and surfaces

- Page features: `--radius-page`.
- Panels/cards: `--radius-container`.
- Controls: `--radius-element`.
- Inner tiles: `--radius-inner`.
- Pills only for tags, compact filters, and genuinely compact binary/segmented controls.
- Default content hierarchy is canvas → one panel → rows. Avoid panel-inside-card-inside-card.

## Shared component patterns

- Editorial header: kicker, `h1`, concise supporting text, optional single action.
- Operational header: `h1`, scope/status, compact actions.
- Panel: `.ss-panel`; clickable lift only with `.ss-lift`; read-only raised card with `.ss-raised`.
- Choice: `RadioCardGroup`/`RadioCard` or `CheckCard`, not checkbox-emitting cards for radio jobs.
- Feedback: shared semantic tokens plus text/icon, never color alone.
- Empty/error/loading: one cause, one next action, stable layout.
- Destructive confirmation: product-localized title, body, cancel and confirm; focus and restoration owned by Astryx dialog.

## Motion

- Route fade: ~140ms, no exit blank.
- Selection/button response: 120–180ms.
- Fin reveal: opacity only; base stays on the waterline.
- Swim-through: reserved CTA translation.
- Success: brief, no answer reflow.
- All non-essential motion respects `prefers-reduced-motion: reduce`.
- Dense admin surfaces do not use decorative animation.

## Accessibility

- Visible, theme-safe focus on links, buttons, cards, inputs, dialogs, tables and editors.
- Real heading/landmark structure and one route `h1`.
- Radio groups use roving focus and Arrow/Home/End behavior.
- Status uses text/icon plus semantic color.
- Timers announce only meaningful thresholds.
- Dialog/drawer focus traps, Escape, close button and restoration are mandatory.
- Validate at 400% reflow, 360px width, both themes and both locales.

## Content rules

- All reusable UI copy uses EN/CS translation keys.
- Public facts come from registries/content, not repeated literals.
- Curated explanations are authoritative; AI is labelled additional and post-answer.
- Never generate product screens, scores, users, testimonials or factual teaching diagrams.

