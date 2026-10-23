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

## Page widths

Four tokens in `client/src/styles/astryx-theme.css` (UX audit U1, #573). The route shell in `client/src/App.tsx` picks one route width per route from the one map in `client/src/components/ui/pageWidth.ts` (`routePageWidth`) and caps the page column with it. A page never sets its own page `max-width`: it fills the column and sizes only what sits inside it.

| Token | Width | Used by |
|---|---|---|
| `--ss-width-task` | 640px | The task column inside a page: question screens, and the auth (`.ss-auth-page`), billing (`.ss-billing-card`) and checkout (`.ss-checkout-card`) cards. Never a route width. |
| `--ss-width-narrow` | 800px | The route default: every route not listed below, including all `Page` screens (404, auth, `/premium` and its steps, `/privacy`, `/terms`, `/classroom`), `/shop`, `/collection`, `/leaderboard`, Learn and the question screens. |
| `--ss-width-standard` | 1000px | Two-column pages: home (`/`), `/profile`, `/play` and `/play/:code`. |
| `--ss-width-wide` | 1200px | Operational screens: `/coding` and `/coding/*`, and a Learn or FDE coding phase while its editor is mounted. |
| `--ss-width-chrome` | 1168px | The floating header and the footer. Both keep this box on every route, so neither moves when the route width changes. |

`/dev` is uncapped. A part that needs more room while it is mounted calls `usePageWidthRequest('wide')` (same module); the shell takes the widest request until the part unmounts or passes `null`. A request never narrows a route. To give a new route a width, add it to `routePageWidth` and its test (`client/tests/page-width.test.tsx`); do not write a `max-width` on the page.

The shared `Page` layout (`PublicInfoPages.tsx`, `.ss-info-page`) fills the column, so every `Page` h1 starts at the same x. Its kicker line is always drawn (empty and `aria-hidden` when a page passes no kicker), so the h1 also sits at one y.

## Control heights

Two tokens, and one floor in `client/src/styles/app-shell.css`:

| Size | Token | Height | Used for |
|---|---|---|---|
| Default | `--ss-control-height` | 44px | Every page action and form control, on every pointer: `.astryx-button`, `.astryx-segmented-control-item`, `.astryx-text-input` and its input. |
| Compact | `--ss-control-height-compact` | 36px | Only controls inside an element with class `ss-compact` (a component's own toolbar: the coding action bar, a runner's icon row), on a fine pointer, each with a 44px hit area drawn by `::before`. On a coarse pointer they stay 44px. |

The floor is a `min-height`/`min-width` with `!important`, because Astryx's StyleX rules cannot be reached by a class selector otherwise; it is the only place that does this. Do not size buttons page by page, and do not pass `size="sm"` to make a page action smaller: the floor lifts it anyway. The footer's appearance and sound toggles are the compact size, as pills, with the same hit area.

**Page actions.** A page action is 44px with 20px inline padding and 16px/600 text on a pill. `.ss-action` applies that type through Astryx's own variables (`--spacing-3`, `--text-label-size`, `--font-weight-medium`). Every button in `.ss-info-actions` and `.ss-auth__actions` gets it without a class; elsewhere pass `className="ss-action"`. A small in-row utility, such as a Retry inside a note, does not take it.

**One primary per screen.** `SwimCta` (md, 44px) is the single filled primary on a screen; every other action is an Astryx secondary or ghost at 44px. Icon-only buttons are 44×44 with a 20px glyph (the header's Leaderboard, Premium and Coins; a dialog's close keeps its 16px glyph in a 44px button).

## Layout and density

- Mobile gutter: 16px; tablet: 24px; desktop: 24–32px.
- Page widths: the four tokens above, one per route, chosen by the shell.
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
- Destructive confirmation: `BrandedConfirmDialog` (Astryx `AlertDialog`) with a product-specific title, body, cancel and confirm; the Astryx dialog owns focus and restoration. It runs the confirmed action once, even when a second press lands before it re-renders. Removing a friend and deleting an account ask through it. Reset in the coding workbench and in a path's code activity asks in an inline `role="alertdialog"` note under the action bar instead; keeping the code returns focus to Reset, and in a path activity a confirmed Reset does too.

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

