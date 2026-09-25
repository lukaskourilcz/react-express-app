# Design Rules — devShark "Deep End v2"

These rules govern every visual change in this codebase. They come from the
`Deep End v2` design handoff (the `.dc.html` references + README). Read them
before touching any component, style file, or brand mark. The design tokens
themselves live in `client/src/styles/astryx-theme.css` (the `--ss-*` custom
properties) — this file is the *behavioural* contract that sits on top of them.

## 1. The fin baseline rule (non-negotiable)

In ANY hover effect that reveals a shark fin — ghost-fin backgrounds,
swim-through fins, fade-in fins — the fin's **visual base must TOUCH the bottom
edge of its container**, never float above it.

The fin glyph (a swept-back fin in a 24-unit box, from `SharkFin.tsx`) has a
straight base on `y=18`, so **25% of the box is empty below the base**. Only the
navigation logo cuts that base into a wave (`wave`), around the same line. To make the base ride the bottom edge, sink the fin downward by
`size × 0.25`:

- a `58px` fin needs `bottom: -15px` (58 × 0.25 ≈ 14.5)
- a `40px` fin needs `bottom: -10px`
- a `20px` fin needs `bottom: -5px`

Fins may be cropped by `overflow: hidden` past the sides or the bottom, but the
base always rides the bottom edge like a waterline. A fin floating in the middle
of a button or card is a bug.

## 2. One accent variable

The whole kit reads a **single** accent variable. Never hard-code the accent's
hex. Fins, waterlines, kickers, selected states, progress and primary CTAs all
read `var(--brand-accent)` (and `var(--brand-accent-soft)` for tints).
`ColorModeContext` writes these from `lib/subjects.ts`:

| Product  | Accent    | Bright (dark) |
|----------|-----------|---------------|
| devShark | `#2d7a2d` | `#4caf50`     |

## 3. Fin reveals — never animate `background-position`

Fin reveals fade in via an `opacity` transition (≈0.35s) on a child element.
**Never** animate `background-position` to "drift" a fin in — it reads as jitter.
Interactive buttons use `generateFinHover` through `FinButton` or `SwimCta`.
Generate once per mounted button: fade, swim, rise, dive, or diagonal entrance;
randomize direction, size, opacity and duration. Animate only an absolutely
positioned decorative child with opacity and transforms. Crop it with
`overflow: hidden`, keep labels above it, and preserve the same variant across
rerenders. Keyboard focus receives the same effect; disabled buttons do not.
Reduced-motion mode shows a static fin without transitions.
Fins never enter from above. Their baseline stays at or below the component's
bottom edge: emergence starts below it, and dives travel diagonally downward.

## 4. The wave-variation rule

App scrollbars keep a stable gutter and a transparent track. Shared delegated
activity handling reveals only the active scroll container's themed thumb,
then hides it after 1.1 seconds idle. WebKit thumbs are 4px; Firefox uses its
native thin width. Scrolling and keyboard navigation also reveal the thumb;
forced-colors mode keeps it visible. Do not add per-component scrollbar rules.

`generateWaterline()` assigns progress waves a stable randomized wavelength,
amplitude, direction, speed and phase. Coding track decoration opts into zero,
one or two fins with varied sizes and separated positions. These decorative
fins sit in the water; the accent fill and numeric label still show real
progress. Quiz and typing progress keep their fin at the progress endpoint.

Every wavy connector gets **its own** amplitude, phase and wavelength — no two
waves in a path are the same tile. A roadmap path, a set of level connectors, a
row of ticks: vary `amp` / `dir` / `wavelength` per segment so the path reads as
living water, not a repeated stamp. (See the `pathLevels` wave generation in
`Home.tsx` for the reference implementation.)

### 4a. The waterline bank

The short decorative underline — the tick under a kicker, the full-width rule,
the line under a review heading — is one 24×6 tile, and it has **eight**
variants rather than one. They share a bounding box, a stroke weight and a
smooth style; only amplitude, phase and crest spacing differ. Variant 1 is the
mark as it has always looked.

- The tiles are `--ss-wave-1` … `--ss-wave-8` in `astryx-theme.css`, each with a
  `.ss-wave-vN` class that sets `--ss-wave` **on that element**. `--ss-wave`
  itself still defaults to variant 1, so anything that has not opted in is
  unchanged and changing the global does not flatten every instance to one wave.
