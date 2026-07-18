# Design Rules — StudyShark "Deep End v2"

These rules govern every visual change in this codebase. They come from the
`Deep End v2` design handoff (the `.dc.html` references + README). Read them
before touching any component, style file, or brand mark. The design tokens
themselves live in `client/src/styles/astryx-theme.css` (the `--ss-*` custom
properties) — this file is the *behavioural* contract that sits on top of them.

## 1. The fin baseline rule (non-negotiable)

In ANY hover effect that reveals a shark fin — ghost-fin backgrounds,
swim-through fins, fade-in fins — the fin's **visual base must TOUCH the bottom
edge of its container**, never float above it.

The fin glyph (`M3 18 Q 6 6 15 3 Q 17 11 21 18 Z`, in a 24-unit box, from
`SharkFin.tsx`) has its base at `y=18`, so **25% of the box is empty below the
base**. To make the base ride the bottom edge, sink the fin downward by
`size × 0.25`:

- a `58px` fin needs `bottom: -15px` (58 × 0.25 ≈ 14.5)
- a `40px` fin needs `bottom: -10px`
- a `20px` fin needs `bottom: -5px`

Fins may be cropped by `overflow: hidden` past the sides or the bottom, but the
base always rides the bottom edge like a waterline. A fin floating in the middle
of a button or card is a bug.

## 2. Per-platform accent swapping

The whole kit re-skins per subject from a **single** accent variable. Never
hard-code a subject's hex. Fins, waterlines, kickers, selected states, progress
and primary CTAs all read `var(--brand-accent)` (and `var(--brand-accent-soft)`
for tints). `ColorModeContext` writes these from `lib/subjects.ts` when the
active subject changes, so a correctly-built surface re-skins for free:

| Platform      | Accent    | Bright (dark) |
|---------------|-----------|---------------|
| devShark      | `#2d7a2d` | `#4caf50`     |
| geoShark      | `#c2410c` | `#fb923c`     |
| mathShark     | `#1565c0` | `#42a5f5`     |
| historyShark  | `#4b5563` | `#9ca3af`     |
| chessShark    | `#7b4b2a` | `#c8935f`     |
| bioShark      | `#0f766e` | `#2dd4bf`     |
| pokerShark    | `#b91c1c` | `#ef4444`     |

When adding a subject-specific surface, change ONLY the accent, the wordmark and
the topic set — the layout stays identical across platforms.

## 3. Fade-in-only fin reveals — never animate `background-position`

Fin reveals fade in via an `opacity` transition (≈0.35s) on a child element.
**Never** animate `background-position` to "drift" a fin in — it reads as jitter.
The swim-through CTAs are the one place a fin *translates*: an absolutely
positioned child fin fades in (opacity) and swims the full button width
(`translateX(±260–280px)`, 2.6s / 3.8s ease-in-out), mirrored `scaleX(-1)` when
swimming left→right. `overflow: hidden` on the button crops it.

## 4. The wave-variation rule

Every wavy connector gets **its own** amplitude, phase and wavelength — no two
waves in a path are the same tile. A roadmap path, a set of level connectors, a
row of ticks: vary `amp` / `dir` / `wavelength` per segment so the path reads as
living water, not a repeated stamp. (See the `pathLevels` wave generation in
`Home.tsx` for the reference implementation.)

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
- Kicker + waterline tick: the `.ss-kicker` utility class.
- Card stock (hairline border, 2px bottom edge, one ink shadow): `.ss-panel`
  / `.ss-raised` / `.ss-lift`.
- Topic logos: `CategoryGlyph` in `components/ui/techIcons.tsx` (bundles only
  the devicons it imports — never pull the whole icon set or a CDN URL).
- Paper grain + wave tile: the `--ss-grain` / `--ss-wave` data-URIs.
- New copy becomes new keys in `i18n/translations.ts` (+ `.cs.ts`); never
  hard-code user-visible English in a component.
