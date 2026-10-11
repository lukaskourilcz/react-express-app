# Apple design — local experiment

Requested 11 October 2026. Branch: `codex/apple-design-preview`.
Source: [Emil Kowalski's apple-design skill](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md).

## Preview

Run `npm run dev --prefix client -- --host 127.0.0.1 --port 3000`.
Open `http://127.0.0.1:3000/?design=apple` and use the development-only
Original / Apple control to compare the same page without losing its state.
The selected appearance follows client-side navigation and is encoded in the URL.
The server stays local; nothing was pushed or deployed.

## Components affected

| Existing component / layer | Apple variant |
| --- | --- |
| App header and navigation | Floating rounded toolbar; stronger blur; content scrolls underneath; pill-shaped active links |
| App mobile navigation | Frosted sidebar; reversible, critically damped spring; existing focus trap and Escape behavior |
| Home hero and StatItem | System font, optical sizing, tighter display tracking, balanced headline and more breathing room |
| TopicCard | Rounded, quieter surfaces; selected accent ring; existing fins and waves; card stays still |
| SampleCard and RadioCards | Soft inset answer surfaces, immediate press feedback and retained success/error states |
| FadeFinCta, SwimCta and Astryx buttons | Pill-shaped actions and immediate press feedback, with native click behavior |
| Shared panels and cards | Clean surfaces, thin borders and softer elevation replacing the paper edge |
| Astryx dialogs (including SignInDialog and confirmations) | Frosted rounded surface, stronger shadow and dimmed background; existing dialog semantics |
| Existing forms | Softer shared field radii; labels, validation and auth behavior remain in their existing components |
| MotionItem and MotionPop | Critically damped spring defaults; short fades under reduced motion |

The shared tokens also affect existing Coding, Learn, Quiz, Coins and Premium
screens where they consume those tokens. This is a visual prototype, not a
rewrite of every screen's local CSS. No new gesture-driven controls were added.
The original comparison is intended to compare visual treatment; the shared
motion helpers and drawer receive the branch's motion improvements in both variants.

Owner refinement: the Apple variant's dark mode retains the original Deep End
blue-green ink background, grain and gradient (`#0c161e` to `#0a1219`), with
matching dark surface tokens. The light palette and Apple component shapes remain
as previewed. The floating header's scroll-edge fade uses a separate solid color
token so it still works over the layered page background.

## Validation

- API TypeScript check: passed.
- Client TypeScript check: passed.
- Launch, play-room and verified-caller contracts: passed.
- Client tests: 103 files / 983 tests passed.
- Production build: passed (existing mixed-import and large-chunk warnings).
- Production dependency audits, root and client: 0 vulnerabilities.
- Browser: light and dark appearance, 360 / 768 / 1440 px, no page overflow;
  sample-question answer and accessible success message; mobile menu and Escape;
  sign-in dialog display and console (no errors observed).
- Reduced motion, transparency and high contrast: explicit CSS fallbacks;
  no OS preference changes were made to exercise them.
- `git diff --check`: passed.

Plain Vite serves this visual preview without API handlers. Authenticated account
flows, live grading, wallet mutations, billing and remote data were not exercised.
The repository's fixture-driven `check:responsive` sweep was not run; viewport
checks used the visible browser. Keyboard focus and native dialog behavior were
retained; a complete accessibility audit, zoom and forced-colors checks remain
outside this prototype's verification.