- A variant is chosen per component **instance** by `useWaveVariant()`
  (`client/src/lib/waveBank.ts`), from React's `useId`. That is stable across
  rerenders, interactions and resizes, identical on both sides of hydration, and
  contains no `Math.random`. Siblings get consecutive ids and the selector steps
  by three, so neighbours never match and all eight are used before any repeat.
  Pass a number to pin one for a preview or a test.
- Render a kicker with `<Kicker>` and a rule with `<WaterlineRule>`
  (`components/landing/LandingKit.tsx`). Do not write `className="ss-kicker"`
  by hand: an instance that bypasses the component silently gets variant 1 and
  the repetition comes back.

**What the bank does not touch.** The animated fin waterline
(`WaterlineProgress` in `SharkFin.tsx`) has its own geometry and its own
motion. The roadmap and landing connectors (`pathWave`, `Home.tsx`) already
vary per segment under rule 4 above. The dialog
surface reads `--ss-wave` as a background texture rather than as an underline.
None of the three is part of this bank, and none of them should be routed
through it.

The variants are decoration: no accessible name, no focus target, nothing read
out, and no animation — so the reduced-motion rules in section 5 have nothing
new to cover.

## 5. Motion respects `prefers-reduced-motion`

All motion (fin drifts, swims, bobs, card lifts, pop-ins) must **freeze** under
`prefers-reduced-motion: reduce`, keeping only opacity fades. Follow the
existing convention in `app-shell.css` / `astryx-theme.css`: guard every
`@keyframes`-driven class with a `@media (prefers-reduced-motion: reduce)` block
that sets `animation: none` (and neutralises any hover `transform`).

## 6. Cards don't lift on the fin-school hover

On the topic cards (the "fin schools" hero effect), the card itself does **not**
move — no lift, no tilt. The waterline fading in and the fins gliding across it
carry the entire effect. (`.ss-lift` is a *separate*, opt-in affordance for
plain clickable cards; don't combine it with a fin-school hover.)

## 7. Reuse the brand primitives

- Fin glyph / swimming fin / waterline: `client/src/components/SharkFin.tsx`.
- Kicker + waterline tick: the `<Kicker>` component (`landing/LandingKit.tsx`),
  which applies `.ss-kicker` and one of the eight waves. The rule is
  `<WaterlineRule>` from the same file.
- Card stock (hairline border, 2px bottom edge, one ink shadow): `.ss-panel`
  / `.ss-raised` / `.ss-lift`.
- Topic logos: `CategoryGlyph` in `components/ui/techIcons.tsx` (bundles only
  the devicons it imports — never pull the whole icon set or a CDN URL).
- Paper grain + wave tile: the `--ss-grain` / `--ss-wave` data-URIs.
- New copy becomes new keys in `i18n/translations.ts` (+ `.cs.ts`); never
  hard-code user-visible English in a component.

## 8. Shared loading and motion vocabulary

Extend the existing motion system, not a screen-specific animation library.
Durations live in `astryx-theme.css`: `--ss-motion-feedback` (160ms),
`--ss-motion-reveal` (350ms), `--ss-motion-ambient` (2400ms), and the two
directional `--ss-motion-swim-*` tokens. Ambient keyframes live once in
`app-shell.css`; components must not inject duplicate style tags.

- Page/data loading uses `LoadingScreen`: branded swimming fin, visible
  translated status, one polite live region. `QuoteLoader` is the study-mode
  variation using the same fin. Never invent an unlabelled spinner or fake
  percentage for an unknown duration.
- In-place mutations keep their control visible, disable duplicate actions,
  and use a translated action/status label. Do not replace a whole editor
  with a page loader during submission or draft saving.
- Use `SwimCta` for prominent actions outside the homepage too (coding Submit,
  evolving Continue, collection practice). Use `FadeFinCta` for a quieter fin.
  Keyboard focus gets the same affordance as hover; disabled actions do not
  swim. Keep a native button and an accessible name.
- Reduced motion freezes all travel and ambient loops; opacity alone may
  reveal a fin. Feedback must remain understandable without animation.
- Test narrow widths, both languages and themes, keyboard focus, disabled
  controls, slow responses, failure/retry and reduced motion.
