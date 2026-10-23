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

Five tokens in `client/src/styles/astryx-theme.css` (UX audit U1, #573): four page widths and the chrome box. The route shell in `client/src/App.tsx` picks one route width per route from the one map in `client/src/components/ui/pageWidth.ts` (`pageMaxWidth`), writes it to `--ss-page-width`, and the keyed route box (`.ss-route`) takes it as its `max-width`. A page never sets its own page `max-width`: it fills the column and sizes only what sits inside it.

| Token | Width | Used by |
|---|---|---|
| `--ss-width-task` | 640px | The task column inside a page: question screens, and the auth (`.ss-auth-page`), billing (`.ss-billing-card`) and checkout (`.ss-checkout-card`) cards; the `Page` lead above one of these cards wraps at the same width (`text-wrap: pretty`), so header and card share both edges. Never a route width. |
| `--ss-width-narrow` | 800px | The route default: every route not listed below, including all `Page` screens (404, auth, `/premium` and its steps, `/privacy`, `/terms`, `/classroom`), `/shop`, `/collection`, `/leaderboard`, Learn and the question screens. |
| `--ss-width-standard` | 1000px | Two-column pages: home (`/`), `/profile`, `/play` and `/play/:code`. |
| `--ss-width-wide` | 1200px | Operational screens: `/coding` and `/coding/*`, and a Learn or FDE coding phase while its editor is mounted. |
| `--ss-width-chrome` | 1168px | The floating header and the footer. Both keep this box on every route, so neither moves when the route width changes. |

`/dev` is uncapped. A part that needs the wide page while it is mounted (a Learn or FDE coding phase) puts the class `ss-wide-page` on its root: `.ss-route:has(.ss-wide-page)` widens the route box to `--ss-width-wide` for as long as the part is there, with no state and no extra render. To give a new route a width, add it to the map and its test (`client/tests/page-width.test.tsx`); do not write a `max-width` on the page.

What used to set its own width and now fills the column: `/shop` (was 1080px), the Leaderboard `.lb` (was 1200px, or 1000px only once another page had loaded `DeepEndScreens.css`), `.cd-page` (was 1200px; it is the coding pages and `/collection`), the shared `.de-page` (was 1000px), `/profile` (an inline 1000px) and the Shark Card deck `.sc-deck` (was 720px, and 800px on `/cards` only), so a page's header, controls and content share one left edge. Inside a page, the Play lobby (`/play/:code`), Play's sign-in and error gates and the Shark Card states without cards (sign in, empty, error; `.sc-state`) are the `--ss-width-task` column. `client/tests/page-own-width.test.ts` pins these. A component may cap its own text measure (`max-width: 68ch` on a paragraph), never the page.

The shared `Page` layout (`PublicInfoPages.tsx`, `.ss-info-page`) fills the column, so every `Page` h1 starts at the same x. Its kicker line is always drawn (empty and `aria-hidden` when a page passes no kicker), so the h1 also sits at one y.

## Control heights

Two tokens, and one floor in `client/src/styles/app-shell.css`:

| Size | Token | Height | Used for |
|---|---|---|---|
| Default | `--ss-control-height` | 44px | Every page action and form control, on every pointer: `.astryx-button`, `.astryx-segmented-control-item`, `.astryx-text-input` and its input. |
| Compact | `--ss-control-height-compact` | 36px | Only controls inside an element with class `ss-compact` (a component's own toolbar, such as the coding action bar), on a fine pointer, each with a 44px hit area drawn by `::before`. On a coarse pointer they stay 44px. |

The floor is a `min-height`/`min-width` with `!important`, because Astryx's StyleX rules cannot be reached by a class selector otherwise; it is the only place that does this. Do not size buttons page by page, and do not pass `size="sm"` to make a page action smaller: the floor lifts it anyway. The footer's appearance and sound toggles are the compact size, as pills, with the same hit area.

**Hit areas for app-drawn controls.** A control that is not an Astryx one and keeps a smaller look takes a 44px press all the same: a transparent, `aria-hidden` layer inside the control, positioned absolutely and reaching past its edges by half the difference (`calc((100% - var(--ss-control-height)) / 2)`), so a press on it is a press on the control. The career roadmap's 31px part cells do this (`.rm-part-pill__hit` in `RoadmapTree.tsx`). Do not grow the visual for this, and do not leave the target at the visual's size on a mouse. A control whose size is its look is drawn at 44px or more: the Learn map's levels are 44px (50px when current) and its part tests 52px. The lesson runner's close and flag buttons are full 44px icon buttons, not compact ones: close is the only way out of a level.

**Page actions.** A page action is 44px with 20px inline padding and 16px/600 text on a pill. `.ss-action` applies that type through Astryx's own variables (`--spacing-3`, `--text-label-size`, `--font-weight-medium`). Every button in `.ss-info-actions` and `.ss-auth__actions` gets it without a class; elsewhere pass `className="ss-action"`. A small in-row utility, such as a Retry inside a note, does not take it.

**One primary per screen.** `SwimCta` (md, 44px) is the single filled primary on a screen; every other action is an Astryx secondary or ghost at 44px. A second task's button may turn primary only once its own input is complete, so it never competes with the page's primary while it cannot act: on `/play`, Create is the `SwimCta` and Join stays secondary until the code field holds a whole six-character code. A row of buttons that switches the view is not an action and is never filled: on `/collection` the open shelf's tab is secondary with `aria-current="page"` and the other is ghost, so the shelf's own primary (the gate's Sign in, the empty shelf's Take a quiz) stays the only filled button.

**Card actions.** Every action in a card is the default size (no `size="sm"`), so a card's primary is never smaller than its secondaries: the Profile's GitHub, sharkname, path and account cards all stand at 44px. Only an in-row utility (a Retry inside a banner, a Remove on a list row) stays small.

**Form controls with a label.** A control group (`ToggleButtonGroup`, `SegmentedControl`, a `select`) takes its label above it, never as a suffix after it, and the default size, so one form has one control height. Two short groups may sit side by side from 900px (the question count and time limit on `/play`). A control with more options than one row holds on a phone takes one control instead: the time limit on `/play` is one 44px `.ss-select`, and its 18 topic pills fold below 600px behind one 44px native `<details>` whose summary names the choice ("Topics: all", "Topics: 3 selected"); from 600px the pills stay open (UX audit social-account-13). Icon-only buttons are 44×44 with a 20px glyph (the header's Leaderboard, Premium and Coins; a dialog's close keeps its 16px glyph in a 44px button). Icons that sit side by side share one drawing language: the header's three are stroke icons in the text colour (`TrophyIcon`, the Premium diamond, `CoinsIcon` from `components/ui/icons.tsx`); the filled accent `CoinIcon` stays for the Coins page's balance, where it is large enough to read as a coin.

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
- Pill shape (`border-radius: 999px`) only for buttons (`.astryx-button`, `.ss-fin-button`), the header nav links (`.ss-navlink`), tags (`.ss-tag`), compact filters such as the topic pills (`.ss-topic-pill`), small inline toggles (glossary terms, figure buttons) and compact segmented controls. Cards, panels, inputs, selects, radio cards, drawer links and dialogs use the radius tokens above.
- Default content hierarchy is canvas → one panel → rows. Avoid panel-inside-card-inside-card.

## Shared component patterns

- Editorial header: kicker, `h1`, concise supporting text, optional single action.
- Operational header: `PageHeader` (`client/src/components/ui/PageHeader.tsx`): an optional `<Kicker>`, the route's one `h1` in ink at Astryx `display-3`, and one lead line (at most 68ch), 8px apart, on the column's left edge; a status line that belongs to the header goes in as its child. `/collection`, `/cards` and `/leaderboard` use it (UX audit social-account-11). Leave the kicker out when tabs or the title already say it. The scope sentence is the lead under the `h1`, and the one control row sits right on the table or list it filters (the Leaderboard: period control left, topic filter right, both 44px, then the board). A public page keeps the editorial `Page` header; a state with nothing else to show is a `StatePanel`, not a header.
- Secondary path: a short form that is not the page's task (the voucher on `/premium` while checkout is on) is one row without a card: its `h2` on the left, the field (at most 320px) and a secondary button beside it, stacking below 600px. It keeps its card only while it is the page's way in.
- Settings row: one row per account action, its `h3` title and a one-line description on the left and its 44px button on the right, with a hairline between rows, stacking below 600px (`.de-setting-row`, the Profile's Account card). The row title names what the action reaches ('All devices'), never the button's own words.
- Profile cards: every card on the Profile overview is `.ss-panel` with 24px padding, a `<Kicker as="h2">` and the plain surface; no `.ss-raised` around an Astryx Card, no muted override. The learning column (Career, Track and sections, the GitHub garden) is on the left and the right column holds the study advisor, saved questions, 'Your name' and Account, so both end within about 20px of each other at 1280 (with the advisor on the left the right column ended 411px short). The identity banner carries the name and the plan on one row; appearance and sound stay in the footer.
- Name panel: every name a learner shows is set in one 'Your name' panel (`SharknameCard`): the sharkname field with Generate and Save on one row (the field alone above the two buttons below 600px), then 'Friends see' and 'Leaderboards show' side by side when the panel itself is at least 400px wide inside its padding (a container query on `.sn-card`, since the panel sits in one of the Profile's two columns), stacked otherwise and below 600px of viewport. Each column has the same Sharkname / Account name choice and its own photo switch with a 44px hit area, and saves its own setting, so the two stay independent. The field shows the sharkname (a numbered one ends in its number after the field); no option, plate or hint repeats it.
- Disclosure inside a card: a native `<details>` with a 44px `summary` (`.de-disclosure`) holds detail a card needs only on request, such as the GitHub garden's 'How it works'.
- Panel: `.ss-panel`; clickable lift only with `.ss-lift`; read-only raised card with `.ss-raised`.
- Choice: `RadioCardGroup`/`RadioCard` or `CheckCard`, not checkbox-emitting cards for radio jobs.
- Feedback: shared semantic tokens plus text/icon, never color alone.
- Empty/error/loading: one cause, one next action, stable layout.
- State panel: `StatePanel` (`client/src/components/ui/StatePanel.tsx`) is the one panel for a state with nothing else to show: every sign-in gate, an empty shelf, a callback's progress or failure. It sits centred in the `--ss-width-task` column (the audit asked for 560px; the shared task width is 640px), takes an optional icon and `<Kicker>`, one heading (`level` 1 when it is the page, 2 under a page header), one body line (`live` makes it a polite status for a state that changes in place) and its actions, the one primary first, all at 44px. A sign-in gate's primary says "Sign in", and every button in the action row takes the page-action type without a class. Users: the Shark Cards states on `/cards` and `/collection` (both tabs), the sign-in gate on `/play` and `/play/:code` and Play's "Live games are switched off" state (an h1, since each is the page), and every phase of the GitHub callback `/settings/github`, an operational page, so no display hero or fin; when a failure leaves nothing to retry or reconnect, "Back to profile" is its primary. Do not hand-build another gate card.
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

