# Deep End design system

The runtime source of truth is `client/src/styles/astryx-theme.css`, layered over Astryx. `DESIGN_RULES.md` is the behavioral contract.

## Apple layer

`client/src/main.tsx` sets `data-design="apple"` on `<html>` before the first paint. No code removes or changes it, so every page renders with the layer. Its rules sit under `:root[data-design='apple']`:

- Tokens (`client/src/styles/astryx-theme.css`): the system font stack for body and headings, neutral text and surface colours through `light-dark()`, larger radii (`--radius-page` 2rem, `--radius-container` 1.5rem, `--radius-element` .85rem, `--radius-inner` .65rem), larger display and title sizes, a 100ms feedback duration and two-layer shadows. Dark mode keeps the Deep End blue-green background.
- Chrome (`client/src/styles/app-shell.css`): a floating, rounded, translucent header with backdrop blur; pill-shaped nav links at least 44px tall, with an accent ring on the active link; a translucent drawer panel with a rounded outer edge; translucent dialogs over a darker backdrop.
- Surfaces and controls: panels and raised cards take a 1px border in place of the 2px paper edge, buttons become pills, inputs and selects take .85rem corners, and radio cards sit on the muted background. Buttons, nav links, radio cards and strip tiles scale to 97% while pressed.
- Home: wider hero spacing, a two-column hero from 1024px, tighter heading tracking and a three-column stat row.
- User preferences: reduced motion drops the press scale, reduced transparency swaps the blurred materials for solid surfaces, and `prefers-contrast: more` gives the header, drawer, dialogs, panels and radio cards a solid surface with a text-coloured border.

The accent, status colours and brand geometry still come from their own sources. The production CSS purge keeps `data-design` selectors, and the build fails if the `:root[data-design='apple']` token block goes missing (`client/vite.config.ts`).

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
- Pill shape (`border-radius: 999px`) only for buttons (`.astryx-button`, `.ss-fin-button`, `.ss-link-button`), the header nav links (`.ss-navlink`), tags (`.ss-tag`), compact filters such as the topic pills (`.ss-topic-pill`), small inline toggles (glossary terms, figure buttons) and compact segmented controls. Cards, panels, inputs, selects, radio cards, drawer links and dialogs use the radius tokens above.
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
- Validate at 400% reflow, 360px width and both themes.

## Content rules

- All reusable UI copy uses translation keys in `client/src/i18n/translations.ts`, or in the chunk files beside it (`translations.learn.ts`, `translations.paths.ts`, `translations.privacy.ts` and the rest) that only their routes load.
- devShark ships English only: write all copy in English and add no second language, translation overlay or language switch.
- Public facts come from registries/content, not repeated literals.
- Curated explanations are authoritative. devShark ships no AI feature.
- Never generate product screens, scores, users, testimonials or factual teaching diagrams.

