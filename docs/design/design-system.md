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

## Question screens

Every question screen draws through the shared parts in `client/src/components/question/` (UX audit U2, #574), imported from its `index.ts`. Their sizes are tokens on `:root` in `client/src/components/question/question.css`, and their words are `question.*` keys in `client/src/i18n/translations.question.ts` (`questionText`), not in `astryx-theme.css` and `translations.ts`: only the question screens' lazy chunks load them, so the app shell carries none (`client/tests/question-copy.test.ts`). A runner's own words (`quiz.*`, `challenge.*`) stay where they are.

| Token | Value | Used by |
|---|---|---|
| `--ss-question-block-min` | 200px | The question block's reserved height, so the answers start at one y on every question. |
| `--ss-question-block-max` | 40vh | Past this the question block scrolls inside itself. |
| `--ss-answer-row-min` | 48px | One answer row. |
| `--ss-answer-gap` | 8px | The gap between answer rows. |
| `--ss-answer-chip` | 26px | The number chip at the start of a row. |
| `--ss-question-title-size` | 1.25rem | The run's `h1` in the QuestionHeader. |
| `--ss-question-tags-min` | 56px | Under 560px, the QuestionHeader's second row when it holds a tag and the difficulty badge: two lines of tags, so a long topic name that wraps beside the icon buttons does not move the answers. |

**QuestionShell** (`QuestionShell.tsx`). The `--ss-width-task` (640px) column, centred, with one `.ss-panel` surface (24px padding, 16px under 560px, `--radius-container`, no accent edge) and the actions 16px under it. Props: `header` (a QuestionHeader), `question` (the text, code and notes), `questionId` (the block's id, which names the answer list), `children` (the answer list, hint and feedback, under the block), `actions` (a QuestionActions row), `notice` (an error banner above the panel), `stable` (default `true`: the block keeps `--ss-question-block-min` and scrolls past `--ss-question-block-max`; `false` for one question on its own page), `focusable` (default `true`: the block takes `tabIndex -1`), `className`, `labelledBy`. The forwarded ref is the question block, for moving focus to it when a run starts or moves on. A runner sets no width, card or `flex: 1` of its own: the shell is top-anchored and as tall as its content.

**AnswerOptionList** (`AnswerOptionList.tsx`). The one answer list: a `RadioCardGroup` (vertical, so Left/Right stay free for moving between questions) of `RadioCard` rows, `--ss-answer-row-min` tall and `--ss-answer-gap` apart, each with a `--ss-answer-chip` number chip (`--radius-inner`) and body text that turns semibold when selected. The selection is `var(--brand-accent)` with `var(--brand-accent-soft)`, never a track colour. Props: `options` (strings, also each row's accessible name), `value`, `onChange(index)`, `onActivate(index)` (a click or Enter/Space, not arrow browsing, for a runner where a press commits at once), `labelledBy` (the question block's id), `disabled`, `grade` (`{ correct, picked }`), `renderOption(option, index)`, `className`. Graded, the right answer takes the success tone, a check and "Correct answer" (`question.correctAnswer`), and a wrong pick the error tone (`RadioCard tone="error"`), a cross and "Your pick" (`question.yourPick`). The glyph is drawn in a 20px slot every row keeps at its end (`padding-inline-end`), graded or not, and the words are visually hidden (`.ss-answer-option__mark-text`): beside the text they rewrapped a 44–62 character answer at 590px and a short one at 320px, which moved the rows below at the moment of grading. The wrong pick has its number chip filled in `--ss-error-text` under `--ss-on-error-text` (6.47:1 light, about 11:1 dark) so the pick does not keep the selection green on a red row; both words are in the row's accessible name. Rows never move or grow when graded or selected: only the tone, the chip and the glyph change, and each row's text cell holds a hidden semibold copy of its words (`data-reserve`, drawn by `::after` in the same grid cell), so a line that wraps once it turns semibold already has its height. Number keys are the runner's own (a digit selects in Quiz and Challenge and grades in Learn), so the list does not bind them.

**QuestionActions** (`QuestionActions.tsx`). The one action row, 16px under the panel (the shell's gap), every control 44px. Props: `primary` (`{ label, onClick, disabled, unavailable, describedBy }`, drawn as the screen's one `SwimCta` md on the right), `secondary` (Astryx `secondary` or `ghost` buttons on the left: Previous, Share, Review answers), `focusPrimary` (when it turns true, focus moves to the primary, as after grading; the page scrolls only as far as the button needs, never centring it, and then back up if that took the shell's answer list off the top, so the pick and the right answer stay in sight with the verdict; the list's `scroll-margin-top: 6rem` keeps it clear of the site header), `label` (names the row as a group), `className`. Under 560px the primary is the last row at full width, in the thumb zone, and the secondaries share a two-column row above it. `unavailable` keeps the primary focusable with `aria-disabled` and a reason in `describedBy`; `disabled` is for busy.

**QuestionHeader** (`QuestionHeader.tsx`). The first thing inside the panel. Row 1: the run's `h1` at `--ss-question-title-size` (1.25rem/700) and the `WaterlineProgress` on the left, run status (timer, fins, hearts) on the right. Row 2, drawn only when it has content: tags (the `CategoryTag`, a level pill) and the difficulty badge on the left, icon buttons (hint, report, exit) on the right. Props: `title` (the h1's own words, "Question 3 of 10"), `run` (the run's name before it, muted, "Quiz · "), `titleRef` (makes the h1 a focus target), `progress` (`{ value, label }`), `status`, `meta`, `difficulty` (1–5, one neutral badge, `question.difficultyLevel`), `tools`. The h1 is the counter, so no visually hidden legend repeats it. Icon buttons are `QuestionIconButton` (`label`, `icon`, `onClick`, `pressed` for a toggle, `tooltip`): 44×44 with a 20px stroke glyph (`HintIcon`, `ReportFlagIcon`, `ExitIcon`), an `aria-label` and an Astryx tooltip; its ref reaches the native button, so a Popover can hang from it. Every runner shows the difficulty badge when its question has one, and every runner can report.

**QuestionHint** (`QuestionHint.tsx`). The one keyboard hint, directly under the answer list: "Press 1–{max} to {verb} · Enter to {next}" (`question.keysHint`), or "Press 1–{max} to {verb}" when Enter does nothing (`question.keysHintShort`). Props: `max`, `verb` (`'select'` where a digit only picks, as in Quiz and Challenge; `'answer'` where it grades at once, as in Learn), `next` (`'continue'` or `'submit'`, what Enter does now), `hidden`. Its line is reserved in every state: `hidden` keeps the height and hides the words (after grading, say), so nothing moves. It is drawn only on a desktop with a fine pointer; a coarse pointer or a layout under 600px has no such keys, and there the line is not drawn on any question. A runner without number keys shows no hint.

**QuestionFeedback** (`QuestionFeedback.tsx`). The graded verdict: an Astryx `Banner` (`status` success, error or info; `title` the verdict in words; `description` the explanation) in normal flow directly under the answer list and the hint, inside the panel, never positioned over the answers and with no shadow of its own. `children` sit under the verdict (Save as Shark Card). It takes focus when it appears (`autoFocus`, default `true`), so a screen reader reads it; pass `autoFocus={false}` when the runner moves focus to its Continue with `QuestionActions focusPrimary`. The ref is the feedback block. The answers do not move, because content is only added below them; a long explanation scrolls the page.

**QuestionPageHeader** (`QuestionPageHeader.tsx`). The editorial header of a question area's setup or info screen (Quiz setup, Challenge setup, Shark Cards): the `Page` header markup (`.ss-info-page__header`: fin, kicker line drawn even when empty, `h1` at `--ss-type-title`, one lead line), so these screens share one h1 size and position with every `Page`. Props: `kicker`, `title`, `lead`, `titleRef`. A live run has no editorial header: its `h1` is the QuestionHeader's. /daily draws the same markup without the fin through `DailyHeader` (`DailyStaticArticle.tsx`), which the build's static body renders too, so the swap to the running page does not move it; its kicker is the day (a `<time>`). /today's h1 shares its row with the day's count (`.today-heading`), with the progress bar and the day-change note under it.

A run's composition, top to bottom: `QuestionShell` › `QuestionHeader` › question block › `AnswerOptionList` › `QuestionHint` › `QuestionFeedback` (once graded), then `QuestionActions` under the panel. Quiz (`client/src/components/Quiz.tsx`) is the reference.

The runners on it:

- **Challenge** (`Challenge.tsx`, `Challenge.css`). The run's `h1` is "Biggest Shark Challenge"; its status is the score, the clock (`.challenge-run__clock`, the error colour under 15 seconds) and the fins, and the first header row wraps on a narrow phone so the h1 keeps whole words. No countdown bar: the clock says the time. Report and Exit are the header's tools; Exit asks first and leaves the run unsaved, as leaving the page does. A live run hides the site chrome (`onActiveChange`, as the Quiz). Submit, then Next question, See result or Retry, is the one primary; the verdict takes the focus, and Enter on it goes on. The setup is the Quiz setup's layout (`.challenge-setup`): the `--ss-width-task` column, QuestionPageHeader, one panel with the topic pills, a Select all / Deselect all link and Start, then up to five top scores under the panel. The game over and error screens use the same column (`.challenge-end`); the game over ends on `QuestionActions` with Play again as the one SwimCta md and Back as the secondary.
- **Daily** (`DailyQuestionPage.tsx`). `QuestionShell` with `stable={false}`; the page is the `--ss-width-task` column (`.ss-daily`), so the header, the question and its states share both edges. The header slot holds the tag and difficulty only (the page's h1 is above). No QuestionHint: Daily has no number keys. The primary is Check answer, then Practice (it navigates to the Quiz on the day's track), with Share as the secondary; the share status under the row takes no space while it is empty.

**The Learn runner and the skill check** (`client/src/components/learn/LessonRunner.tsx`, `SkillCheckRunner` in `client/src/components/Roadmap.tsx`) follow the same composition. A level's `h1` is "Level 1 · Values & Math" (a checkpoint's "Checkpoint · …"), its progress the waterline, its status the heart meter (a checkpoint's score), and its second row "Question 3 of 8" with report and exit. A press on an answer grades at once, so the hint says "answer" (`verb="answer"`) and there is no primary until the verdict is in. While a question is on screen the level reports `onActiveChange(true)` (through `Roadmap` and `BigOIntroduction`), so the site header and footer step aside as for a Quiz or Challenge run; the intro, the results and the coding phase keep them. Then Continue, Finish, See the result or Try again is the one `SwimCta` and takes focus (`focusPrimary`). Each new screen of a level (the intro, a question, a result) takes focus on its `h1` or question block without the browser's own scroll and, when its top is out of sight (the page scrolled to reach Continue under a long verdict), opens at its top under the site header (`.ss-question` has `scroll-margin-top: 6rem`). The intro ("Before you start", with exit only) and the results (`LessonResult`: the outcome as the `h1`, then one primary, with Try again as a secondary and Back to path as a ghost) render inside `QuestionShell` with `stable={false}`; their own rules live in `client/src/components/learn/LessonRunner.css`. The skill check names its round in the `h1` ("Find your level · Round 1 of 4"), keeps the stepping banner inside the question block so the answers keep their y, and draws "I don't know yet" under the list at one answer row's height with a dashed border.

**The Shark Cards deck** (`client/src/components/Flashcards.tsx`, `SharkCards.css`) takes the parts that fit a card. It keeps the route's 800px column instead of the 640px shell, so on `/collection` the page header, the tabs and the card share one left edge (social-account-05). On `/cards` its header is `QuestionPageHeader` with no kicker and one lead line. The card's meta row holds the topic and "Card 1 of 4" (the deck's live region and its name); no side label repeats "Question". The card has no height floor: the question keeps three lines (`min-height: calc(3 * 1.55em)`), so a short question leaves the turn button and the action row at one y. Under it is one `QuestionActions` row with Previous and Next together on the left. One filled primary per side: face down it is the card's "Show the answer" (accent fill), and Got it is an Astryx secondary at the primary's place (the right end, or the full-width last row under 560px); turned, Got it is the `SwimCta` and "Hide the answer" is a quiet outline (questions-14, social-account-19).

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
- Learn section page (`client/src/components/Roadmap.tsx`, `components/learn/*`, UX audit U4): one header in every auth state, the Learn `<Kicker as="h1">` ('Learn'), then the section switcher, the one place the section is named, then one supporting line, the section line, with the section's one action on its right from 768px (`.rm-section-header`, a `1fr auto` grid; stacked below) and a visitor's device-only note as the small status under both. Nothing under the switcher repeats the section's name: the actions say 'Sign in to add it to your plan' and 'Add it to your plan', and the path card is titled 'Guided path' or 'Guided path outline', with the path's name in its link's accessible name. Under 640px the switcher is a vertical list of full-width 44px rows, name left and percent right (each item keeps 'Web Developer · 8%' as its accessible name; Up and Down move as Left and Right do). The topic rail is `repeat(auto-fill, minmax(148px, 1fr))`, five tiles a row at 800px and two on a phone, and a locked tile carries one lock signal: the lock glyph on its second line, beside a sentence-case 'Premium' only where Premium opens it, with 'Locked' in its accessible name and no dashed edge or fade. How many topics are still locked, and how to open them, is said once, in the skill-check row beside the skill check (`LockedNote`). The next-step card is one 72px row: the fin, the next level ('Level 1 of 25 · Values & Math') with the topic's 4px bar under it at the text's width, and the `SwimCta` 'Continue' (on a phone, a full-width row of its own); when Premium opens that level the line reads '<Topic> is part of Premium' (or 'From level 13, React is part of Premium' where the topic's first levels are free) and the button 'See Premium'. Premium is said once per topic, on its tile and in that card: the map's Premium nodes keep the lock, the dashed edge and 'Premium' in their accessible name, and draw no label. A section with nothing open is not a `StatePanel`: it sits in the column on its left edge with no card, an `h2`, one line and one action row ('Go to <topic>' as the `SwimCta`, 'Take the skill check' as a 44px secondary), and the separate skill-check row is not drawn in that state. A signed-in learner's join ('Add it to your plan', 'Start the FDE path') is the `SwimCta` md; while the header offers it, it is the screen's one primary, so 'Go to' and the next-step card's 'Continue' or 'See Premium' (a topic the section shares with the learner's plan stays open in it) are 44px secondaries.
- Secondary path: a short form that is not the page's task (the voucher on `/premium` while checkout is on) is one row without a card: its `h2` on the left, the field (at most 320px) and a secondary button beside it, stacking below 600px. It keeps its card only while it is the page's way in.
- Settings row: one row per account action, its `h3` title and a one-line description on the left and its 44px button on the right, with a hairline between rows, stacking below 600px (`.de-setting-row`, the Profile's Account card). The row title names what the action reaches ('All devices'), never the button's own words.
- Profile cards: every card on the Profile overview is `.ss-panel` with 24px padding, a `<Kicker as="h2">` and the plain surface; no `.ss-raised` around an Astryx Card, no muted override. The learning column (Career, Track and sections, the GitHub garden) is on the left and the right column holds the study advisor, saved questions, 'Your name' and Account, so both end within about 20px of each other at 1280 (with the advisor on the left the right column ended 411px short). The identity banner carries the name and the plan on one row (on a phone the plan name and its summary run on as one text of at most two lines); appearance and sound stay in the footer. The two streak tiles stay side by side down to 320px.
- Name panel: every name a learner shows is set in one 'Your name' panel (`SharknameCard`): the sharkname field with Generate and Save on one row (the field alone above the two buttons below 600px), then 'Friends see' and 'Leaderboards show' side by side when the panel itself is at least 400px wide inside its padding (a container query on `.sn-card`, since the panel sits in one of the Profile's two columns), stacked otherwise and below 600px of viewport. Each column has the same Sharkname / Account name choice and its own photo switch with a 44px hit area, and saves its own setting, so the two stay independent. The field shows the sharkname (a numbered one ends in its number after the field); no option, plate or hint repeats it.
- Disclosure inside a card: a native `<details>` with a 44px `summary` (`.de-disclosure`) holds detail a card needs only on request, such as the GitHub garden's 'How it works'.
- Section disclosure: a summary a learner needs only on request, below the content it sums up, is one native `<details>` with a 56px `summary` that holds the section's `h2` and its count ('Competency evidence · 12 areas'), between hairlines, closed by default (`.lp-disclosure`). Each row inside is its own 56px `<details>`: title and a one-line summary on the left (the whole line once open), one labelled count on the right ('0 of 24 verified', plus self-reviewed work when there is any), the list behind it. Rows with nothing to list are left out. The FDE path page uses it (UX audit learn-11).
- Learning-path pages (`components/paths/`, UX audit U4): the path and module headers stack in every state, the text over one left-aligned action row with `SwimCta` md as the one primary (a guest on an open path gets 'Sign in to start'). A module page's primary opens the first activity that is neither passed nor self-reviewed ('Start module', then 'Continue: <title>' cut at 32 characters) and steps aside while an activity is open; the module's state is a small badge beside the kicker, and the next row has a 3px accent edge. An activity row shows a recorded state as one glyph beside its minutes (words for a screen reader) and nothing while it is not started; on the path page a row is one 48px line (kind, title, minutes), and a title's prefix that repeats the kind column ('Read:') is dropped at render time, never in the reviewed content. The delivery loop counts each phase as '0 / 3' under its one-line title, in columns of at least 140px.
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

